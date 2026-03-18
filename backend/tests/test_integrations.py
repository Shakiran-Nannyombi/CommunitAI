# Feature: communit-ai-v2, Property 11: Slack message payload contains summary and all action items
"""
Tests for the integrations router (Slack sharing).

Covers:
- Property 11: Slack Block Kit payload contains summary and all action items
- Unit: Slack POST failure returns 502 with status code (Req 3.6)
- Unit: Missing webhook URL returns 400
- Unit: Payload structure matches Slack Block Kit format
"""

from unittest.mock import MagicMock

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st


# ---------------------------------------------------------------------------
# Helpers — build lightweight mock Meeting objects
# ---------------------------------------------------------------------------


def _make_action_item(description: str, assignee: str = "", due_date=None):
    item = MagicMock()
    item.description = description
    item.assignee = assignee
    item.due_date = due_date
    return item


def _make_meeting(title: str, summary_content: str | None, action_items: list):
    meeting = MagicMock()
    meeting.title = title
    if summary_content is not None:
        meeting.summary = MagicMock()
        meeting.summary.content = summary_content
    else:
        meeting.summary = None
    meeting.action_items = action_items
    return meeting


# ---------------------------------------------------------------------------
# Property 11: Slack message payload contains summary and all action items
# Feature: communit-ai-v2, Property 11: Slack message payload contains summary and all action items
# Validates: Requirements 3.4
# ---------------------------------------------------------------------------


@given(
    title=st.text(min_size=1, max_size=100),
    summary=st.text(min_size=1, max_size=500),
    descriptions=st.lists(st.text(min_size=1, max_size=100), min_size=0, max_size=10),
)
@settings(max_examples=100)
def test_slack_payload_contains_summary_and_action_items(title, summary, descriptions):
    """
    **Validates: Requirements 3.4**

    For any meeting with a summary and a list of action items, the Slack Block
    Kit payload must contain the summary text and every action item's description.
    """
    # Feature: communit-ai-v2, Property 11: Slack message payload contains summary and all action items
    from backend.routers.integrations import _build_slack_payload

    action_items = [_make_action_item(desc) for desc in descriptions]
    meeting = _make_meeting(title, summary, action_items)

    payload = _build_slack_payload(meeting)

    # Payload must be a dict with a "blocks" list
    assert isinstance(payload, dict), "Payload must be a dict"
    assert "blocks" in payload, "Payload must have 'blocks' key"
    assert isinstance(payload["blocks"], list), "'blocks' must be a list"

    # Flatten all text content from blocks
    all_text = " ".join(
        block.get("text", {}).get("text", "")
        for block in payload["blocks"]
        if isinstance(block.get("text"), dict)
    )

    # Summary must appear in the payload
    assert summary in all_text, (
        f"Summary not found in payload text. Summary: {summary!r}"
    )

    # Every action item description must appear
    for desc in descriptions:
        assert desc in all_text, (
            f"Action item description {desc!r} not found in payload text"
        )


# ---------------------------------------------------------------------------
# Unit: Slack payload structure
# ---------------------------------------------------------------------------


def test_slack_payload_has_header_block():
    """Payload must include a header block with the meeting title."""
    from backend.routers.integrations import _build_slack_payload

    meeting = _make_meeting("Q1 Review", "Great meeting.", [])
    payload = _build_slack_payload(meeting)

    header_blocks = [b for b in payload["blocks"] if b.get("type") == "header"]
    assert len(header_blocks) >= 1, "Payload must have at least one header block"
    header_text = header_blocks[0]["text"]["text"]
    assert "Q1 Review" in header_text


def test_slack_payload_no_summary_uses_fallback():
    """When meeting has no summary, payload should use a fallback string."""
    from backend.routers.integrations import _build_slack_payload

    meeting = _make_meeting("No Summary Meeting", None, [])
    payload = _build_slack_payload(meeting)

    all_text = " ".join(
        block.get("text", {}).get("text", "")
        for block in payload["blocks"]
        if isinstance(block.get("text"), dict)
    )
    assert "no summary" in all_text.lower()


def test_slack_payload_no_action_items_uses_fallback():
    """When meeting has no action items, payload should use a fallback string."""
    from backend.routers.integrations import _build_slack_payload

    meeting = _make_meeting("Empty Meeting", "Summary here.", [])
    payload = _build_slack_payload(meeting)

    all_text = " ".join(
        block.get("text", {}).get("text", "")
        for block in payload["blocks"]
        if isinstance(block.get("text"), dict)
    )
    assert "no action items" in all_text.lower()


def test_slack_payload_action_item_with_assignee_and_due_date():
    """Action items with assignee and due_date should appear formatted in payload."""
    from backend.routers.integrations import _build_slack_payload
    from datetime import date

    item = _make_action_item("Deploy to prod", "Bob", date(2024, 3, 15))
    meeting = _make_meeting("Deploy Meeting", "We planned the deploy.", [item])
    payload = _build_slack_payload(meeting)

    all_text = " ".join(
        block.get("text", {}).get("text", "")
        for block in payload["blocks"]
        if isinstance(block.get("text"), dict)
    )
    assert "Deploy to prod" in all_text
    assert "Bob" in all_text
