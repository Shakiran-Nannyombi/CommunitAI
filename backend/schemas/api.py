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
    slack_webhook_url: Optional[str] = None
    created_at: datetime


class WorkspaceUpdate(BaseModel):
    slack_webhook_url: Optional[str] = None


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


# --- Inline editing ---

class TranscriptUpdate(BaseModel):
    content: str


class ActionItemCreate(BaseModel):
    description: str
    assignee: str = ""
    due_date: Optional[date] = None


class ActionItemUpdate(BaseModel):
    description: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[date] = None


# --- Planner ---

class PlannerMessageOut(BaseModel):
    role: str
    content: str
    created_at: datetime


class PlannerChatRequest(BaseModel):
    user_id: str
    message: str


class PlannerChatResponse(BaseModel):
    reply: str
    history: list[PlannerMessageOut]


# --- Impact Tracker ---

class WeeklyMeetingCount(BaseModel):
    week_start: date
    count: int


class SentimentTrendItem(BaseModel):
    meeting_title: str
    created_at: datetime
    classification: str   # positive | neutral | negative


class AssigneeActivity(BaseModel):
    assignee: str
    task_count: int


class ImpactOut(BaseModel):
    meetings_per_week: list[WeeklyMeetingCount]
    task_completion_rate: float
    sentiment_trend: list[SentimentTrendItem]
    top_assignees: list[AssigneeActivity]
    has_enough_data: bool
