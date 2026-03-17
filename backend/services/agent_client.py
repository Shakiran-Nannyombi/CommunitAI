import logging

import httpx

from backend.config import settings

logger = logging.getLogger(__name__)


async def trigger_agent(meeting_id: str, audio_key: str | None = None, retry_from: str | None = None) -> None:
    """
    Fire-and-forget call to the agent server.
    Posts meeting_id (and optional audio_key/retry_from) to AGENT_ENDPOINT_URL/run.
    Errors are logged but not raised so the upload response is never blocked.
    """
    if not settings.AGENT_ENDPOINT_URL:
        logger.warning("AGENT_ENDPOINT_URL not set — skipping agent trigger for meeting %s", meeting_id)
        return

    payload: dict = {"meeting_id": meeting_id}
    if audio_key:
        payload["audio_key"] = audio_key
    if retry_from:
        payload["retry_from"] = retry_from

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{settings.AGENT_ENDPOINT_URL.rstrip('/')}/run",
                json=payload,
                headers={"Authorization": f"Bearer {settings.AGENT_API_KEY}"},
            )
            resp.raise_for_status()
            logger.info("Agent triggered for meeting %s: %s", meeting_id, resp.json())
    except Exception as exc:
        logger.error("Failed to trigger agent for meeting %s: %s", meeting_id, exc)
