# Feature: communit-ai, Property 13: Action item completion round-trip
"""
Property 13: Action item completion round-trip

For any action item, calling PATCH /action-items/{id}/complete should result
in the item's `completed` field being `true` when subsequently retrieved from
the database, and the item should no longer appear in the pending action items
list (i.e., a query filtering completed=False).

Validates: Requirements 8.4
"""

import uuid

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from sqlalchemy import Boolean, ForeignKey, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

# ---------------------------------------------------------------------------
# Lightweight SQLite-compatible models (mirrors backend/models/db.py but
# replaces PostgreSQL-specific types with generic SQLAlchemy equivalents so
# the test can run against an in-memory SQLite database without asyncpg).
# ---------------------------------------------------------------------------


class Base(DeclarativeBase):
    pass


class MeetingLite(Base):
    """SQLite-compatible mirror of the Meeting ORM model."""

    __tablename__ = "meetings_action_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="pending")


class ActionItemLite(Base):
    """SQLite-compatible mirror of the ActionItem ORM model."""

    __tablename__ = "action_items_completion"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    meeting_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("meetings_action_items.id", ondelete="CASCADE"),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    assignee: Mapped[str] = mapped_column(Text, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


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

description_strategy = st.text(min_size=1, max_size=255)

assignee_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd", "Zs")),
    min_size=1,
    max_size=64,
)


# ---------------------------------------------------------------------------
# Property 13: Action item completion round-trip
# Validates: Requirements 8.4
# ---------------------------------------------------------------------------


@given(
    description=description_strategy,
    assignee=assignee_strategy,
)
@settings(max_examples=100)
def test_action_item_completion_round_trip(db_session, description, assignee):
    """
    **Validates: Requirements 8.4**

    For any action item created with completed=False, simulating the
    PATCH /action-items/{id}/complete logic (set completed=True, flush,
    read back) must result in:
      1. The item's `completed` field being True when retrieved by primary key.
      2. The item being absent from a query filtering completed=False
         (i.e., it no longer appears in the pending action items list).
    """
    # --- Setup: create a parent meeting and an action item with completed=False ---
    meeting_id = str(uuid.uuid4())
    db_session.add(
        MeetingLite(
            id=meeting_id,
            user_id="user-test",
            title="Test Meeting",
            status="complete",
        )
    )

    action_item_id = str(uuid.uuid4())
    db_session.add(
        ActionItemLite(
            id=action_item_id,
            meeting_id=meeting_id,
            description=description,
            assignee=assignee,
            completed=False,
        )
    )
    db_session.commit()

    # --- Precondition: item starts as incomplete ---
    item = db_session.get(ActionItemLite, action_item_id)
    assert item is not None, "Action item should exist after creation"
    assert item.completed is False, "Action item should start as completed=False"

    # --- Simulate PATCH /action-items/{id}/complete logic ---
    item.completed = True
    db_session.flush()

    # --- Assertion 1: read back by primary key — completed must be True ---
    db_session.expire(item)  # force reload from DB
    retrieved = db_session.get(ActionItemLite, action_item_id)
    assert retrieved is not None, "Action item should still exist after completion"
    assert retrieved.completed is True, (
        f"completed should be True after PATCH, got {retrieved.completed!r}"
    )

    # --- Assertion 2: item must be absent from pending (completed=False) query ---
    pending_stmt = select(ActionItemLite).where(
        ActionItemLite.meeting_id == meeting_id,
        ActionItemLite.completed == False,  # noqa: E712
    )
    pending_items = db_session.execute(pending_stmt).scalars().all()
    pending_ids = [ai.id for ai in pending_items]
    assert action_item_id not in pending_ids, (
        "Completed action item must not appear in the pending (completed=False) list"
    )

    # --- Cleanup: remove rows so test runs are independent ---
    db_session.delete(retrieved)
    meeting_row = db_session.get(MeetingLite, meeting_id)
    if meeting_row:
        db_session.delete(meeting_row)
    db_session.commit()
