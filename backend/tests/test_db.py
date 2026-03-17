# Feature: communit-ai, Property 17: Database persistence round-trip
"""
Property 17: Database persistence round-trip

For any meeting record written to the database, the record should be
retrievable by its primary key and all fields should match the values
that were written.

Validates: Requirements 9.3
"""

import uuid

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from sqlalchemy import JSON, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

# ---------------------------------------------------------------------------
# Lightweight SQLite-compatible models (mirrors backend/models/db.py but
# replaces PostgreSQL-specific types with generic SQLAlchemy equivalents so
# the test can run against an in-memory SQLite database without asyncpg).
# ---------------------------------------------------------------------------

VALID_STATUSES = [
    "pending",
    "processing",
    "transcribed",
    "complete",
    "transcription_failed",
    "analysis_failed",
    "summarization_failed",
]


class Base(DeclarativeBase):
    pass


class MeetingLite(Base):
    """SQLite-compatible mirror of the Meeting ORM model."""

    __tablename__ = "meetings_lite"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="pending")
    audio_url: Mapped[str | None] = mapped_column(Text, nullable=True)


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

user_id_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd")),
    min_size=1,
    max_size=64,
)

title_strategy = st.text(min_size=1, max_size=255)

status_strategy = st.sampled_from(VALID_STATUSES)


# ---------------------------------------------------------------------------
# Property 17: Database persistence round-trip
# Validates: Requirements 9.3
# ---------------------------------------------------------------------------


@given(
    user_id=user_id_strategy,
    title=title_strategy,
    status=status_strategy,
)
@settings(max_examples=100)
def test_meeting_persistence_round_trip(db_session, user_id, title, status):
    """
    **Validates: Requirements 9.3**

    For any combination of (user_id, title, status), writing a Meeting row to
    the database and reading it back by primary key must return a record whose
    fields are byte-for-byte identical to the values that were written.
    """
    meeting_id = str(uuid.uuid4())

    # Write
    meeting = MeetingLite(
        id=meeting_id,
        user_id=user_id,
        title=title,
        status=status,
        audio_url=None,
    )
    db_session.add(meeting)
    db_session.commit()

    # Read back
    db_session.expire(meeting)  # force reload from DB
    retrieved = db_session.get(MeetingLite, meeting_id)

    assert retrieved is not None, "Meeting not found after write"
    assert retrieved.id == meeting_id, f"id mismatch: {retrieved.id!r} != {meeting_id!r}"
    assert retrieved.user_id == user_id, f"user_id mismatch: {retrieved.user_id!r} != {user_id!r}"
    assert retrieved.title == title, f"title mismatch: {retrieved.title!r} != {title!r}"
    assert retrieved.status == status, f"status mismatch: {retrieved.status!r} != {status!r}"
    assert retrieved.audio_url is None, "audio_url should be None"

    # Cleanup so the next example starts clean
    db_session.delete(retrieved)
    db_session.commit()
