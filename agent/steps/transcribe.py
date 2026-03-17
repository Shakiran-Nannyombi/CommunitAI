"""
Step 1 — Transcription
Downloads audio from R2, calls Groq Whisper endpoint for transcription,
stores transcript back to R2, persists to DB, and updates meeting status.

Note: Gradient AI does not offer a Whisper/audio endpoint.
Groq provides free Whisper Large v3 with the same OpenAI-compatible API.
"""

import httpx

from agent.config import settings
from agent.db import SessionLocal, update_meeting_status
from agent.spaces import download_bytes, upload_bytes
from agent.utils import with_retry

from sqlalchemy import text


WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
WHISPER_MODEL = "whisper-large-v3"


async def transcribe(meeting_id: str, audio_key: str) -> str:
    """
    Download audio from R2, transcribe via Groq Whisper, store transcript to R2 and DB.
    Returns the transcript text.
    """

    async def _run():
        # 1. Download audio bytes from R2
        audio_bytes = download_bytes(audio_key)

        # Detect extension from key for correct MIME type
        ext = audio_key.rsplit(".", 1)[-1] if "." in audio_key else "mp3"
        mime_map = {"mp3": "audio/mpeg", "wav": "audio/wav", "mp4": "audio/mp4", "m4a": "audio/x-m4a", "webm": "audio/webm"}
        mime = mime_map.get(ext, "audio/mpeg")

        # 2. Call Groq Whisper
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                WHISPER_URL,
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                files={"file": (f"audio.{ext}", audio_bytes, mime)},
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
