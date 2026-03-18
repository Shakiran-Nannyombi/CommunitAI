"""Transcription step: download audio from DO Spaces, convert if needed, transcribe via Groq Whisper."""
import logging
import os
import subprocess
import tempfile
from urllib.parse import urlparse

import boto3
import httpx
from botocore.exceptions import BotoCoreError, ClientError

from agent.config import settings
from agent.db import update_meeting_status
from agent.utils import with_retry

logger = logging.getLogger(__name__)

GROQ_WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
AUDIO_EXTENSIONS = ["mp3", "wav", "m4a", "aac", "webm", "ogg", "flac"]
GROQ_SUPPORTED = {"flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "opus", "wav", "webm"}
GROQ_MAX_BYTES = 24 * 1024 * 1024  # 25 MB limit — stay under with 24 MB


def _get_spaces_client():
    return boto3.client(
        "s3",
        region_name=settings.DO_SPACES_REGION,
        endpoint_url=settings.DO_SPACES_ENDPOINT,
        aws_access_key_id=settings.DO_SPACES_KEY,
        aws_secret_access_key=settings.DO_SPACES_SECRET,
    )


def _resolve_audio_key(meeting_id: str, audio_url: str) -> tuple[str, str]:
    parsed = urlparse(audio_url)
    if not parsed.scheme:
        ext = audio_url.rsplit(".", 1)[-1] if "." in audio_url else "mp3"
        return audio_url, ext

    path = parsed.path.lstrip("/")
    bucket = settings.DO_SPACES_BUCKET
    if path.startswith(f"{bucket}/"):
        path = path[len(bucket) + 1:]

    ext = path.rsplit(".", 1)[-1] if "." in path else "mp3"
    return path, ext


def _download_audio(meeting_id: str, audio_url: str) -> tuple[bytes, str]:
    client = _get_spaces_client()
    key, ext = _resolve_audio_key(meeting_id, audio_url)

    try:
        response = client.get_object(Bucket=settings.DO_SPACES_BUCKET, Key=key)
        return response["Body"].read(), ext
    except (BotoCoreError, ClientError):
        pass

    for candidate_ext in AUDIO_EXTENSIONS:
        candidate_key = f"audio/{meeting_id}.{candidate_ext}"
        try:
            response = client.get_object(Bucket=settings.DO_SPACES_BUCKET, Key=candidate_key)
            return response["Body"].read(), candidate_ext
        except (BotoCoreError, ClientError):
            continue

    raise RuntimeError(f"Audio file not found in storage for meeting {meeting_id}")


def _convert_to_mp3(data: bytes, src_ext: str) -> bytes:
    """Convert audio bytes to mp3 using ffmpeg."""
    with tempfile.NamedTemporaryFile(suffix=f".{src_ext}", delete=False) as src_f:
        src_f.write(data)
        src_path = src_f.name

    dst_path = src_path.replace(f".{src_ext}", ".mp3")
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", src_path, "-ar", "16000", "-ac", "1", "-b:a", "64k", dst_path],
            check=True, capture_output=True
        )
        with open(dst_path, "rb") as f:
            return f.read()
    finally:
        os.unlink(src_path)
        if os.path.exists(dst_path):
            os.unlink(dst_path)


def _upload_transcript(meeting_id: str, text: str) -> None:
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
    """Download audio, convert if needed, transcribe via Groq Whisper, store result."""
    try:
        audio_data, ext = _download_audio(meeting_id, audio_url)
    except Exception as exc:
        logger.error("Failed to download audio for meeting %s: %s", meeting_id, exc)
        await update_meeting_status(meeting_id, "transcription_failed")
        return None

    # Convert unsupported formats (e.g. aac) to mp3 before sending to Groq.
    # Also compress if the file exceeds Groq's 25 MB limit (common for long recordings).
    needs_conversion = ext.lower() not in GROQ_SUPPORTED
    needs_compression = len(audio_data) > GROQ_MAX_BYTES

    if needs_conversion or needs_compression:
        reason = "unsupported format" if needs_conversion else "file too large for Groq"
        logger.info(
            "Converting .%s to compressed mp3 (%s) for meeting %s",
            ext, reason, meeting_id,
        )
        try:
            audio_data = _convert_to_mp3(audio_data, ext if needs_conversion else ext)
            ext = "mp3"
        except Exception as exc:
            logger.error("ffmpeg conversion failed for meeting %s: %s", meeting_id, exc)
            await update_meeting_status(meeting_id, "transcription_failed")
            return None

    # Final size check — if still over limit after compression, fail cleanly
    if len(audio_data) > GROQ_MAX_BYTES:
        logger.error(
            "Audio still exceeds 25 MB after compression for meeting %s (%d bytes)",
            meeting_id, len(audio_data),
        )
        await update_meeting_status(meeting_id, "transcription_failed")
        return None

    send_ext = ext
    send_data = audio_data

    async def call_groq_whisper() -> str:
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                GROQ_WHISPER_URL,
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                files={"file": (f"audio.{send_ext}", send_data, f"audio/{send_ext}")},
                data={"model": "whisper-large-v3"},
            )
            response.raise_for_status()
            return response.json()["text"]

    try:
        transcript_text = await with_retry(call_groq_whisper, max_retries=3)
    except Exception as exc:
        logger.error("Groq Whisper failed after retries for meeting %s: %s", meeting_id, exc)
        await update_meeting_status(meeting_id, "transcription_failed")
        return None

    try:
        _upload_transcript(meeting_id, transcript_text)
    except Exception as exc:
        logger.error("Failed to store transcript for meeting %s: %s", meeting_id, exc)
        await update_meeting_status(meeting_id, "transcription_failed")
        return None

    await update_meeting_status(meeting_id, "transcribed")
    logger.info("Transcription complete for meeting %s", meeting_id)
    return transcript_text
