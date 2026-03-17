"""
Step 4 — Summarization
Calls Gradient AI LLM with the summarize prompt, stores summary to R2,
persists to summaries table, updates meeting status to complete.
"""

from pathlib import Path

from agent.db import SessionLocal, update_meeting_status
from agent.inference import call_inference
from agent.spaces import upload_bytes
from agent.utils import with_retry

from sqlalchemy import text

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "summarize.txt"


async def summarize(meeting_id: str, transcript: str) -> str:
    """
    Generate meeting summary, store to R2 and DB.
    Returns the summary text.
    """
    system_prompt = PROMPT_PATH.read_text()

    async def _run():
        return await call_inference(system_prompt, transcript)

    try:
        summary_text = await with_retry(_run, max_retries=3)
    except Exception:
        await update_meeting_status(meeting_id, "summarization_failed")
        raise

    # Store to R2
    r2_key = f"summaries/{meeting_id}.txt"
    upload_bytes(r2_key, summary_text.encode("utf-8"))

    # Persist to DB
    async with SessionLocal() as session:
        await session.execute(
            text(
                """
                INSERT INTO summaries (id, meeting_id, content, storage_url)
                VALUES (gen_random_uuid(), :meeting_id, :content, :storage_url)
                """
            ),
            {
                "meeting_id": meeting_id,
                "content": summary_text,
                "storage_url": r2_key,
            },
        )
        await session.commit()

    await update_meeting_status(meeting_id, "complete")
    return summary_text
