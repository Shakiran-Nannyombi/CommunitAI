"""Action item extraction step: call Gradient Inference, parse, and persist to DB."""
import json
import logging
from pathlib import Path

from sqlalchemy import text

from agent.db import AsyncSessionLocal, update_meeting_status
from agent.inference import call_inference
from agent.utils import with_retry

logger = logging.getLogger(__name__)

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "extract.txt"


def _load_system_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


def _parse_action_items(raw: str) -> list[dict]:
    """Parse JSON array from inference response; return valid items only."""
    try:
        items = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Failed to parse action items JSON: %r", raw[:200])
        return []

    if not isinstance(items, list):
        logger.warning("Expected JSON array, got %s", type(items).__name__)
        return []

    valid = []
    for item in items:
        if not isinstance(item, dict):
            continue
        description = (item.get("description") or "").strip()
        assignee = (item.get("assignee") or "").strip()
        if not description or not assignee:
            logger.debug("Skipping item missing description or assignee: %s", item)
            continue
        valid.append({
            "description": description,
            "assignee": assignee,
            "due_date": item.get("due_date"),  # may be None / null
        })

    return valid


async def _persist_action_items(meeting_id: str, items: list[dict]) -> list[dict]:
    """Insert action items into the action_items table; return persisted dicts."""
    persisted = []
    async with AsyncSessionLocal() as session:
        for item in items:
            result = await session.execute(
                text(
                    """
                    INSERT INTO action_items (meeting_id, description, assignee, due_date)
                    VALUES (:meeting_id, :description, :assignee, :due_date)
                    RETURNING id, meeting_id, description, assignee, due_date, completed, created_at
                    """
                ),
                {
                    "meeting_id": meeting_id,
                    "description": item["description"],
                    "assignee": item["assignee"],
                    "due_date": item.get("due_date"),
                },
            )
            row = result.mappings().one()
            persisted.append(dict(row))
        await session.commit()
    return persisted


async def extract_action_items(meeting_id: str, transcript: str) -> list:
    """Extract action items from transcript and persist them to the database.

    - Calls Gradient Inference with the extract.txt system prompt.
    - Parses the JSON response and filters out items missing description or assignee.
    - Persists valid items to the action_items table.
    - An empty list from inference is not an error — it is persisted as-is.
    - On final inference failure, logs the error and returns an empty list.

    Returns the list of persisted action item dicts.
    """
    system_prompt = _load_system_prompt()

    raw_response: str | None = None

    async def call() -> str:
        return await call_inference(system_prompt, transcript)

    try:
        raw_response = await with_retry(call, max_retries=3)
    except Exception as exc:
        logger.error(
            "Action item extraction failed after retries for meeting %s: %s",
            meeting_id,
            exc,
        )
        return []

    items = _parse_action_items(raw_response)

    if not items:
        logger.info(
            "No valid action items extracted for meeting %s (empty or all filtered).",
            meeting_id,
        )
        return []

    try:
        persisted = await _persist_action_items(meeting_id, items)
    except Exception as exc:
        logger.error(
            "Failed to persist action items for meeting %s: %s", meeting_id, exc
        )
        return []

    logger.info(
        "Persisted %d action item(s) for meeting %s.", len(persisted), meeting_id
    )
    return persisted
