"""
Workspaces routes.

GET  /workspaces          — list workspaces for a user
POST /workspaces          — create a workspace
GET  /tasks               — global action items across all meetings for a user
POST /action-items/{id}/nudge — generate a Slack/Discord nudge message via Gradient AI
GET  /workspaces/{id}/impact  — impact tracker analytics for a workspace
"""

import httpx
from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.config import settings
from backend.db import get_db
from backend.models.db import ActionItem, Meeting, Workspace
from backend.schemas.api import (
    AssigneeActivity,
    GlobalActionItemOut,
    ImpactOut,
    NudgeOut,
    SentimentTrendItem,
    WeeklyMeetingCount,
    WorkspaceCreate,
    WorkspaceOut,
    WorkspaceUpdate,
)

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


@router.patch("/workspaces/{workspace_id}", response_model=WorkspaceOut)
async def update_workspace(
    workspace_id: UUID,
    payload: WorkspaceUpdate,
    db: AsyncSession = Depends(get_db),
) -> WorkspaceOut:
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = result.scalar_one_or_none()
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if payload.slack_webhook_url is not None or "slack_webhook_url" in payload.model_fields_set:
        ws.slack_webhook_url = payload.slack_webhook_url

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


@router.get("/workspaces/{workspace_id}/impact", response_model=ImpactOut)
async def get_workspace_impact(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> ImpactOut:
    """Return impact analytics for a workspace: meetings/week, completion rate, sentiment trend, top assignees."""

    # Check workspace exists and count total meetings for has_enough_data flag
    meeting_count_result = await db.execute(
        select(Meeting).where(Meeting.workspace_id == workspace_id)
    )
    all_meetings = meeting_count_result.scalars().all()
    has_enough_data = len(all_meetings) >= 2

    # 1. Meetings per week (last 12 weeks) — fill missing weeks with 0
    meetings_per_week_result = await db.execute(
        text(
            """
            SELECT date_trunc('week', created_at)::date AS week_start, count(*) AS cnt
            FROM meetings
            WHERE workspace_id = :workspace_id
              AND created_at >= now() - interval '12 weeks'
            GROUP BY 1
            ORDER BY 1
            """
        ),
        {"workspace_id": workspace_id},
    )
    raw_weeks = {row.week_start: row.cnt for row in meetings_per_week_result}

    # Build a full 12-week series, filling gaps with 0
    today = date.today()
    # Start of the current week (Monday)
    current_week_start = today - timedelta(days=today.weekday())
    meetings_per_week: list[WeeklyMeetingCount] = []
    for i in range(11, -1, -1):
        week_start = current_week_start - timedelta(weeks=i)
        meetings_per_week.append(
            WeeklyMeetingCount(week_start=week_start, count=raw_weeks.get(week_start, 0))
        )

    # 2. Task completion rate
    completion_result = await db.execute(
        text(
            """
            SELECT
                count(*) FILTER (WHERE action_items.completed) AS completed_count,
                count(*) AS total_count
            FROM action_items
            JOIN meetings ON action_items.meeting_id = meetings.id
            WHERE meetings.workspace_id = :workspace_id
            """
        ),
        {"workspace_id": workspace_id},
    )
    comp_row = completion_result.one()
    if comp_row.total_count == 0:
        task_completion_rate = 0.0
    else:
        task_completion_rate = comp_row.completed_count / comp_row.total_count

    # 3. Sentiment trend (last 5 meetings, returned in chronological order)
    sentiment_result = await db.execute(
        text(
            """
            SELECT m.title, m.created_at, sr.classification
            FROM meetings m
            JOIN sentiment_reports sr ON sr.meeting_id = m.id
            WHERE m.workspace_id = :workspace_id
            ORDER BY m.created_at DESC
            LIMIT 5
            """
        ),
        {"workspace_id": workspace_id},
    )
    # Reverse to get chronological (oldest first) order
    sentiment_rows = list(sentiment_result)
    sentiment_trend = [
        SentimentTrendItem(
            meeting_title=row.title,
            created_at=row.created_at,
            classification=row.classification,
        )
        for row in reversed(sentiment_rows)
    ]

    # 4. Top assignees (top 5 by task count)
    assignees_result = await db.execute(
        text(
            """
            SELECT assignee, count(*) AS task_count
            FROM action_items
            JOIN meetings ON action_items.meeting_id = meetings.id
            WHERE meetings.workspace_id = :workspace_id
            GROUP BY assignee
            ORDER BY task_count DESC
            LIMIT 5
            """
        ),
        {"workspace_id": workspace_id},
    )
    top_assignees = [
        AssigneeActivity(assignee=row.assignee, task_count=row.task_count)
        for row in assignees_result
    ]

    return ImpactOut(
        meetings_per_week=meetings_per_week,
        task_completion_rate=task_completion_rate,
        sentiment_trend=sentiment_trend,
        top_assignees=top_assignees,
        has_enough_data=has_enough_data,
    )
