import logging

import httpx

from backend.config import settings

logger = logging.getLogger(__name__)


async def trigger_agent(meeting_id: str) -> None:
    """Fire-and-forget invocation of the CommunitAI Agent.

    Posts the meeting_id to the configured agent endpoint. Errors are logged
    but not raised so callers are not blocked by agent availability.
    """
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                settings.AGENT_ENDPOINT_URL,
                json={"meeting_id": meeting_id},
                headers={"Authorization": f"Bearer {settings.AGENT_API_KEY}"},
            )
    except Exception as exc:
        logger.error(
            "Failed to trigger agent for meeting %s: %s",
            meeting_id,
            exc,
        )
