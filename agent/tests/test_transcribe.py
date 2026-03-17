# Feature: communit-ai, Property 4: Status transition after transcription
"""
Property 4: Status transition after transcription
Validates: Requirements 3.3

For any meeting that successfully completes transcription, the meeting's status
in the database should be updated to "transcribed" and the transcript should be
retrievable from Storage.
"""
import asyncio
import sys
import types
from unittest.mock import AsyncMock, MagicMock, patch

from hypothesis import given, settings
from hypothesis import strategies as st

# ---------------------------------------------------------------------------
# Stub out agent.db at the module level so that importing agent.steps.transcribe
# does not trigger SQLAlchemy engine creation (which requires a real DATABASE_URL).
# ---------------------------------------------------------------------------
_db_stub = types.ModuleType("agent.db")
_db_stub.update_meeting_status = AsyncMock()  # will be replaced per-test
sys.modules.setdefault("agent.db", _db_stub)


@given(st.text(min_size=1))
@settings(max_examples=100, deadline=None)
def test_status_transition_after_transcription(transcript_text: str) -> None:
    """After successful transcription, status is set to 'transcribed' and
    the transcript text is returned."""

    async def run():
        meeting_id = "test-meeting-123"
        audio_url = "audio/test-meeting-123.mp3"

        mock_response = MagicMock()
        mock_response.json.return_value = {"text": transcript_text}
        mock_response.raise_for_status = MagicMock()

        mock_async_client = AsyncMock()
        mock_async_client.__aenter__ = AsyncMock(return_value=mock_async_client)
        mock_async_client.__aexit__ = AsyncMock(return_value=False)
        mock_async_client.post = AsyncMock(return_value=mock_response)

        mock_update_status = AsyncMock()

        async def fake_with_retry(fn, **kw):
            return await fn()

        with (
            patch(
                "agent.steps.transcribe._download_audio",
                return_value=(b"fake_audio", "mp3"),
            ),
            patch("agent.steps.transcribe._upload_transcript"),
            patch(
                "agent.steps.transcribe.update_meeting_status",
                mock_update_status,
            ),
            patch(
                "agent.steps.transcribe.with_retry",
                new=fake_with_retry,
            ),
            patch("httpx.AsyncClient", return_value=mock_async_client),
        ):
            from agent.steps.transcribe import transcribe

            result = await transcribe(meeting_id, audio_url)

        assert result == transcript_text
        mock_update_status.assert_called_with(meeting_id, "transcribed")

    asyncio.run(run())
