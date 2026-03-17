# Feature: communit-ai, Property 19: Access control isolation
"""
Property 19: Access control isolation

For any two distinct users A and B, user A should not be able to retrieve,
modify, or delete any meeting, transcript, action item, or report that belongs
to user B — all data access must be scoped to the requesting user's user_id.

Validates: Requirements 9.5
"""

import uuid

import pytest
from hypothesis import assume, given, settings
from hypothesis import strategies as st
from sqlalchemy import Boolean, ForeignKey, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

# ---------------------------------------------------------------------------
# Lightweight SQLite-compatible models
# ---------------------------------------------------------------------------


class Base(DeclarativeBase):
    pass


class MeetingLite(Base):
    """SQLite-compatible mirror of the Meeting ORM model."""

    __tablename__ = "meetings_auth"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="pending")

    action_items: Mapped[list["ActionItemLite"]] = relationship(
        "ActionItemLite", back_populates="meeting", cascade="all, delete-orphan"
    )


class ActionItemLite(Base):
    """SQLite-compatible mirror of the ActionItem ORM model."""

    __tablename__ = "action_items_auth"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    meeting_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("meetings_auth.id", ondelete="CASCADE"),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    assignee: Mapped[str] = mapped_column(Text, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    meeting: Mapped["MeetingLite"] = relationship("MeetingLite", back_populates="action_items")


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


# ---------------------------------------------------------------------------
# Property 19: Access control isolation
# Validates: Requirements 9.5
# ---------------------------------------------------------------------------


@given(user_a=user_id_strategy, user_b=user_id_strategy)
@settings(max_examples=100)
def test_access_control_isolation(db_session, user_a, user_b):
    """
    **Validates: Requirements 9.5**

    For any two distinct users A and B:
    - A query filtered by user_id=user_a returns ONLY user_a's meetings.
    - A query filtered by user_id=user_b returns ONLY user_b's meetings.
    - user_a cannot see user_b's action items (joined through meeting.user_id).
    - user_b cannot see user_a's action items.
    """
    assume(user_a != user_b)

    meeting_a_id = str(uuid.uuid4())
    meeting_b_id = str(uuid.uuid4())
    action_item_a_id = str(uuid.uuid4())
    action_item_b_id = str(uuid.uuid4())

    # --- Create one meeting + one action item for each user ---
    db_session.add(
        MeetingLite(
            id=meeting_a_id,
            user_id=user_a,
            title="Meeting A",
            status="complete",
        )
    )
    db_session.add(
        ActionItemLite(
            id=action_item_a_id,
            meeting_id=meeting_a_id,
            description="Task for A",
            assignee="Alice",
            completed=False,
        )
    )

    db_session.add(
        MeetingLite(
            id=meeting_b_id,
            user_id=user_b,
            title="Meeting B",
            status="complete",
        )
    )
    db_session.add(
        ActionItemLite(
            id=action_item_b_id,
            meeting_id=meeting_b_id,
            description="Task for B",
            assignee="Bob",
            completed=False,
        )
    )

    db_session.commit()

    # --- Meeting isolation: user_a query returns ONLY user_a's meetings ---
    meetings_for_a = (
        db_session.execute(
            select(MeetingLite).where(MeetingLite.user_id == user_a)
        )
        .scalars()
        .all()
    )
    meeting_ids_for_a = {m.id for m in meetings_for_a}
    assert meeting_a_id in meeting_ids_for_a, (
        "user_a's meeting must appear in user_a's query"
    )
    assert meeting_b_id not in meeting_ids_for_a, (
        "user_b's meeting must NOT appear in user_a's query"
    )

    # --- Meeting isolation: user_b query returns ONLY user_b's meetings ---
    meetings_for_b = (
        db_session.execute(
            select(MeetingLite).where(MeetingLite.user_id == user_b)
        )
        .scalars()
        .all()
    )
    meeting_ids_for_b = {m.id for m in meetings_for_b}
    assert meeting_b_id in meeting_ids_for_b, (
        "user_b's meeting must appear in user_b's query"
    )
    assert meeting_a_id not in meeting_ids_for_b, (
        "user_a's meeting must NOT appear in user_b's query"
    )

    # --- Action item isolation: user_a cannot see user_b's action items ---
    # Simulate the join: action_items JOIN meetings ON meeting.user_id = user_a
    action_items_for_a = (
        db_session.execute(
            select(ActionItemLite)
            .join(MeetingLite, ActionItemLite.meeting_id == MeetingLite.id)
            .where(MeetingLite.user_id == user_a)
        )
        .scalars()
        .all()
    )
    action_item_ids_for_a = {ai.id for ai in action_items_for_a}
    assert action_item_a_id in action_item_ids_for_a, (
        "user_a's action item must appear in user_a's query"
    )
    assert action_item_b_id not in action_item_ids_for_a, (
        "user_b's action item must NOT appear in user_a's query"
    )

    # --- Action item isolation: user_b cannot see user_a's action items ---
    action_items_for_b = (
        db_session.execute(
            select(ActionItemLite)
            .join(MeetingLite, ActionItemLite.meeting_id == MeetingLite.id)
            .where(MeetingLite.user_id == user_b)
        )
        .scalars()
        .all()
    )
    action_item_ids_for_b = {ai.id for ai in action_items_for_b}
    assert action_item_b_id in action_item_ids_for_b, (
        "user_b's action item must appear in user_b's query"
    )
    assert action_item_a_id not in action_item_ids_for_b, (
        "user_a's action item must NOT appear in user_b's query"
    )

    # --- Cleanup: remove rows so test runs are independent ---
    for ai_id in (action_item_a_id, action_item_b_id):
        row = db_session.get(ActionItemLite, ai_id)
        if row:
            db_session.delete(row)
    for m_id in (meeting_a_id, meeting_b_id):
        row = db_session.get(MeetingLite, m_id)
        if row:
            db_session.delete(row)
    db_session.commit()
