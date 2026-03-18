"""Sentiment analysis step: call Gradient Inference, parse, and persist to DB."""
import json
import logging
from pathlib import Path

from sqlalchemy import text

from agent.db import AsyncSessionLocal, update_meeting_status
from agent.inference import call_inference
from agent.utils import with_retry

logger = logging.getLogger(__name__)

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "analyze.txt"

_VALID_CLASSIFICATIONS = {"positive", "neutral", "negative"}


def _load_system_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


def _parse_sentiment(raw: str) -> dict | None:
    """Parse and validate the JSON sentiment response from inference.

    Returns a dict with 'classification' and 'signals' on success, or None if
    the response is malformed or fails validation.
    """
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Failed to parse sentiment JSON: %r", raw[:200])
        return None

    if not isinstance(data, dict):
        logger.warning("Expected JSON object, got %s", type(data).__name__)
        return None

    classification = data.get("classification")
    if classification not in _VALID_CLASSIFICATIONS:
        logger.warning(
            "Invalid classification %r; must be one of %s",
            classification,
            _VALID_CLASSIFICATIONS,
        )
        return None

    signals = data.get("signals")
    if not isinstance(signals, list):
        logger.warning("Expected 'signals' to be a list, got %s", type(signals).__name__)
        return None

    return {"classification": classification, "signals": signals}


async def _persist_sentiment(meeting_id: str, classification: str, signals: list) -> dict:
    """Insert a sentiment report into the sentiment_reports table; return the row."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                """
                INSERT INTO sentiment_reports (meeting_id, classification, signals)
                VALUES (:meeting_id, :classification, :signals)
                RETURNING id, meeting_id, classification, signals, status, created_at
                """
            ),
            {
                "meeting_id": meeting_id,
                "classification": classification,
                "signals": json.dumps(signals),
            },
        )
        row = result.mappings().one()
        await session.commit()
    return dict(row)


async def analyze_sentiment(meeting_id: str, transcript: str) -> dict | None:
    """Analyze sentiment from transcript and persist the report to the database.

    - Loads the system prompt from agent/prompts/analyze.txt.
    - Calls Gradient Inference wrapped in with_retry(max_retries=3).
    - Validates the response has 'classification' in {positive, neutral, negative}
      and 'signals' is a list.
    - Persists the report to the sentiment_reports table.
    - On final inference failure, calls update_meeting_status with 'analysis_failed'
      and returns None.

    Returns the persisted report dict on success.
    """
    system_prompt = _load_system_prompt()

    async def call() -> str:
        return await call_inference(system_prompt, transcript)

    try:
        raw_response = await with_retry(call, max_retries=3)
    except Exception as exc:
        logger.error(
            "Sentiment analysis failed after retries for meeting %s: %s",
            meeting_id,
            exc,
        )
        await update_meeting_status(meeting_id, "analysis_failed")
        return None

    parsed = _parse_sentiment(raw_response)
    if parsed is None:
        logger.error(
            "Invalid sentiment response for meeting %s; marking analysis_failed.",
            meeting_id,
        )
        await update_meeting_status(meeting_id, "analysis_failed")
        return None

    try:
        report = await _persist_sentiment(
            meeting_id, parsed["classification"], parsed["signals"]
        )
    except Exception as exc:
        logger.error(
            "Failed to persist sentiment report for meeting %s: %s", meeting_id, exc
        )
        await update_meeting_status(meeting_id, "analysis_failed")
        return None

    logger.info(
        "Persisted sentiment report for meeting %s (classification=%s, signals=%d).",
        meeting_id,
        parsed["classification"],
        len(parsed["signals"]),
    )
    return report
