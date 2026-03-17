"""
Step 1 — Transcription
Downloads audio from R2, calls Gradient AI Whisper endpoint, stores transcript back to R2,
persists to DB, and updates meeting status.
"""

import httpx

from agent.config import settings
from agent.db import SessionLocal, update_meeting_status
from agent.spaces import download_bytes, upload_bytes
from agent.utils import with_retry

from sqlalchemy import text


WHISPER_URL = "https://inference.do-ai.run/v1/audio/transcriptions"
WHISPER_MODEL = "whisper-large-v3"


async def transcribe(meeting_id: str, audio_key: str) -> str:
    """
    Download audio from R2, transcribe via Gradient Whisper, store transcript to R2 and DB.
    Returns the transcript text.
    Raises on failure after retries (caller should set status to transcription_failed).
    """

    async def _run():
        # 1. Download audio bytes from R2
        audio_bytes = download_bytes(audio_key)

        # 2. Call Gradient AI Whisper
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                WHISPER_URL,
                headers={"Authorization": f"Bearer {settings.GRADIENT_MODEL_ACCESS_KEY}"},
                files={"file": ("audio.webm", audio_bytes, "audio/webm")},
                data={"model": WHISPER_MODEL},
            )
            response.raise_for_status()
            transcript_text: str = response.json()["text"]

        # 3. Store transcript to R2
        r2_key = f"transcripts/{meeting_id}.txt"
        upload_bytes(r2_key, transcript_text.encode("utf-8"))

        # 4. Persist to DB
        async with SessionLocal() as session:
            await session.execute(
                text(
                    """
                    INSERT INTO transcripts (id, meeting_id, content)
                    VALUES (gen_random_uuid(), :meeting_id, :content)
                    ON CONFLICT DO NOTHING
                    """
                ),
                {"meeting_id": meeting_id, "content": transcript_text},
            )
            await session.commit()

        return transcript_text

    try:
        transcript = await with_retry(_run, max_retries=3)
        await update_meeting_status(meeting_id, "transcribed")
        return transcript
    except Exception:
        await update_meeting_status(meeting_id, "transcription_failed")
        raise
