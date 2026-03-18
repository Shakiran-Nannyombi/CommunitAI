"""Transcription step: download audio from Spaces/R2, call Groq Whisper, store transcript."""
import logging
import subprocess
import tempfile
import os
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

# Formats Groq Whisper accepts natively
GROQ_SUPPORTED = {"flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "opus", "wav", "webm"}


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
    """Download audio bytes from R2/Spaces. Returns (data, extension)."""
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
    """Convert audio bytes to mp3 using ffmpeg. Returns mp3 bytes."""
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
    """Download audio, transcribe via Groq Whisper, store transcript, update DB status."""
    try:
        audio_data, ext = _download_audio(meeting_id, audio_url)
    except Exception as exc:
        logger.error("Failed to download audio for meeting %s: %s", meeting_id, exc)
        await update_meeting_status(meeting_id, "transcription_failed")
        return None

    # Convert unsupported formats (e.g. aac) to mp3 for Groq
    if ext.lower() not in GROQ_SUPPORTED:
        logger.info("Converting %s to mp3 for Groq Whisper (meeting %s)", ext, meeting_id)
        try:
            audio_data = _convert_to_mp3(audio_data, ext)
            ext = "mp3"
        except Exception as exc:
            logger.error("ffmpeg conversion failed for meeting %s: %s", meeting_id, exc)
            await update_meeting_status(meeting_id, "transcription_failed")
            return None

    async def call_groq_whisper() -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                GROQ_WHISPER_URL,
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                files={"file": (f"audio.{ext}", audio_data, f"audio/{ext}")},
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



def _resolve_audio_key(meeting_id: str, audio_url: str) -> tuple[str, str]:
    """Return (key, extension) for the audio file in storage.

    Tries to derive the key from audio_url first; falls back to probing
    common extensions under audio/{meeting_id}.{ext}.
    """
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
    """Download audio bytes from R2/Spaces. Returns (data, extension)."""
    client = _get_spaces_client()

    key, ext = _resolve_audio_key(meeting_id, audio_url)

    try:
        response = client.get_object(Bucket=settings.DO_SPACES_BUCKET, Key=key)
        return response["Body"].read(), ext
    except (BotoCoreError, ClientError):
        pass

    # Fallback: probe common extensions
    for candidate_ext in AUDIO_EXTENSIONS:
        candidate_key = f"audio/{meeting_id}.{candidate_ext}"
        try:
            response = client.get_object(Bucket=settings.DO_SPACES_BUCKET, Key=candidate_key)
            return response["Body"].read(), candidate_ext
        except (BotoCoreError, ClientError):
            continue

    raise RuntimeError(f"Audio file not found in storage for meeting {meeting_id}")


def _upload_transcript(meeting_id: str, text: str) -> None:
    """Store transcript text to R2 at transcripts/{meeting_id}.txt."""
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
    """Download audio, transcribe via Groq Whisper, store transcript, update DB status."""
    try:
        audio_data, ext = _download_audio(meeting_id, audio_url)
    except Exception as exc:
        logger.error("Failed to download audio for meeting %s: %s", meeting_id, exc)
        await update_meeting_status(meeting_id, "transcription_failed")
        return None

    # Groq Whisper supports: mp3, mp4, mpeg, mpga, m4a, wav, webm
    # Map aac/ogg/flac → mp3 label (Groq will still process the bytes)
    whisper_ext = ext if ext in {"mp3", "mp4", "m4a", "wav", "webm", "mpeg", "mpga"} else "mp3"

    async def call_groq_whisper() -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                GROQ_WHISPER_URL,
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                files={"file": (f"audio.{whisper_ext}", audio_data, f"audio/{whisper_ext}")},
                data={"model": "whisper-large-v3"},
            )
            response.raise_for_status()
            return response.json()["text"]

    try:
        transcript_text = await with_retry(call_groq_whisper, max_retries=3)
    except Exception as exc:
        logger.error(
            "Groq Whisper transcription failed after retries for meeting %s: %s",
            meeting_id,
            exc,
        )
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
