"""
Meetings CRUD routes.

POST /meetings           — create a meeting record
GET  /meetings           — list meetings for a user (ordered by created_at DESC)
GET  /meetings/{id}      — get full meeting detail with transcript, action items, sentiment, summary
POST /meetings/{id}/upload — upload audio file, trigger agent
"""

import asyncio
import os
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.db import get_db
from backend.models.db import Meeting
from backend.schemas.api import MeetingCreate, MeetingDetailOut, ActionItemOut
from backend.services import agent_client, spaces

router = APIRouter(tags=["meetings"])


def _build_detail(meeting: Meeting) -> MeetingDetailOut:
    """Map a Meeting ORM object (with loaded relationships) to MeetingDetailOut."""
    return MeetingDetailOut(
        id=meeting.id,
        title=meeting.title,
        user_id=meeting.user_id,
        workspace_id=meeting.workspace_id,
        status=meeting.status,
        audio_url=meeting.audio_url,
        created_at=meeting.created_at,
        transcript=meeting.transcript.content if meeting.transcript else None,
        action_items=[ActionItemOut.model_validate(a) for a in meeting.action_items],
        sentiment=meeting.sentiment_report,
        summary=meeting.summary.content if meeting.summary else None,
    )


@router.post("/meetings", response_model=MeetingDetailOut, status_code=201)
async def create_meeting(
    payload: MeetingCreate,
    db: AsyncSession = Depends(get_db),
) -> MeetingDetailOut:
    meeting = Meeting(title=payload.title, user_id=payload.user_id, workspace_id=payload.workspace_id)
    db.add(meeting)
    await db.flush()  # populate meeting.id before commit

    # Reload with relationships so _build_detail works
    result = await db.execute(
        select(Meeting)
        .where(Meeting.id == meeting.id)
        .options(
            selectinload(Meeting.transcript),
            selectinload(Meeting.action_items),
            selectinload(Meeting.sentiment_report),
            selectinload(Meeting.summary),
        )
    )
    meeting = result.scalar_one()
    return _build_detail(meeting)


@router.get("/meetings", response_model=list[MeetingDetailOut])
async def list_meetings(
    user_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[MeetingDetailOut]:
    result = await db.execute(
        select(Meeting)
        .where(Meeting.user_id == user_id)
        .order_by(Meeting.created_at.desc())
        .options(
            selectinload(Meeting.transcript),
            selectinload(Meeting.action_items),
            selectinload(Meeting.sentiment_report),
            selectinload(Meeting.summary),
        )
    )
    meetings = result.scalars().all()
    return [_build_detail(m) for m in meetings]


@router.get("/meetings/{meeting_id}", response_model=MeetingDetailOut)
async def get_meeting(
    meeting_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> MeetingDetailOut:
    result = await db.execute(
        select(Meeting)
        .where(Meeting.id == meeting_id)
        .options(
            selectinload(Meeting.transcript),
            selectinload(Meeting.action_items),
            selectinload(Meeting.sentiment_report),
            selectinload(Meeting.summary),
        )
    )
    meeting = result.scalar_one_or_none()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return _build_detail(meeting)


_FAILED_STATUSES = {"transcription_failed", "analysis_failed", "summarization_failed"}

_ALLOWED_MIME_TYPES = {"audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"}
_MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB


@router.post("/meetings/{meeting_id}/upload", response_model=MeetingDetailOut)
async def upload_audio(
    meeting_id: UUID,
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
) -> MeetingDetailOut:
    # Fetch meeting or 404
    result = await db.execute(
        select(Meeting)
        .where(Meeting.id == meeting_id)
        .options(
            selectinload(Meeting.transcript),
            selectinload(Meeting.action_items),
            selectinload(Meeting.sentiment_report),
            selectinload(Meeting.summary),
        )
    )
    meeting = result.scalar_one_or_none()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Validate MIME type
    if file.content_type not in _ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Allowed types: audio/mpeg, audio/wav, audio/mp4, audio/x-m4a.",
        )

    # Read file and validate size
    data = await file.read()
    if len(data) > _MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File exceeds the 500 MB limit. Please compress or trim the recording.",
        )

    # Derive extension from original filename, falling back to content type
    ext = ""
    if file.filename:
        _, ext = os.path.splitext(file.filename)
        ext = ext.lstrip(".")
    if not ext:
        ext = {"audio/mpeg": "mp3", "audio/wav": "wav", "audio/mp4": "mp4", "audio/x-m4a": "m4a"}.get(
            file.content_type or "", "bin"
        )

    # Upload to Spaces
    key = f"audio/{meeting_id}.{ext}"
    spaces.upload_file(key, data)
    audio_url = spaces.generate_presigned_url(key)

    # Update meeting record
    meeting.audio_url = audio_url
    meeting.status = "processing"
    await db.flush()

    # Fire-and-forget: trigger agent with the exact R2 key
    asyncio.create_task(agent_client.trigger_agent(str(meeting_id), audio_key=key))

    # Reload relationships for response
    await db.refresh(meeting, ["transcript", "action_items", "sentiment_report", "summary"])
    return _build_detail(meeting)


_AUDIO_EXTENSIONS = ["mp3", "wav", "mp4", "m4a"]


@router.delete("/meetings/{meeting_id}", status_code=204)
async def delete_meeting(
    meeting_id: UUID,
    user_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting.user_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Delete Spaces files — ignore errors for missing files
    for ext in _AUDIO_EXTENSIONS:
        try:
            spaces.delete_file(f"audio/{meeting_id}.{ext}")
        except Exception:
            pass

    for key in [
        f"transcripts/{meeting_id}.txt",
        f"summaries/{meeting_id}.txt",
        f"sentiment/{meeting_id}.json",
    ]:
        try:
            spaces.delete_file(key)
        except Exception:
            pass

    await db.delete(meeting)


@router.post("/meetings/{meeting_id}/retry", response_model=MeetingDetailOut)
async def retry_meeting(
    meeting_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> MeetingDetailOut:
    result = await db.execute(
        select(Meeting)
        .where(Meeting.id == meeting_id)
        .options(
            selectinload(Meeting.transcript),
            selectinload(Meeting.action_items),
            selectinload(Meeting.sentiment_report),
            selectinload(Meeting.summary),
        )
    )
    meeting = result.scalar_one_or_none()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.status not in _FAILED_STATUSES:
        raise HTTPException(status_code=400, detail="Meeting is not in a failed state")

    asyncio.create_task(agent_client.trigger_agent(str(meeting_id)))

    return _build_detail(meeting)
