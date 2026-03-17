"""
CommunitAI Agent Entrypoint
Orchestrates the 4-step pipeline: transcribe → extract → analyze → summarize
Supports RETRY_FROM to resume from a specific step.
"""

import asyncio
import logging

from agent.db import update_meeting_status
from agent.steps.transcribe import transcribe
from agent.steps.extract import extract
from agent.steps.analyze import analyze
from agent.steps.summarize import summarize

logger = logging.getLogger(__name__)

# Step order — used for RETRY_FROM resume logic
STEPS = ["transcribe", "extract", "analyze", "summarize"]

# Map step name → which steps to skip (already done)
RETRY_FROM: dict[str, int] = {step: i for i, step in enumerate(STEPS)}


async def process_meeting(meeting_id: str, audio_key: str, retry_from: str | None = None) -> None:
    """
    Run the full agent pipeline for a meeting.

    Args:
        meeting_id: UUID string of the meeting row.
        audio_key:  R2 object key for the uploaded audio file, e.g. "audio/abc123.webm"
        retry_from: Optional step name to resume from ("transcribe"|"extract"|"analyze"|"summarize").
                    Steps before this are assumed already complete.
    """
    start_index = RETRY_FROM.get(retry_from, 0) if retry_from else 0

    await update_meeting_status(meeting_id, "processing")
    logger.info("Starting pipeline for meeting %s from step index %d", meeting_id, start_index)

    transcript: str | None = None

    try:
        # Step 1 — Transcribe
        if start_index <= 0:
            logger.info("[%s] Step 1: transcribe", meeting_id)
            transcript = await transcribe(meeting_id, audio_key)
        else:
            # Load existing transcript from DB for downstream steps
            from agent.db import SessionLocal
            from sqlalchemy import text
            async with SessionLocal() as session:
                row = await session.execute(
                    text("SELECT content FROM transcripts WHERE meeting_id = :id"),
                    {"id": meeting_id},
                )
                result = row.fetchone()
                transcript = result[0] if result else ""

        # Step 2 — Extract action items
        if start_index <= 1:
            logger.info("[%s] Step 2: extract", meeting_id)
            await extract(meeting_id, transcript)

        # Step 3 — Analyze sentiment
        if start_index <= 2:
            logger.info("[%s] Step 3: analyze", meeting_id)
            await analyze(meeting_id, transcript)

        # Step 4 — Summarize
        if start_index <= 3:
            logger.info("[%s] Step 4: summarize", meeting_id)
            await summarize(meeting_id, transcript)

        logger.info("[%s] Pipeline complete", meeting_id)

    except Exception as exc:
        logger.error("[%s] Pipeline failed: %s", meeting_id, exc, exc_info=True)
        raise


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python -m agent.agent <meeting_id> <audio_key> [retry_from_step]")
        sys.exit(1)

    _meeting_id = sys.argv[1]
    _audio_key = sys.argv[2]
    _retry_from = sys.argv[3] if len(sys.argv) > 3 else None

    asyncio.run(process_meeting(_meeting_id, _audio_key, _retry_from))
