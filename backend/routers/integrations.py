"""
Integrations routes.

POST /meetings/{id}/share/slack — post meeting summary + action items to a Slack channel
"""

from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.db import get_db
from backend.models.db import Meeting

router = APIRouter(tags=["integrations"])


def _build_slack_payload(meeting: Meeting) -> dict:
    """Build a Slack Block Kit payload from a meeting's summary and action items."""
    summary = meeting.summary.content if meeting.summary else "(no summary)"

    if meeting.action_items:
        lines = []
        for item in meeting.action_items:
            due = f" (due {item.due_date})" if item.due_date else ""
            assignee = f"@{item.assignee}" if item.assignee else "unassigned"
            lines.append(f"• {item.description} — {assignee}{due}")
        formatted_items = "\n".join(lines)
    else:
        formatted_items = "_No action items_"

    return {
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"📋 {meeting.title}"},
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"*Summary*\n{summary}"},
            },
            {"type": "divider"},
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"*Action Items*\n{formatted_items}"},
            },
        ]
    }


@router.post("/meetings/{meeting_id}/share/slack")
async def share_to_slack(
    meeting_id: UUID,
    user_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Meeting)
        .where(Meeting.id == meeting_id)
        .options(
            selectinload(Meeting.workspace),
            selectinload(Meeting.summary),
            selectinload(Meeting.action_items),
        )
    )
    meeting = result.scalar_one_or_none()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    workspace = meeting.workspace
    if workspace is None or not workspace.slack_webhook_url:
        raise HTTPException(status_code=400, detail="No Slack webhook URL configured for this workspace")

    payload = _build_slack_payload(meeting)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(workspace.slack_webhook_url, json=payload)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Slack webhook request timed out")

    if resp.status_code < 200 or resp.status_code >= 300:
        raise HTTPException(status_code=502, detail=str(resp.status_code))

    return {"ok": True}
