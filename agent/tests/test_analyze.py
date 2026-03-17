"""Property-based tests for agent.steps.analyze._parse_sentiment."""
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

from agent.steps.analyze import _parse_sentiment  # noqa: E402

from hypothesis import given, settings
from hypothesis import strategies as st


# ---------------------------------------------------------------------------
# Property 8: Sentiment report structure invariant
# ---------------------------------------------------------------------------

_valid_classifications = ["positive", "neutral", "negative"]

_classification_st = st.one_of(
    st.sampled_from(_valid_classifications),
    st.text(min_size=0, max_size=30),
)

_signals_st = st.one_of(
    st.lists(st.text(min_size=0, max_size=20), min_size=0, max_size=5),
    st.integers(),
    st.text(min_size=0, max_size=20),
    st.none(),
)


# Feature: communit-ai, Property 8: Sentiment report structure invariant
@given(
    classification=_classification_st,
    signals=_signals_st,
)
@settings(max_examples=100)
def test_sentiment_report_structure_invariant(classification, signals):
    """Validates: Requirements 5.2

    For any sentiment report produced by _parse_sentiment, if the result is
    not None then:
      - result["classification"] must be in {"positive", "neutral", "negative"}
      - result["signals"] must be a list
    """
    data = {"classification": classification, "signals": signals}
    result = _parse_sentiment(json.dumps(data))

    if result is not None:
        assert result["classification"] in {"positive", "neutral", "negative"}, (
            f"classification {result['classification']!r} is not valid"
        )
        assert isinstance(result["signals"], list), (
            f"signals is not a list: {result['signals']!r}"
        )
