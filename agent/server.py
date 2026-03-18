"""
CommunitAI Agent HTTP Server
Exposes a single POST /run endpoint that the backend calls after audio upload.
Run with: python -m agent.server (from project root)
"""

import asyncio
import logging

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

from agent.agent import process_meeting
from agent.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CommunitAI Agent Server")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


class RunRequest(BaseModel):
    meeting_id: str
    audio_key: str | None = None  # e.g. "audio/<meeting_id>.mp3" — inferred if omitted
    retry_from: str | None = None


@app.post("/run")
async def run_agent(
    payload: RunRequest,
    authorization: str = Header(default=""),
) -> dict:
    # Simple bearer token check
    expected = f"Bearer {settings.AGENT_API_KEY}"
    if settings.AGENT_API_KEY and authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Infer audio key from meeting_id if not provided
    audio_key = payload.audio_key or f"audio/{payload.meeting_id}"

    # Run pipeline in background so we return immediately
    asyncio.create_task(
        _run_and_log(payload.meeting_id, audio_key, payload.retry_from)
    )

    return {"status": "accepted", "meeting_id": payload.meeting_id}


async def _run_and_log(meeting_id: str, audio_key: str, retry_from: str | None) -> None:
    try:
        await process_meeting(meeting_id, audio_key, retry_from)
        logger.info("Pipeline complete for meeting %s", meeting_id)
    except Exception as exc:
        logger.error("Pipeline failed for meeting %s: %s", meeting_id, exc, exc_info=True)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("agent.server:app", host="0.0.0.0", port=8001, reload=False)
