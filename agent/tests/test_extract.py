"""Property-based tests for agent.steps.extract._parse_action_items."""
import json
import sys
import types

# Stub out module-level imports that require live services
_inference_stub = types.ModuleType("agent.inference")
_inference_stub.call_inference = None  # type: ignore[attr-defined]
sys.modules["agent.inference"] = _inference_stub

_db_stub = types.ModuleType("agent.db")
_db_stub.AsyncSessionLocal = None  # type: ignore[attr-defined]
_db_stub.update_meeting_status = None  # type: ignore[attr-defined]
sys.modules["agent.db"] = _db_stub

from agent.steps.extract import _parse_action_items  # noqa: E402

from hypothesis import given, settings
from hypothesis import strategies as st


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_text = st.text(min_size=0, max_size=80)
_maybe_text = st.one_of(st.just(""), st.just(None), st.text(min_size=1, max_size=80))


def _action_item_strategy(*, require_due_date: bool = False):
    """Build a strategy for a single action item dict."""
    due_date_st = (
        st.just("2024-03-15")
        if require_due_date
        else st.one_of(st.none(), st.just("2024-03-15"), st.just("2025-01-01"))
    )
    return st.fixed_dictionaries(
        {
            "description": _maybe_text,
            "assignee": _maybe_text,
            "due_date": due_date_st,
        }
    )


# ---------------------------------------------------------------------------
# Property 6: Action item field invariant
# ---------------------------------------------------------------------------

# Feature: communit-ai, Property 6: Action item field invariant
@given(st.lists(_action_item_strategy(), min_size=0, max_size=20))
@settings(max_examples=100)
def test_action_item_field_invariant(items):
    """Validates: Requirements 4.2

    Every item returned by _parse_action_items must have a non-empty
    description AND a non-empty assignee — items missing either field are
    filtered out before they could ever be persisted.
    """
    raw = json.dumps(items)
    result = _parse_action_items(raw)

    for item in result:
        assert item["description"] and item["description"].strip(), (
            f"Returned item has empty description: {item!r}"
        )
        assert item["assignee"] and item["assignee"].strip(), (
            f"Returned item has empty assignee: {item!r}"
        )


# ---------------------------------------------------------------------------
# Property 7: Action item due date preservation
# ---------------------------------------------------------------------------

# Feature: communit-ai, Property 7: Action item due date preservation
@given(
    st.lists(
        _action_item_strategy(require_due_date=True),
        min_size=1,
        max_size=20,
    ).filter(
        # Keep only lists where at least one item has both fields non-empty
        # (so _parse_action_items actually returns something to assert on)
        lambda items: any(
            (item.get("description") or "").strip()
            and (item.get("assignee") or "").strip()
            for item in items
        )
    )
)
@settings(max_examples=100)
def test_action_item_due_date_preservation(items):
    """Validates: Requirements 4.3

    For every input item that has a non-null due_date AND passes the
    description/assignee filter, the corresponding output item must carry
    the same due_date value.
    """
    raw = json.dumps(items)
    result = _parse_action_items(raw)

    # Build a lookup of valid input items (those that would survive filtering)
    # keyed by (description, assignee) so we can match them to output items.
    valid_inputs = {
        ((item.get("description") or "").strip(), (item.get("assignee") or "").strip()): item
        for item in items
        if (item.get("description") or "").strip() and (item.get("assignee") or "").strip()
    }

    for out_item in result:
        key = (out_item["description"], out_item["assignee"])
        in_item = valid_inputs.get(key)
        if in_item is None:
            continue  # shouldn't happen, but be defensive

        if in_item.get("due_date") is not None:
            assert out_item["due_date"] == in_item["due_date"], (
                f"due_date mismatch: expected {in_item['due_date']!r}, "
                f"got {out_item['due_date']!r} for item {out_item!r}"
            )
