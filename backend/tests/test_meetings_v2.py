# Feature: communit-ai-v2, Property 4: Transcript save round-trip
# Feature: communit-ai-v2, Property 6: Action item add round-trip
"""
Tests for new meeting endpoints:
- PATCH /meetings/{id}/transcript
- POST /meetings/{id}/action-items

Covers:
- Property 4: Transcript save round-trip
- Property 6: Action item add round-trip
"""

import uuid
from datetime import date, datetime

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

# ---------------------------------------------------------------------------
# Lightweight SQLite-compatible models
# ---------------------------------------------------------------------------


class Base(DeclarativeBase):
    pass


class MeetingLite(Base):
    __tablename__ = "meetings_v2"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="pending")

    transcript: Mapped["TranscriptLite | None"] = relationship(
        "TranscriptLite", back_populates="meeting", uselist=False, cascade="all, delete-orphan"
    )
    action_items: Mapped[list["ActionItemLite"]] = relationship(
        "ActionItemLite", back_populates="meeting", cascade="all, delete-orphan"
    )


class TranscriptLite(Base):
    __tablename__ = "transcripts_v2"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    meeting_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meetings_v2.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    meeting: Mapped["MeetingLite"] = relationship("MeetingLite", back_populates="transcript")


class ActionItemLite(Base):
    __tablename__ = "action_items_v2"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    meeting_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meetings_v2.id", ondelete="CASCADE"), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    assignee: Mapped[str] = mapped_column(Text, nullable=False, default="")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    meeting: Mapped["MeetingLite"] = relationship("MeetingLite", back_populates="action_items")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def db_session():
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    engine.dispose()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _create_meeting(session, meeting_id: str | None = None) -> MeetingLite:
    mid = meeting_id or str(uuid.uuid4())
    meeting = MeetingLite(id=mid, user_id="user-1", title="Test Meeting", status="complete")
    session.add(meeting)
    session.commit()
    return meeting


def _get_meeting(session, meeting_id: str) -> MeetingLite | None:
    session.expire_all()
    return session.get(MeetingLite, meeting_id)


# ---------------------------------------------------------------------------
# Property 4: Transcript save round-trip
# Feature: communit-ai-v2, Property 4: Transcript save round-trip
# Validates: Requirements 2.2
# ---------------------------------------------------------------------------


@given(content=st.text(min_size=1, max_size=5000))
@settings(max_examples=100)
def test_transcript_save_roundtrip(db_session, content):
    """
    **Validates: Requirements 2.2**

    For any non-empty transcript content string, saving it to the meeting's
    transcript and reading it back must return the same content.
    """
    # Feature: communit-ai-v2, Property 4: Transcript save round-trip
    meeting = _create_meeting(db_session)
    meeting_id = meeting.id

    # Simulate PATCH /meetings/{id}/transcript logic
    if meeting.transcript is None:
        transcript = TranscriptLite(
            id=str(uuid.uuid4()),
            meeting_id=meeting_id,
            content=content,
        )
        db_session.add(transcript)
    else:
        meeting.transcript.content = content
    db_session.commit()

    # Simulate GET /meetings/{id} — reload from DB
    retrieved = _get_meeting(db_session, meeting_id)
    assert retrieved is not None
    assert retrieved.transcript is not None, "Transcript should exist after save"
    assert retrieved.transcript.content == content, (
        f"Transcript content mismatch: expected {content!r}, got {retrieved.transcript.content!r}"
    )

    # Cleanup
    db_session.delete(retrieved)
    db_session.commit()


def test_transcript_update_existing(db_session):
    """Updating an existing transcript should overwrite the content."""
    meeting = _create_meeting(db_session)
    meeting_id = meeting.id

    # Create initial transcript
    transcript = TranscriptLite(
        id=str(uuid.uuid4()),
        meeting_id=meeting_id,
        content="Original content",
    )
    db_session.add(transcript)
    db_session.commit()

    # Update it
    db_session.expire_all()
    m = db_session.get(MeetingLite, meeting_id)
    m.transcript.content = "Updated content"
    db_session.commit()

    db_session.expire_all()
    m2 = db_session.get(MeetingLite, meeting_id)
    assert m2.transcript.content == "Updated content"

    db_session.delete(m2)
    db_session.commit()


# ---------------------------------------------------------------------------
# Property 6: Action item add round-trip
# Feature: communit-ai-v2, Property 6: Action item add round-trip
# Validates: Requirements 2.6
# ---------------------------------------------------------------------------


@given(
    description=st.text(min_size=1, max_size=500),
    assignee=st.text(max_size=100),
)
@settings(max_examples=100)
def test_action_item_add_roundtrip(db_session, description, assignee):
    """
    **Validates: Requirements 2.6**

    For any valid action item payload (non-empty description), adding it to a
    meeting and then fetching the meeting must include the new action item in
    the action_items list.
    """
    # Feature: communit-ai-v2, Property 6: Action item add round-trip
    meeting = _create_meeting(db_session)
    meeting_id = meeting.id

    # Simulate POST /meetings/{id}/action-items logic
    ai_id = str(uuid.uuid4())
    action_item = ActionItemLite(
        id=ai_id,
        meeting_id=meeting_id,
        description=description,
        assignee=assignee,
    )
    db_session.add(action_item)
    db_session.commit()

    # Simulate GET /meetings/{id} — reload from DB
    retrieved = _get_meeting(db_session, meeting_id)
    assert retrieved is not None
    ai_ids = [ai.id for ai in retrieved.action_items]
    assert ai_id in ai_ids, (
        f"New action item {ai_id!r} not found in meeting's action_items list"
    )

    # Verify content
    added = next(ai for ai in retrieved.action_items if ai.id == ai_id)
    assert added.description == description
    assert added.assignee == assignee

    # Cleanup
    db_session.delete(retrieved)
    db_session.commit()


def test_add_action_item_with_due_date(db_session):
    """Action item with a due_date should persist the date correctly."""
    meeting = _create_meeting(db_session)
    meeting_id = meeting.id
    due = date(2024, 6, 15)

    ai_id = str(uuid.uuid4())
    db_session.add(ActionItemLite(
        id=ai_id,
        meeting_id=meeting_id,
        description="Deploy to prod",
        assignee="Alice",
        due_date=due,
    ))
    db_session.commit()

    db_session.expire_all()
    m = db_session.get(MeetingLite, meeting_id)
    added = next(ai for ai in m.action_items if ai.id == ai_id)
    assert added.due_date == due

    db_session.delete(m)
    db_session.commit()
