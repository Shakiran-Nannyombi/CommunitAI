"""
Step 2 — Action Item Extraction
Calls Gradient AI LLM with the extract prompt, parses JSON, persists to action_items table.
"""

import json
from datetime import date
from pathlib import Path

from agent.db import SessionLocal, update_meeting_status
from agent.inference import call_inference
from agent.utils import with_retry

from sqlalchemy import text

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "extract.txt"


async def extract(meeting_id: str, transcript: str) -> list[dict]:
    """
    Extract action items from transcript, persist to DB.
    Returns list of action item dicts.
    """
    system_prompt = PROMPT_PATH.read_text()

    async def _run():
        raw = await call_inference(system_prompt, transcript)
        # Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        items: list[dict] = json.loads(cleaned.strip())
        # Filter out items missing required fields
        return [
            i for i in items
            if i.get("description") and i.get("assignee")
        ]

    try:
        items = await with_retry(_run, max_retries=3)
    except Exception:
        await update_meeting_status(meeting_id, "analysis_failed")
        raise

    async with SessionLocal() as session:
        for item in items:
            due_raw = item.get("due_date")
            due = date.fromisoformat(due_raw) if due_raw else None
            await session.execute(
                text(
                    """
                    INSERT INTO action_items (id, meeting_id, description, assignee, due_date)
                    VALUES (gen_random_uuid(), :meeting_id, :description, :assignee, :due_date)
                    """
                ),
                {
                    "meeting_id": meeting_id,
                    "description": item["description"],
                    "assignee": item["assignee"],
                    "due_date": due,
                },
            )
        await session.commit()

    return items
