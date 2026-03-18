"""Transcription step: download audio from Spaces, call Whisper API, store transcript."""
import logging
from urllib.parse import urlparse

import boto3
import httpx
from botocore.exceptions import BotoCoreError, ClientError

from agent.config import settings
from agent.db import update_meeting_status
from agent.utils import with_retry

logger = logging.getLogger(__name__)

WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions"
AUDIO_EXTENSIONS = ["mp3", "wav", "m4a", "webm", "ogg", "flac"]


def _get_spaces_client():
    return boto3.client(
        "s3",
        region_name=settings.DO_SPACES_REGION,
        endpoint_url=f"https://{settings.DO_SPACES_REGION}.digitaloceanspaces.com",
        aws_access_key_id=settings.DO_SPACES_KEY,
        aws_secret_access_key=settings.DO_SPACES_SECRET,
    )


def _resolve_audio_key(meeting_id: str, audio_url: str) -> tuple[str, str]:
    """Return (key, extension) for the audio file in Spaces.

    Tries to derive the key from audio_url first; falls back to probing
    common extensions under audio/{meeting_id}.{ext}.
    """
    # If audio_url looks like a Spaces key (no scheme), use it directly.
    parsed = urlparse(audio_url)
    if not parsed.scheme:
        ext = audio_url.rsplit(".", 1)[-1] if "." in audio_url else "mp3"
        return audio_url, ext

    # Extract the path component and strip leading slash to get the key.
    path = parsed.path.lstrip("/")
    # Spaces URLs include the bucket name as the first path segment.
    # e.g. https://bucket.region.digitaloceanspaces.com/audio/id.mp3
    # or   https://region.digitaloceanspaces.com/bucket/audio/id.mp3
    # Strip bucket prefix if present.
    bucket = settings.DO_SPACES_BUCKET
    if path.startswith(f"{bucket}/"):
        path = path[len(bucket) + 1:]

    ext = path.rsplit(".", 1)[-1] if "." in path else "mp3"
    return path, ext


def _download_audio(meeting_id: str, audio_url: str) -> tuple[bytes, str]:
    """Download audio bytes from Spaces. Returns (data, extension)."""
    client = _get_spaces_client()

    # First try to resolve key from the URL.
    key, ext = _resolve_audio_key(meeting_id, audio_url)

    try:
        response = client.get_object(Bucket=settings.DO_SPACES_BUCKET, Key=key)
        return response["Body"].read(), ext
    except (BotoCoreError, ClientError):
        pass

    # Fallback: probe common extensions under audio/{meeting_id}.{ext}
    for candidate_ext in AUDIO_EXTENSIONS:
        candidate_key = f"audio/{meeting_id}.{candidate_ext}"
        try:
            response = client.get_object(Bucket=settings.DO_SPACES_BUCKET, Key=candidate_key)
            return response["Body"].read(), candidate_ext
        except (BotoCoreError, ClientError):
            continue

    raise RuntimeError(f"Audio file not found in Spaces for meeting {meeting_id}")


def _upload_transcript(meeting_id: str, text: str) -> None:
    """Store transcript text to Spaces at transcripts/{meeting_id}.txt."""
    client = _get_spaces_client()
    key = f"transcripts/{meeting_id}.txt"
    client.put_object(
        Bucket=settings.DO_SPACES_BUCKET,
        Key=key,
        Body=text.encode("utf-8"),
        ContentType="text/plain",
    )
    logger.info("Transcript stored at %s", key)


async def transcribe(meeting_id: str, audio_url: str) -> str | None:
    """Download audio, transcribe via Whisper, store transcript, update DB status.

    Returns the transcript text on success, or None on final failure.
    """
    # Download audio from Spaces (synchronous boto3 call — acceptable in agent context).
    try:
        audio_data, ext = _download_audio(meeting_id, audio_url)
    except Exception as exc:
        logger.error("Failed to download audio for meeting %s: %s", meeting_id, exc)
        await update_meeting_status(meeting_id, "transcription_failed")
        return None

    transcript_text: str | None = None

    async def call_whisper() -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                WHISPER_URL,
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                files={"file": (f"audio.{ext}", audio_data, f"audio/{ext}")},
                data={"model": "whisper-1"},
            )
            response.raise_for_status()
            return response.json()["text"]

    try:
        transcript_text = await with_retry(call_whisper, max_retries=3)
    except Exception as exc:
        logger.error(
            "Whisper transcription failed after retries for meeting %s: %s",
            meeting_id,
            exc,
        )
        await update_meeting_status(meeting_id, "transcription_failed")
        return None

    # Store transcript to Spaces.
    try:
        _upload_transcript(meeting_id, transcript_text)
    except Exception as exc:
        logger.error("Failed to store transcript for meeting %s: %s", meeting_id, exc)
        await update_meeting_status(meeting_id, "transcription_failed")
        return None

    # Update DB status.
    await update_meeting_status(meeting_id, "transcribed")
    logger.info("Transcription complete for meeting %s", meeting_id)
    return transcript_text
