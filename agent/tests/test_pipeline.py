# Feature: communit-ai, Property 9: Pipeline step sequencing
"""
Property 9: Pipeline step sequencing
Validates: Requirements 7.2

For any meeting processed by the CommunitAI_Agent, the steps must execute in
the order: transcription → extraction → sentiment analysis → summarization;
no LLM step should be invoked before the transcript is available.

When transcribe returns None, extract_action_items, analyze_sentiment, and
generate_summary must NOT be called.

When transcribe returns a non-None string, the subsequent steps ARE called.
"""
import asyncio
import sys
import types
from unittest.mock import AsyncMock, call, patch

from hypothesis import given, settings
from hypothesis import strategies as st

# ---------------------------------------------------------------------------
# Stub out module-level imports that require live services BEFORE importing
# agent.agent so that no real connections are attempted.
# ---------------------------------------------------------------------------
_inference_stub = types.ModuleType("agent.inference")
_inference_stub.call_inference = None
sys.modules["agent.inference"] = _inference_stub

_db_stub = types.ModuleType("agent.db")
_db_stub.AsyncSessionLocal = None
_db_stub.update_meeting_status = None
sys.modules["agent.db"] = _db_stub

_gradient_stub = types.ModuleType("gradient_adk")
_gradient_stub.entrypoint = lambda fn: fn
sys.modules["gradient_adk"] = _gradient_stub

import agent.agent  # noqa: E402  (must come after stubs)


# ---------------------------------------------------------------------------
# Property 9a: When transcribe returns None, downstream steps are NOT called.
# ---------------------------------------------------------------------------

@given(st.text())
@settings(max_examples=20, deadline=None)
def test_pipeline_halts_when_transcription_returns_none(meeting_id: str) -> None:
    """No LLM step is invoked when transcription returns None."""

    async def run():
        mock_transcribe = AsyncMock(return_value=None)
        mock_extract = AsyncMock()
        mock_analyze = AsyncMock()
        mock_summarize = AsyncMock()
        mock_get_audio_url = AsyncMock(return_value="audio/test.mp3")
        mock_get_status = AsyncMock(return_value="pending")

        with (
            patch("agent.agent.transcribe", mock_transcribe),
            patch("agent.agent.extract_action_items", mock_extract),
            patch("agent.agent.analyze_sentiment", mock_analyze),
            patch("agent.agent.generate_summary", mock_summarize),
            patch("agent.agent.get_audio_url", mock_get_audio_url),
            patch("agent.agent._get_meeting_status", mock_get_status),
        ):
            result = await agent.agent.process_meeting(meeting_id)

        assert result == {"status": "transcription_failed"}
        mock_transcribe.assert_called_once()
        mock_extract.assert_not_called()
        mock_analyze.assert_not_called()
        mock_summarize.assert_not_called()

    asyncio.run(run())


# ---------------------------------------------------------------------------
# Property 9b: When transcribe returns a non-None string, downstream steps
# ARE called in order.
# ---------------------------------------------------------------------------

@given(st.text(min_size=1), st.text())
@settings(max_examples=20, deadline=None)
def test_pipeline_calls_downstream_steps_after_successful_transcription(
    transcript: str, meeting_id: str
) -> None:
    """extract, analyze, and summarize are all called after transcription succeeds."""
    call_order: list[str] = []

    async def fake_transcribe(mid, url):
        call_order.append("transcribe")
        return transcript

    async def fake_extract(mid, tx):
        call_order.append("extract")
        return []

    async def fake_analyze(mid, tx):
        call_order.append("analyze")
        return {"classification": "positive", "signals": []}

    async def fake_summarize(mid, tx):
        call_order.append("summarize")
        return "summary text"

    async def run():
        with (
            patch("agent.agent.transcribe", side_effect=fake_transcribe),
            patch("agent.agent.extract_action_items", side_effect=fake_extract),
            patch("agent.agent.analyze_sentiment", side_effect=fake_analyze),
            patch("agent.agent.generate_summary", side_effect=fake_summarize),
            patch("agent.agent.get_audio_url", AsyncMock(return_value="audio/test.mp3")),
            patch("agent.agent._get_meeting_status", AsyncMock(return_value="pending")),
            patch("agent.agent.update_meeting_status", AsyncMock()),
        ):
            result = await agent.agent.process_meeting(meeting_id)

        assert result == {"status": "complete"}
        # All four steps must have been called
        assert "transcribe" in call_order
        assert "extract" in call_order
        assert "analyze" in call_order
        assert "summarize" in call_order
        # Transcription must precede every LLM step
        t_idx = call_order.index("transcribe")
        assert call_order.index("extract") > t_idx
        assert call_order.index("analyze") > t_idx
        assert call_order.index("summarize") > t_idx

    asyncio.run(run())


# ---------------------------------------------------------------------------
# Property 10: Failure halts pipeline
# Validates: Requirements 7.5
#
# For any meeting where a processing step fails (returns None), no subsequent
# pipeline steps should be invoked and the meeting status should reflect the
# failed step.
#
# Steps that halt the pipeline on None return:
#   - transcribe      → extract, analyze, summarize NOT called
#   - analyze         → summarize NOT called (transcribe + extract were called)
#   - summarize       → pipeline returns summarization_failed
#
# Note: extract_action_items does NOT halt the pipeline on failure (returns []).
# ---------------------------------------------------------------------------

@given(st.sampled_from(["transcribe", "analyze", "summarize"]))
@settings(max_examples=20, deadline=None)
def test_failure_halts_pipeline(failing_step: str) -> None:
    """When a pipeline step returns None, no subsequent steps are called."""

    async def run():
        mock_transcribe = AsyncMock(return_value="transcript text")
        mock_extract = AsyncMock(return_value=[])
        mock_analyze = AsyncMock(return_value={"classification": "positive", "signals": []})
        mock_summarize = AsyncMock(return_value="summary text")
        mock_get_audio_url = AsyncMock(return_value="audio/test.mp3")
        mock_get_status = AsyncMock(return_value="pending")
        mock_update_status = AsyncMock()

        # Inject failure at the specified step
        if failing_step == "transcribe":
            mock_transcribe.return_value = None
        elif failing_step == "analyze":
            mock_analyze.return_value = None
        elif failing_step == "summarize":
            mock_summarize.return_value = None

        with (
            patch("agent.agent.transcribe", mock_transcribe),
            patch("agent.agent.extract_action_items", mock_extract),
            patch("agent.agent.analyze_sentiment", mock_analyze),
            patch("agent.agent.generate_summary", mock_summarize),
            patch("agent.agent.get_audio_url", mock_get_audio_url),
            patch("agent.agent._get_meeting_status", mock_get_status),
            patch("agent.agent.update_meeting_status", mock_update_status),
        ):
            result = await agent.agent.process_meeting("test-meeting-id")

        if failing_step == "transcribe":
            # transcribe failed → extract, analyze, summarize must NOT be called
            assert result == {"status": "transcription_failed"}
            mock_transcribe.assert_called_once()
            mock_extract.assert_not_called()
            mock_analyze.assert_not_called()
            mock_summarize.assert_not_called()

        elif failing_step == "analyze":
            # analyze failed → summarize must NOT be called
            # transcribe and extract were called before the failure
            assert result == {"status": "analysis_failed"}
            mock_transcribe.assert_called_once()
            mock_extract.assert_called_once()
            mock_analyze.assert_called_once()
            mock_summarize.assert_not_called()

        elif failing_step == "summarize":
            # summarize failed → pipeline returns summarization_failed
            # all prior steps were called
            assert result == {"status": "summarization_failed"}
            mock_transcribe.assert_called_once()
            mock_extract.assert_called_once()
            mock_analyze.assert_called_once()
            mock_summarize.assert_called_once()

    asyncio.run(run())


# ---------------------------------------------------------------------------
# Property 2: Pipeline step produces output
# Validates: Requirements 3.1, 4.1, 5.1, 6.1
#
# For any meeting with a valid transcript, running the full pipeline should
# produce a {"status": "complete"} result, meaning every step was called and
# returned a non-null output.
# ---------------------------------------------------------------------------

@given(st.text(min_size=1))
@settings(max_examples=20, deadline=None)
def test_pipeline_step_produces_output(transcript: str) -> None:
    """Each pipeline step is called and the pipeline completes successfully."""

    async def run():
        mock_transcribe = AsyncMock(return_value=transcript)
        mock_extract = AsyncMock(return_value=[])
        mock_analyze = AsyncMock(return_value={"classification": "neutral", "signals": []})
        mock_summarize = AsyncMock(return_value="summary text")
        mock_get_audio_url = AsyncMock(return_value="audio/test.mp3")
        mock_get_status = AsyncMock(return_value="pending")
        mock_update_status = AsyncMock()

        with (
            patch("agent.agent.transcribe", mock_transcribe),
            patch("agent.agent.extract_action_items", mock_extract),
            patch("agent.agent.analyze_sentiment", mock_analyze),
            patch("agent.agent.generate_summary", mock_summarize),
            patch("agent.agent.get_audio_url", mock_get_audio_url),
            patch("agent.agent._get_meeting_status", mock_get_status),
            patch("agent.agent.update_meeting_status", mock_update_status),
        ):
            result = await agent.agent.process_meeting("test-meeting-id")

        # Pipeline must complete successfully
        assert result == {"status": "complete"}

        # Every step must have been called (each step produced output)
        mock_transcribe.assert_called_once()
        mock_extract.assert_called_once()
        mock_analyze.assert_called_once()
        mock_summarize.assert_called_once()

        # Verify each step was called with the transcript (non-null output contract)
        _, extract_call_args = mock_extract.call_args[0]
        assert isinstance(extract_call_args, str) and len(extract_call_args) > 0

        _, analyze_call_args = mock_analyze.call_args[0]
        assert isinstance(analyze_call_args, str) and len(analyze_call_args) > 0

        _, summarize_call_args = mock_summarize.call_args[0]
        assert isinstance(summarize_call_args, str) and len(summarize_call_args) > 0

    asyncio.run(run())


# ---------------------------------------------------------------------------
# Property 3: Pipeline output association
# Validates: Requirements 3.2, 4.4, 5.4, 6.4
#
# For any meeting_id, every pipeline step must be called with that exact
# meeting_id as its first argument — ensuring outputs are associated with
# the correct meeting.
# ---------------------------------------------------------------------------

@given(st.text(min_size=1))
@settings(max_examples=20, deadline=None)
def test_pipeline_output_association(meeting_id: str) -> None:
    """Every pipeline step is called with the correct meeting_id."""

    async def run():
        captured: dict[str, str] = {}

        async def fake_transcribe(mid, url):
            captured["transcribe"] = mid
            return "transcript text"

        async def fake_extract(mid, tx):
            captured["extract"] = mid
            return []

        async def fake_analyze(mid, tx):
            captured["analyze"] = mid
            return {"classification": "neutral", "signals": []}

        async def fake_summarize(mid, tx):
            captured["summarize"] = mid
            return "summary text"

        with (
            patch("agent.agent.transcribe", side_effect=fake_transcribe),
            patch("agent.agent.extract_action_items", side_effect=fake_extract),
            patch("agent.agent.analyze_sentiment", side_effect=fake_analyze),
            patch("agent.agent.generate_summary", side_effect=fake_summarize),
            patch("agent.agent.get_audio_url", AsyncMock(return_value="audio/test.mp3")),
            patch("agent.agent._get_meeting_status", AsyncMock(return_value="pending")),
            patch("agent.agent.update_meeting_status", AsyncMock()),
        ):
            result = await agent.agent.process_meeting(meeting_id)

        assert result == {"status": "complete"}

        # Every step must have been called with the input meeting_id
        assert captured["transcribe"] == meeting_id, (
            f"transcribe called with {captured['transcribe']!r}, expected {meeting_id!r}"
        )
        assert captured["extract"] == meeting_id, (
            f"extract_action_items called with {captured['extract']!r}, expected {meeting_id!r}"
        )
        assert captured["analyze"] == meeting_id, (
            f"analyze_sentiment called with {captured['analyze']!r}, expected {meeting_id!r}"
        )
        assert captured["summarize"] == meeting_id, (
            f"generate_summary called with {captured['summarize']!r}, expected {meeting_id!r}"
        )

    asyncio.run(run())
