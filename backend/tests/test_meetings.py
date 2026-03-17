# Feature: communit-ai, Property 18: Cascade deletion
"""
Property 18: Cascade deletion

For any meeting that is deleted, all associated records (transcript,
action items, sentiment report, summary) should be removed from the
database — no orphaned child rows should remain.

Validates: Requirements 9.4
"""

import uuid

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from sqlalchemy import JSON, Boolean, ForeignKey, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

# ---------------------------------------------------------------------------
# Lightweight SQLite-compatible models
# Mirrors backend/models/db.py but replaces PostgreSQL-specific types
# (UUID, JSONB, DateTime with timezone) with generic SQLAlchemy equivalents
# so the test runs against an in-memory SQLite database without asyncpg.
# ---------------------------------------------------------------------------


class Base(DeclarativeBase):
    pass


class MeetingLite(Base):
    __tablename__ = "meetings_cascade"

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
    sentiment_report: Mapped["SentimentReportLite | None"] = relationship(
        "SentimentReportLite", back_populates="meeting", uselist=False, cascade="all, delete-orphan"
    )
    summary: Mapped["SummaryLite | None"] = relationship(
        "SummaryLite", back_populates="meeting", uselist=False, cascade="all, delete-orphan"
    )


class TranscriptLite(Base):
    __tablename__ = "transcripts_cascade"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    meeting_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meetings_cascade.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    meeting: Mapped["MeetingLite"] = relationship("MeetingLite", back_populates="transcript")


class ActionItemLite(Base):
    __tablename__ = "action_items_cascade"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    meeting_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meetings_cascade.id", ondelete="CASCADE"), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    assignee: Mapped[str] = mapped_column(Text, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    meeting: Mapped["MeetingLite"] = relationship("MeetingLite", back_populates="action_items")


class SentimentReportLite(Base):
    __tablename__ = "sentiment_reports_cascade"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    meeting_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meetings_cascade.id", ondelete="CASCADE"), nullable=False
    )
    classification: Mapped[str] = mapped_column(String(32), nullable=False)
    signals: Mapped[str] = mapped_column(JSON, nullable=False, default=list)

    meeting: Mapped["MeetingLite"] = relationship("MeetingLite", back_populates="sentiment_report")


class SummaryLite(Base):
    __tablename__ = "summaries_cascade"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    meeting_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meetings_cascade.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    meeting: Mapped["MeetingLite"] = relationship("MeetingLite", back_populates="summary")


# ---------------------------------------------------------------------------
# Pytest fixture — fresh in-memory SQLite DB per test session
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
# Hypothesis strategies
# ---------------------------------------------------------------------------

text_strategy = st.text(min_size=1, max_size=128)

action_item_count_strategy = st.integers(min_value=0, max_value=5)

classification_strategy = st.sampled_from(["positive", "neutral", "negative"])


# ---------------------------------------------------------------------------
# Property 18: Cascade deletion
# Validates: Requirements 9.4
# ---------------------------------------------------------------------------


@given(
    title=text_strategy,
    user_id=text_strategy,
    transcript_content=text_strategy,
    num_action_items=action_item_count_strategy,
    classification=classification_strategy,
    summary_content=text_strategy,
)
@settings(max_examples=100)
def test_cascade_deletion(
    db_session,
    title,
    user_id,
    transcript_content,
    num_action_items,
    classification,
    summary_content,
):
    """
    **Validates: Requirements 9.4**

    For any meeting with associated child records (transcript, action items,
    sentiment report, summary), deleting the meeting must remove all child
    rows — no orphaned data should remain in the database.
    """
    meeting_id = str(uuid.uuid4())

    # --- Create meeting with all child records ---
    meeting = MeetingLite(id=meeting_id, user_id=user_id, title=title, status="complete")
    db_session.add(meeting)

    transcript = TranscriptLite(
        id=str(uuid.uuid4()), meeting_id=meeting_id, content=transcript_content
    )
    db_session.add(transcript)

    action_item_ids = []
    for _ in range(num_action_items):
        ai_id = str(uuid.uuid4())
        action_item_ids.append(ai_id)
        db_session.add(
            ActionItemLite(
                id=ai_id,
                meeting_id=meeting_id,
                description="Task",
                assignee="Alice",
                completed=False,
            )
        )

    sentiment_id = str(uuid.uuid4())
    db_session.add(
        SentimentReportLite(
            id=sentiment_id,
            meeting_id=meeting_id,
            classification=classification,
            signals=[],
        )
    )

    summary_id = str(uuid.uuid4())
    db_session.add(
        SummaryLite(id=summary_id, meeting_id=meeting_id, content=summary_content)
    )

    db_session.commit()

    # --- Verify child records exist before deletion ---
    assert db_session.get(TranscriptLite, transcript.id) is not None
    assert db_session.get(SentimentReportLite, sentiment_id) is not None
    assert db_session.get(SummaryLite, summary_id) is not None
    for ai_id in action_item_ids:
        assert db_session.get(ActionItemLite, ai_id) is not None

    # --- Delete the meeting ---
    meeting_row = db_session.get(MeetingLite, meeting_id)
    db_session.delete(meeting_row)
    db_session.commit()

    # --- Assert meeting is gone ---
    assert db_session.get(MeetingLite, meeting_id) is None, "Meeting should be deleted"

    # --- Assert all child records are gone (no orphans) ---
    assert db_session.get(TranscriptLite, transcript.id) is None, (
        "Transcript should be cascade-deleted"
    )
    assert db_session.get(SentimentReportLite, sentiment_id) is None, (
        "SentimentReport should be cascade-deleted"
    )
    assert db_session.get(SummaryLite, summary_id) is None, (
        "Summary should be cascade-deleted"
    )
    for ai_id in action_item_ids:
        assert db_session.get(ActionItemLite, ai_id) is None, (
            f"ActionItem {ai_id} should be cascade-deleted"
        )
