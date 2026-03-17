"""CommunitAI Agent entrypoint — orchestrates the full AI processing pipeline."""
import logging

from sqlalchemy import text

from agent.db import AsyncSessionLocal, update_meeting_status
from agent.steps.transcribe import transcribe
from agent.steps.extract import extract_action_items
from agent.steps.analyze import analyze_sentiment
from agent.steps.summarize import generate_summary

logger = logging.getLogger(__name__)

# Try to import the ADK entrypoint decorator; fall back to a no-op identity
# decorator if gradient_ai.adk is not installed (e.g. in local dev / tests).
try:
    from gradient_ai.adk import entrypoint
except ImportError:  # pragma: no cover
    def entrypoint(fn):  # type: ignore[misc]
        """Identity decorator used when gradient_ai.adk is not available."""
        return fn


# Maps a failed meeting status to the pipeline step that should be retried.
RETRY_FROM = {
    "transcription_failed": "transcribe",
    "analysis_failed": "analyze",
    "summarization_failed": "summarize",
}


async def get_audio_url(meeting_id: str) -> str:
    """Query the meetings table and return the audio_url for the given meeting."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("SELECT audio_url FROM meetings WHERE id = :id"),
            {"id": meeting_id},
        )
        row = result.mappings().first()
        if row is None:
            raise ValueError(f"Meeting {meeting_id} not found")
        return row["audio_url"] or ""


async def _get_meeting_status(meeting_id: str) -> str:
    """Return the current status of a meeting from the database."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("SELECT status FROM meetings WHERE id = :id"),
            {"id": meeting_id},
        )
        row = result.mappings().first()
        if row is None:
            raise ValueError(f"Meeting {meeting_id} not found")
        return row["status"]


@entrypoint
async def process_meeting(meeting_id: str) -> dict:
    """Orchestrate the full AI processing pipeline for a meeting.

    Steps run sequentially: transcribe → extract_action_items →
    analyze_sentiment → generate_summary.

    On retry invocations the current meeting status is inspected and the
    pipeline resumes from the failed step rather than restarting from scratch.

    Returns {"status": "complete"} on success or {"status": "<failed_status>"}
    when a step fails after all retries are exhausted.
    """
    # Determine which step to start from (supports retry resumption).
    current_status = await _get_meeting_status(meeting_id)
    resume_from = RETRY_FROM.get(current_status)  # None means start from the top

    logger.info(
        "process_meeting called for %s (current_status=%s, resume_from=%s)",
        meeting_id,
        current_status,
        resume_from,
    )

    transcript: str | None = None

    # ── Transcription ────────────────────────────────────────────────────────
    if resume_from is None or resume_from == "transcribe":
        audio_url = await get_audio_url(meeting_id)
        transcript = await transcribe(meeting_id, audio_url)
        if transcript is None:
            logger.error("Transcription failed for meeting %s; halting pipeline.", meeting_id)
            return {"status": "transcription_failed"}
        resume_from = None  # clear so subsequent steps always run

    # ── Action item extraction ────────────────────────────────────────────────
    # If we resumed past transcription we need to fetch the existing transcript.
    if transcript is None:
        # Fetch transcript from Spaces (stored at transcripts/{meeting_id}.txt).
        try:
            import boto3
            from agent.config import settings as _settings

            s3 = boto3.client(
                "s3",
                region_name=_settings.DO_SPACES_REGION,
                endpoint_url=f"https://{_settings.DO_SPACES_REGION}.digitaloceanspaces.com",
                aws_access_key_id=_settings.DO_SPACES_KEY,
                aws_secret_access_key=_settings.DO_SPACES_SECRET,
            )
            obj = s3.get_object(
                Bucket=_settings.DO_SPACES_BUCKET,
                Key=f"transcripts/{meeting_id}.txt",
            )
            transcript = obj["Body"].read().decode("utf-8")
        except Exception as exc:
            logger.error(
                "Could not retrieve existing transcript for meeting %s: %s",
                meeting_id,
                exc,
            )
            return {"status": "transcription_failed"}

    # resume_from == "analyze" means extraction was done; re-run from analyze onward.
    # resume_from == "summarize" means extraction + analysis were done; only re-run summarize.
    if resume_from is None or resume_from == "analyze":
        await extract_action_items(meeting_id, transcript)

    # ── Sentiment analysis ────────────────────────────────────────────────────
    if resume_from is None or resume_from == "analyze":
        result = await analyze_sentiment(meeting_id, transcript)
        if result is None:
            logger.error(
                "Sentiment analysis failed for meeting %s; halting pipeline.", meeting_id
            )
            return {"status": "analysis_failed"}

    # ── Summarization ─────────────────────────────────────────────────────────
    # Always runs (it's the last step and is the target when resume_from == "summarize").
    summary = await generate_summary(meeting_id, transcript)
    if summary is None:
        logger.error(
            "Summarization failed for meeting %s; halting pipeline.", meeting_id
        )
        return {"status": "summarization_failed"}

    await update_meeting_status(meeting_id, "complete")
    logger.info("Pipeline complete for meeting %s.", meeting_id)
    return {"status": "complete"}
