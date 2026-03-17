"""
Workspaces routes.

GET  /workspaces          — list workspaces for a user
POST /workspaces          — create a workspace
GET  /tasks               — global action items across all meetings for a user
POST /action-items/{id}/nudge — generate a Slack/Discord nudge message via Gradient AI
"""

import httpx
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.config import settings
from backend.db import get_db
from backend.models.db import ActionItem, Meeting, Workspace
from backend.schemas.api import GlobalActionItemOut, NudgeOut, WorkspaceCreate, WorkspaceOut

router = APIRouter(tags=["workspaces"])

_GRADIENT_URL = "https://inference.do-ai.run/v1/chat/completions"
_MODEL = "llama3.3-70b-instruct"


@router.get("/workspaces", response_model=list[WorkspaceOut])
async def list_workspaces(
    user_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[WorkspaceOut]:
    result = await db.execute(
        select(Workspace)
        .where(Workspace.user_id == user_id)
        .order_by(Workspace.created_at.asc())
    )
    return list(result.scalars().all())


@router.post("/workspaces", response_model=WorkspaceOut, status_code=201)
async def create_workspace(
    payload: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
) -> WorkspaceOut:
    ws = Workspace(name=payload.name, icon_emoji=payload.icon_emoji, user_id=payload.user_id)
    db.add(ws)
    await db.flush()
    await db.refresh(ws)
    return WorkspaceOut.model_validate(ws)


@router.get("/tasks", response_model=list[GlobalActionItemOut])
async def global_tasks(
    user_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[GlobalActionItemOut]:
    """Return all action items across all meetings for a user, enriched with workspace context."""
    result = await db.execute(
        select(ActionItem)
        .join(Meeting, ActionItem.meeting_id == Meeting.id)
        .where(Meeting.user_id == user_id)
        .options(selectinload(ActionItem.meeting).selectinload(Meeting.workspace))
        .order_by(ActionItem.due_date.asc().nulls_last(), ActionItem.created_at.desc())
    )
    items = result.scalars().all()

    out = []
    for item in items:
        ws = item.meeting.workspace if item.meeting.workspace else None
        out.append(
            GlobalActionItemOut(
                id=item.id,
                meeting_id=item.meeting_id,
                meeting_title=item.meeting.title,
                workspace_id=ws.id if ws else None,
                workspace_name=ws.name if ws else None,
                workspace_emoji=ws.icon_emoji if ws else None,
                description=item.description,
                assignee=item.assignee,
                due_date=item.due_date,
                completed=item.completed,
                created_at=item.created_at,
            )
        )
    return out


@router.post("/action-items/{action_item_id}/nudge", response_model=NudgeOut)
async def generate_nudge(
    action_item_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> NudgeOut:
    """Use Gradient AI to generate a polite Slack/Discord follow-up message for an action item."""
    result = await db.execute(
        select(ActionItem)
        .where(ActionItem.id == action_item_id)
        .options(selectinload(ActionItem.meeting).selectinload(Meeting.workspace))
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Action item not found")

    workspace_name = item.meeting.workspace.name if item.meeting.workspace else "our community"
    meeting_title = item.meeting.title
    due = f" by {item.due_date}" if item.due_date else ""

    prompt = (
        f"Write a short, friendly Slack or Discord message to {item.assignee} "
        f"reminding them about an action item from the '{meeting_title}' meeting "
        f"for {workspace_name}. "
        f"The task is: {item.description}{due}. "
        f"Keep it under 3 sentences, casual and warm. "
        f"Start with 'Hey @{item.assignee}'. Output only the message, no extra text."
    )

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            _GRADIENT_URL,
            headers={
                "Authorization": f"Bearer {settings.GRADIENT_MODEL_ACCESS_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": _MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 120,
            },
        )
        resp.raise_for_status()

    message = resp.json()["choices"][0]["message"]["content"].strip()
    return NudgeOut(message=message)
