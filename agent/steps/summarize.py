"""Summarization step: call Gradient Inference, store to Spaces, and persist to DB."""
import logging
from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from sqlalchemy import text

from agent.config import settings
from agent.db import AsyncSessionLocal, update_meeting_status
from agent.inference import call_inference
from agent.utils import with_retry

logger = logging.getLogger(__name__)

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "summarize.txt"


def _load_system_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


def _get_spaces_client():
    return boto3.client(
        "s3",
        region_name=settings.DO_SPACES_REGION,
        endpoint_url=f"https://{settings.DO_SPACES_REGION}.digitaloceanspaces.com",
        aws_access_key_id=settings.DO_SPACES_KEY,
        aws_secret_access_key=settings.DO_SPACES_SECRET,
    )


def _upload_summary(meeting_id: str, summary_text: str) -> str:
    """Store summary text to Spaces at summaries/{meeting_id}.txt. Returns the key."""
    client = _get_spaces_client()
    key = f"summaries/{meeting_id}.txt"
    client.put_object(
        Bucket=settings.DO_SPACES_BUCKET,
        Key=key,
        Body=summary_text.encode("utf-8"),
        ContentType="text/plain",
    )
    logger.info("Summary stored at %s", key)
    return key


async def _persist_summary(meeting_id: str, content: str, storage_url: str) -> dict:
    """Insert a summary row into the summaries table; return the row."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                """
                INSERT INTO summaries (meeting_id, content, storage_url)
                VALUES (:meeting_id, :content, :storage_url)
                RETURNING id, meeting_id, content, storage_url, status, created_at
                """
            ),
            {
                "meeting_id": meeting_id,
                "content": content,
                "storage_url": storage_url,
            },
        )
        row = result.mappings().one()
        await session.commit()
    return dict(row)


async def generate_summary(meeting_id: str, transcript: str) -> str | None:
    """Generate a meeting summary and persist it to Spaces and the database.

    - Loads the system prompt from agent/prompts/summarize.txt.
    - Calls Gradient Inference wrapped in with_retry(max_retries=3).
    - Stores the summary text to Spaces at summaries/{meeting_id}.txt.
    - Persists to the summaries table with the storage_url (Spaces key).
    - On final inference failure, calls update_meeting_status with
      'summarization_failed' and returns None.

    Returns the summary text string on success.
    """
    system_prompt = _load_system_prompt()

    async def call() -> str:
        return await call_inference(system_prompt, transcript)

    try:
        summary_text = await with_retry(call, max_retries=3)
    except Exception as exc:
        logger.error(
            "Summarization failed after retries for meeting %s: %s",
            meeting_id,
            exc,
        )
        await update_meeting_status(meeting_id, "summarization_failed")
        return None

    # Store to Spaces.
    try:
        storage_key = _upload_summary(meeting_id, summary_text)
    except (BotoCoreError, ClientError, Exception) as exc:
        logger.error(
            "Failed to store summary to Spaces for meeting %s: %s", meeting_id, exc
        )
        await update_meeting_status(meeting_id, "summarization_failed")
        return None

    # Persist to DB.
    try:
        await _persist_summary(meeting_id, summary_text, storage_key)
    except Exception as exc:
        logger.error(
            "Failed to persist summary for meeting %s: %s", meeting_id, exc
        )
        await update_meeting_status(meeting_id, "summarization_failed")
        return None

    logger.info("Summary generated and persisted for meeting %s.", meeting_id)
    return summary_text
