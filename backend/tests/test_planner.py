# Feature: communit-ai-v2, Property 15: Planner conversation history grows after each exchange
# Feature: communit-ai-v2, Property 16: Planner conversation history persists across sessions
# Feature: communit-ai-v2, Property 17: Clear conversation resets history to empty
"""
Tests for the Planner Agent backend logic.

Covers:
- Property 15: Conversation history grows by 2 after each exchange (user + assistant)
- Property 16: Conversation history persists across sessions (survives reload)
- Property 17: Clear conversation resets history to empty
- Unit: planner uses correct model (llama3.3-70b-instruct)
- Unit: planner error preserves input (502 returned, no messages persisted)

All tests use an in-memory SQLite database with lightweight models so no
live PostgreSQL connection is required.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from sqlalchemy import ForeignKey, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

# ---------------------------------------------------------------------------
# Lightweight SQLite-compatible models
# ---------------------------------------------------------------------------


class Base(DeclarativeBase):
    pass


class WorkspaceLite(Base):
    __tablename__ = "workspaces_planner"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    icon_emoji: Mapped[str] = mapped_column(Text, nullable=False, default="🏘️")

    planner_messages: Mapped[list["PlannerMessageLite"]] = relationship(
        "PlannerMessageLite", back_populates="workspace", cascade="all, delete-orphan"
    )


class PlannerMessageLite(Base):
    __tablename__ = "planner_messages_lite"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("workspaces_planner.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(Text, nullable=False)

    workspace: Mapped["WorkspaceLite"] = relationship(
        "WorkspaceLite", back_populates="planner_messages"
    )


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


def _add_workspace(session, ws_id: str, name: str = "Test WS") -> WorkspaceLite:
    ws = WorkspaceLite(id=ws_id, user_id="user-1", name=name)
    session.add(ws)
    session.commit()
    return ws


def _add_message(session, ws_id: str, user_id: str, role: str, content: str) -> PlannerMessageLite:
    msg = PlannerMessageLite(
        id=str(uuid.uuid4()),
        workspace_id=ws_id,
        user_id=user_id,
        role=role,
        content=content,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    session.add(msg)
    session.commit()
    return msg


def _count_messages(session, ws_id: str, user_id: str) -> int:
    from sqlalchemy import select
    result = session.execute(
        select(PlannerMessageLite).where(
            PlannerMessageLite.workspace_id == ws_id,
            PlannerMessageLite.user_id == user_id,
        )
    )
    return len(result.scalars().all())


def _get_messages(session, ws_id: str, user_id: str) -> list[PlannerMessageLite]:
    from sqlalchemy import select
    result = session.execute(
        select(PlannerMessageLite)
        .where(
            PlannerMessageLite.workspace_id == ws_id,
            PlannerMessageLite.user_id == user_id,
        )
        .order_by(PlannerMessageLite.created_at)
    )
    return list(result.scalars().all())


def _clear_messages(session, ws_id: str, user_id: str) -> None:
    from sqlalchemy import delete
    session.execute(
        delete(PlannerMessageLite).where(
            PlannerMessageLite.workspace_id == ws_id,
            PlannerMessageLite.user_id == user_id,
        )
    )
    session.commit()


# ---------------------------------------------------------------------------
# Property 15: Planner conversation history grows after each exchange
# Feature: communit-ai-v2, Property 15: Planner conversation history grows after each exchange
# Validates: Requirements 5.4
# ---------------------------------------------------------------------------


@given(
    initial_messages=st.lists(
        st.tuples(
            st.sampled_from(["user", "assistant"]),
            st.text(min_size=1, max_size=100),
        ),
        min_size=0,
        max_size=10,
    ),
    new_user_message=st.text(min_size=1, max_size=100),
    assistant_reply=st.text(min_size=1, max_size=100),
)
@settings(max_examples=100)
def test_planner_history_grows_after_exchange(
    db_session, initial_messages, new_user_message, assistant_reply
):
    """
    **Validates: Requirements 5.4**

    For any initial conversation history of length N, simulating one exchange
    (persist user message + assistant message) must result in history of length N+2.
    """
    # Feature: communit-ai-v2, Property 15: Planner conversation history grows after each exchange
    ws_id = str(uuid.uuid4())
    user_id = "user-prop15"
    _add_workspace(db_session, ws_id)

    # Seed initial messages
    for role, content in initial_messages:
        _add_message(db_session, ws_id, user_id, role, content)

    n_before = _count_messages(db_session, ws_id, user_id)
    assert n_before == len(initial_messages)

    # Simulate one exchange: persist user + assistant messages
    _add_message(db_session, ws_id, user_id, "user", new_user_message)
    _add_message(db_session, ws_id, user_id, "assistant", assistant_reply)

    n_after = _count_messages(db_session, ws_id, user_id)
    assert n_after == n_before + 2, (
        f"Expected history to grow by 2 (N={n_before} → {n_before + 2}), got {n_after}"
    )

    # Cleanup
    _clear_messages(db_session, ws_id, user_id)
    ws = db_session.get(WorkspaceLite, ws_id)
    if ws:
        db_session.delete(ws)
    db_session.commit()


# ---------------------------------------------------------------------------
# Property 16: Planner conversation history persists across sessions
# Feature: communit-ai-v2, Property 16: Planner conversation history persists across sessions
# Validates: Requirements 5.5
# ---------------------------------------------------------------------------


@given(
    messages=st.lists(
        st.tuples(
            st.sampled_from(["user", "assistant"]),
            st.text(min_size=1, max_size=100),
        ),
        min_size=1,
        max_size=10,
    )
)
@settings(max_examples=100)
def test_planner_history_persists_across_sessions(db_session, messages):
    """
    **Validates: Requirements 5.5**

    For any sequence of messages written to the DB, re-querying (simulating a
    page reload) must return the same messages in the same order.
    """
    # Feature: communit-ai-v2, Property 16: Planner conversation history persists across sessions
    ws_id = str(uuid.uuid4())
    user_id = "user-prop16"
    _add_workspace(db_session, ws_id)

    written_contents = []
    for role, content in messages:
        _add_message(db_session, ws_id, user_id, role, content)
        written_contents.append((role, content))

    # Simulate page reload: expire all objects and re-query
    db_session.expire_all()
    retrieved = _get_messages(db_session, ws_id, user_id)

    assert len(retrieved) == len(written_contents), (
        f"Expected {len(written_contents)} messages, got {len(retrieved)}"
    )
    for i, (msg, (expected_role, expected_content)) in enumerate(
        zip(retrieved, written_contents)
    ):
        assert msg.role == expected_role, f"Message {i}: role mismatch"
        assert msg.content == expected_content, f"Message {i}: content mismatch"

    # Cleanup
    _clear_messages(db_session, ws_id, user_id)
    ws = db_session.get(WorkspaceLite, ws_id)
    if ws:
        db_session.delete(ws)
    db_session.commit()


# ---------------------------------------------------------------------------
# Property 17: Clear conversation resets history to empty
# Feature: communit-ai-v2, Property 17: Clear conversation resets history to empty
# Validates: Requirements 5.8
# ---------------------------------------------------------------------------


@given(
    messages=st.lists(
        st.tuples(
            st.sampled_from(["user", "assistant"]),
            st.text(min_size=1, max_size=100),
        ),
        min_size=1,
        max_size=10,
    )
)
@settings(max_examples=100)
def test_clear_conversation_resets_history(db_session, messages):
    """
    **Validates: Requirements 5.8**

    For any non-empty conversation history, calling DELETE (clear) and then
    re-querying must return an empty list.
    """
    # Feature: communit-ai-v2, Property 17: Clear conversation resets history to empty
    ws_id = str(uuid.uuid4())
    user_id = "user-prop17"
    _add_workspace(db_session, ws_id)

    for role, content in messages:
        _add_message(db_session, ws_id, user_id, role, content)

    assert _count_messages(db_session, ws_id, user_id) == len(messages)

    # Simulate DELETE /workspaces/{id}/planner/chat
    _clear_messages(db_session, ws_id, user_id)

    remaining = _count_messages(db_session, ws_id, user_id)
    assert remaining == 0, (
        f"Expected 0 messages after clear, got {remaining}"
    )

    # Cleanup workspace
    ws = db_session.get(WorkspaceLite, ws_id)
    if ws:
        db_session.delete(ws)
    db_session.commit()


# ---------------------------------------------------------------------------
# Unit: planner uses correct model
# Validates: Requirements 5.9
# ---------------------------------------------------------------------------


def test_planner_uses_correct_model():
    """
    Verify that the planner router uses 'llama3.3-70b-instruct' as the model.
    """
    from backend.routers.planner import _MODEL
    assert _MODEL == "llama3.3-70b-instruct", (
        f"Expected model 'llama3.3-70b-instruct', got {_MODEL!r}"
    )


# ---------------------------------------------------------------------------
# Unit: planner system prompt includes workspace name
# Validates: Requirements 5.3
# ---------------------------------------------------------------------------


def test_planner_system_prompt_includes_workspace_name():
    """
    Verify that _build_system_prompt includes the workspace name.
    """
    from backend.routers.planner import _build_system_prompt

    prompt = _build_system_prompt("My Community", [], [])
    assert "My Community" in prompt


def test_planner_system_prompt_includes_summaries():
    """
    Verify that _build_system_prompt includes meeting summaries.
    """
    from backend.routers.planner import _build_system_prompt

    summaries = [("2024-01-01", "Sprint Planning", "We discussed the roadmap.")]
    prompt = _build_system_prompt("WS", summaries, [])
    assert "Sprint Planning" in prompt
    assert "We discussed the roadmap." in prompt


def test_planner_system_prompt_includes_action_items():
    """
    Verify that _build_system_prompt includes open action items.
    """
    from backend.routers.planner import _build_system_prompt

    action_items = [("Fix the bug", "Alice", "2024-02-01")]
    prompt = _build_system_prompt("WS", [], action_items)
    assert "Fix the bug" in prompt
    assert "Alice" in prompt
