"""
Action items routes.

PATCH /action-items/{id}/complete — mark an action item as completed
PATCH /action-items/{id}           — update description, assignee, or due_date
DELETE /action-items/{id}          — remove an action item
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db import get_db
from backend.models.db import ActionItem, Meeting
from backend.schemas.api import ActionItemOut, ActionItemUpdate

router = APIRouter(tags=["action_items"])


@router.patch("/action-items/{action_item_id}/complete", response_model=ActionItemOut)
async def complete_action_item(
    action_item_id: UUID,
    user_id: str,
    db: AsyncSession = Depends(get_db),
) -> ActionItemOut:
    # Fetch action item joined to its parent meeting for ownership check
    result = await db.execute(
        select(ActionItem)
        .join(Meeting, ActionItem.meeting_id == Meeting.id)
        .where(ActionItem.id == action_item_id)
    )
    action_item = result.scalar_one_or_none()

    if action_item is None:
        raise HTTPException(status_code=404, detail="Action item not found")

    # Enforce user_id ownership via the parent meeting
    meeting_result = await db.execute(
        select(Meeting).where(Meeting.id == action_item.meeting_id)
    )
    meeting = meeting_result.scalar_one()

    if meeting.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access forbidden")

    action_item.completed = True
    await db.flush()

    return ActionItemOut.model_validate(action_item)


@router.patch("/action-items/{action_item_id}", response_model=ActionItemOut)
async def update_action_item(
    action_item_id: UUID,
    body: ActionItemUpdate,
    user_id: str,
    db: AsyncSession = Depends(get_db),
) -> ActionItemOut:
    result = await db.execute(
        select(ActionItem)
        .join(Meeting, ActionItem.meeting_id == Meeting.id)
        .where(ActionItem.id == action_item_id)
    )
    action_item = result.scalar_one_or_none()

    if action_item is None:
        raise HTTPException(status_code=404, detail="Action item not found")

    meeting_result = await db.execute(
        select(Meeting).where(Meeting.id == action_item.meeting_id)
    )
    meeting = meeting_result.scalar_one()

    if meeting.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access forbidden")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(action_item, field, value)

    await db.flush()

    return ActionItemOut.model_validate(action_item)


@router.delete("/action-items/{action_item_id}", status_code=204)
async def delete_action_item(
    action_item_id: UUID,
    user_id: str,
    db: AsyncSession = Depends(get_db),
) -> Response:
    result = await db.execute(
        select(ActionItem)
        .join(Meeting, ActionItem.meeting_id == Meeting.id)
        .where(ActionItem.id == action_item_id)
    )
    action_item = result.scalar_one_or_none()

    if action_item is None:
        raise HTTPException(status_code=404, detail="Action item not found")

    meeting_result = await db.execute(
        select(Meeting).where(Meeting.id == action_item.meeting_id)
    )
    meeting = meeting_result.scalar_one()

    if meeting.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access forbidden")

    await db.delete(action_item)
    await db.flush()

    return Response(status_code=204)
