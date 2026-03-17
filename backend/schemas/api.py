from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MeetingCreate(BaseModel):
    title: str
    user_id: str


class ActionItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    description: str
    assignee: str
    due_date: Optional[date]
    completed: bool


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
    status: str
    audio_url: Optional[str]
    created_at: datetime
    transcript: Optional[str]
    action_items: List[ActionItemOut]
    sentiment: Optional[SentimentReportOut]
    summary: Optional[str]
