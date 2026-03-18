from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# --- Workspace ---

class WorkspaceCreate(BaseModel):
    name: str
    icon_emoji: str = "🏘️"
    user_id: str


class WorkspaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    icon_emoji: str
    created_at: datetime


# --- Meetings ---

class MeetingCreate(BaseModel):
    title: str
    user_id: str
    workspace_id: Optional[UUID] = None


class ActionItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    meeting_id: UUID
    description: str
    assignee: str
    due_date: Optional[date]
    completed: bool
    created_at: datetime


class GlobalActionItemOut(BaseModel):
    """Action item enriched with meeting + workspace context for the global task view."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    meeting_id: UUID
    meeting_title: str
    workspace_id: Optional[UUID]
    workspace_name: Optional[str]
    workspace_emoji: Optional[str]
    description: str
    assignee: str
    due_date: Optional[date]
    completed: bool
    created_at: datetime


class SentimentSignal(BaseModel):
    type: str
    excerpt: Optional[str]


class SentimentReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    classification: str
    signals: List[SentimentSignal]


class MeetingDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    user_id: str
    workspace_id: Optional[UUID]
    status: str
    audio_url: Optional[str]
    created_at: datetime
    transcript: Optional[str]
    action_items: List[ActionItemOut]
    sentiment: Optional[SentimentReportOut]
    summary: Optional[str]


class NudgeOut(BaseModel):
    message: str
