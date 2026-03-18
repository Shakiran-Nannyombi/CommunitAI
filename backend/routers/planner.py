"""
Planner Agent routes.

POST   /workspaces/{id}/planner/chat  — send a message to the planner agent
DELETE /workspaces/{id}/planner/chat  — clear conversation history
"""

from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.config import settings
from backend.db import get_db
from backend.models.db import ActionItem, Meeting, PlannerMessage, Workspace
from backend.schemas.api import PlannerChatRequest, PlannerChatResponse, PlannerMessageOut

router = APIRouter(tags=["planner"])

_GRADIENT_URL = "https://inference.do-ai.run/v1/chat/completions"
_MODEL = "llama3.3-70b-instruct"


def _build_system_prompt(
    workspace_name: str,
    summaries: list[tuple[str, str, str]],  # (date, title, content)
    action_items: list[tuple[str, str, str]],  # (description, assignee, due_date)
) -> str:
    lines = [
        f'You are a community planning assistant for the workspace "{workspace_name}".',
        "",
        "Recent meeting summaries (last 5):",
    ]

    if summaries:
        for i, (date_str, title, content) in enumerate(summaries, 1):
            lines.append(f"{i}. [{date_str}] {title}: {content}")
    else:
        lines.append("(no meeting summaries yet)")

    lines.append("")
    lines.append("Open action items:")

    if action_items:
        for description, assignee, due_date in action_items:
            due = f", due {due_date}" if due_date else ""
            assignee_str = assignee if assignee else "unassigned"
            lines.append(f"- {description} (assigned to {assignee_str}{due})")
    else:
        lines.append("(no open action items)")

    lines.append("")
    lines.append(
        "Help the community leader brainstorm, plan, and make decisions based on this context."
    )

    return "\n".join(lines)


@router.post("/workspaces/{workspace_id}/planner/chat", response_model=PlannerChatResponse)
async def planner_chat(
    workspace_id: UUID,
    payload: PlannerChatRequest,
    db: AsyncSession = Depends(get_db),
) -> PlannerChatResponse:
    # 1. Load workspace (404 if not found)
    ws_result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = ws_result.scalar_one_or_none()
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # 2. Load last 20 conversation messages for this workspace/user
    history_result = await db.execute(
        select(PlannerMessage)
        .where(
            PlannerMessage.workspace_id == workspace_id,
            PlannerMessage.user_id == payload.user_id,
        )
        .order_by(PlannerMessage.created_at.asc())
        .limit(20)
    )
    history = list(history_result.scalars().all())

    # 3. Load last 5 meeting summaries (meetings with summaries, ordered by created_at desc)
    meetings_result = await db.execute(
        select(Meeting)
        .where(Meeting.workspace_id == workspace_id)
        .options(selectinload(Meeting.summary))
        .order_by(Meeting.created_at.desc())
        .limit(10)  # fetch extra to filter those with summaries
    )
    meetings_with_summaries = [
        m for m in meetings_result.scalars().all() if m.summary is not None
    ][:5]

    summaries = [
        (
            m.created_at.strftime("%Y-%m-%d"),
            m.title,
            m.summary.content,
        )
        for m in meetings_with_summaries
    ]

    # 4. Load open action items (status != 'done' means completed == False) for the workspace
    action_items_result = await db.execute(
        select(ActionItem)
        .join(Meeting, ActionItem.meeting_id == Meeting.id)
        .where(
            Meeting.workspace_id == workspace_id,
            ActionItem.completed == False,  # noqa: E712
        )
    )
    open_action_items = list(action_items_result.scalars().all())

    action_items_data = [
        (
            ai.description,
            ai.assignee or "",
            str(ai.due_date) if ai.due_date else "",
        )
        for ai in open_action_items
    ]

    # 5. Build system prompt
    system_prompt = _build_system_prompt(workspace.name, summaries, action_items_data)

    # 6. Build messages array: system prompt + conversation history + new user message
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": payload.message})

    # 7. Call Gradient AI with 30-second timeout
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                _GRADIENT_URL,
                headers={
                    "Authorization": f"Bearer {settings.GRADIENT_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": _MODEL,
                    "messages": messages,
                },
            )
            response.raise_for_status()
            data = response.json()
            assistant_reply = data["choices"][0]["message"]["content"]
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Gradient AI request timed out")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Gradient AI request failed")

    # 8. Persist user message and assistant message to planner_messages
    user_msg = PlannerMessage(
        workspace_id=workspace_id,
        user_id=payload.user_id,
        role="user",
        content=payload.message,
    )
    assistant_msg = PlannerMessage(
        workspace_id=workspace_id,
        user_id=payload.user_id,
        role="assistant",
        content=assistant_reply,
    )
    db.add(user_msg)
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)

    # 9. Return PlannerChatResponse with reply and updated history
    updated_history = history + [user_msg, assistant_msg]
    return PlannerChatResponse(
        reply=assistant_reply,
        history=[
            PlannerMessageOut(
                role=m.role,
                content=m.content,
                created_at=m.created_at,
            )
            for m in updated_history
        ],
    )


@router.delete("/workspaces/{workspace_id}/planner/chat", status_code=204)
async def clear_planner_chat(
    workspace_id: UUID,
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> Response:
    await db.execute(
        delete(PlannerMessage).where(
            PlannerMessage.workspace_id == workspace_id,
            PlannerMessage.user_id == user_id,
        )
    )
    await db.commit()
    return Response(status_code=204)
