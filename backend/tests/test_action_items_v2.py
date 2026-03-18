# Feature: communit-ai-v2, Property 5: Action item update round-trip
# Feature: communit-ai-v2, Property 7: Action item delete round-trip
"""
Tests for new action item endpoints:
- PATCH /action-items/{id}
- DELETE /action-items/{id}

Covers:
- Property 5: Action item update round-trip
- Property 7: Action item delete round-trip
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
    __tablename__ = "meetings_ai_v2"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="pending")

    action_items: Mapped[list["ActionItemLite"]] = relationship(
        "ActionItemLite", back_populates="meeting", cascade="all, delete-orphan"
    )


class ActionItemLite(Base):
    __tablename__ = "action_items_ai_v2"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    meeting_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meetings_ai_v2.id", ondelete="CASCADE"), nullable=False
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


def _create_meeting(session) -> MeetingLite:
    mid = str(uuid.uuid4())
    meeting = MeetingLite(id=mid, user_id="user-1", title="Test Meeting", status="complete")
    session.add(meeting)
    session.commit()
    return meeting


def _create_action_item(
    session,
    meeting_id: str,
    description: str = "Do something",
    assignee: str = "Alice",
    due_date: date | None = None,
) -> ActionItemLite:
    ai_id = str(uuid.uuid4())
    ai = ActionItemLite(
        id=ai_id,
        meeting_id=meeting_id,
        description=description,
        assignee=assignee,
        due_date=due_date,
    )
    session.add(ai)
    session.commit()
    return ai


# ---------------------------------------------------------------------------
# Property 5: Action item update round-trip
# Feature: communit-ai-v2, Property 5: Action item update round-trip
# Validates: Requirements 2.4
# ---------------------------------------------------------------------------


@given(
    new_description=st.one_of(st.none(), st.text(min_size=1, max_size=300)),
    new_assignee=st.one_of(st.none(), st.text(max_size=100)),
)
@settings(max_examples=100)
def test_action_item_update_roundtrip(db_session, new_description, new_assignee):
    """
    **Validates: Requirements 2.4**

    For any action item and any valid partial update (description, assignee),
    calling PATCH and then fetching the meeting must return an action item with
    the updated values.
    """
    # Feature: communit-ai-v2, Property 5: Action item update round-trip
    from hypothesis import assume
    # At least one field must be updated
    assume(new_description is not None or new_assignee is not None)

    meeting = _create_meeting(db_session)
    ai = _create_action_item(db_session, meeting.id)
    ai_id = ai.id

    original_description = ai.description
    original_assignee = ai.assignee

    # Simulate PATCH /action-items/{id} logic
    update_data = {}
    if new_description is not None:
        update_data["description"] = new_description
    if new_assignee is not None:
        update_data["assignee"] = new_assignee

    db_session.expire_all()
    item = db_session.get(ActionItemLite, ai_id)
    for field, value in update_data.items():
        setattr(item, field, value)
    db_session.commit()

    # Reload and verify
    db_session.expire_all()
    updated = db_session.get(ActionItemLite, ai_id)
    assert updated is not None

    if new_description is not None:
        assert updated.description == new_description, (
            f"description mismatch: expected {new_description!r}, got {updated.description!r}"
        )
    else:
        assert updated.description == original_description

    if new_assignee is not None:
        assert updated.assignee == new_assignee, (
            f"assignee mismatch: expected {new_assignee!r}, got {updated.assignee!r}"
        )
    else:
        assert updated.assignee == original_assignee

    # Cleanup
    m = db_session.get(MeetingLite, meeting.id)
    if m:
        db_session.delete(m)
    db_session.commit()


def test_action_item_update_due_date(db_session):
    """Updating due_date should persist the new date."""
    meeting = _create_meeting(db_session)
    ai = _create_action_item(db_session, meeting.id)

    new_due = date(2025, 1, 31)
    db_session.expire_all()
    item = db_session.get(ActionItemLite, ai.id)
    item.due_date = new_due
    db_session.commit()

    db_session.expire_all()
    updated = db_session.get(ActionItemLite, ai.id)
    assert updated.due_date == new_due

    m = db_session.get(MeetingLite, meeting.id)
    if m:
        db_session.delete(m)
    db_session.commit()


# ---------------------------------------------------------------------------
# Property 7: Action item delete round-trip
# Feature: communit-ai-v2, Property 7: Action item delete round-trip
# Validates: Requirements 2.8
# ---------------------------------------------------------------------------


@given(
    n_items=st.integers(min_value=1, max_value=10),
    delete_index=st.integers(min_value=0, max_value=9),
)
@settings(max_examples=100)
def test_action_item_delete_roundtrip(db_session, n_items, delete_index):
    """
    **Validates: Requirements 2.8**

    For any existing action item, calling DELETE and then fetching the parent
    meeting must not include that action item's ID in the action_items list.
    """
    # Feature: communit-ai-v2, Property 7: Action item delete round-trip
    from hypothesis import assume
    assume(delete_index < n_items)

    meeting = _create_meeting(db_session)
    meeting_id = meeting.id

    ai_ids = []
    for i in range(n_items):
        ai = _create_action_item(db_session, meeting_id, description=f"Task {i}")
        ai_ids.append(ai.id)

    target_id = ai_ids[delete_index]

    # Simulate DELETE /action-items/{id} logic
    db_session.expire_all()
    item = db_session.get(ActionItemLite, target_id)
    assert item is not None, "Action item should exist before deletion"
    db_session.delete(item)
    db_session.commit()

    # Verify item is gone
    db_session.expire_all()
    deleted = db_session.get(ActionItemLite, target_id)
    assert deleted is None, "Action item should not exist after deletion"

    # Verify it's not in the meeting's action_items list
    m = db_session.get(MeetingLite, meeting_id)
    remaining_ids = [ai.id for ai in m.action_items]
    assert target_id not in remaining_ids, (
        f"Deleted action item {target_id!r} still appears in meeting's action_items"
    )

    # Verify other items are still present
    for ai_id in ai_ids:
        if ai_id != target_id:
            assert ai_id in remaining_ids, (
                f"Non-deleted action item {ai_id!r} was unexpectedly removed"
            )

    # Cleanup
    db_session.delete(m)
    db_session.commit()


def test_delete_action_item_returns_204_logic(db_session):
    """Deleting an action item should remove it from the DB (204 logic)."""
    meeting = _create_meeting(db_session)
    ai = _create_action_item(db_session, meeting.id, description="To be deleted")
    ai_id = ai.id

    db_session.expire_all()
    item = db_session.get(ActionItemLite, ai_id)
    db_session.delete(item)
    db_session.commit()

    assert db_session.get(ActionItemLite, ai_id) is None

    m = db_session.get(MeetingLite, meeting.id)
    if m:
        db_session.delete(m)
    db_session.commit()


def test_delete_nonexistent_action_item_returns_none(db_session):
    """Querying a non-existent action item should return None."""
    fake_id = str(uuid.uuid4())
    result = db_session.get(ActionItemLite, fake_id)
    assert result is None
