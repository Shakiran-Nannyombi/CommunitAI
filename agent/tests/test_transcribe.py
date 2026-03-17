# Feature: communit-ai, Property 4: Status transition after transcription
"""
Property 4: Status transition after transcription
Validates: Requirements 3.3

For any meeting that successfully completes transcription, the meeting's status
in the database should be updated to "transcribed" and the transcript text
should be returned.
"""
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from hypothesis import given, settings
from hypothesis import strategies as st


@given(st.text(min_size=1))
@settings(max_examples=100)
def test_status_transition_after_transcription(transcript_text: str) -> None:
    """After successful transcription, status is set to 'transcribed' and
    the return value equals the generated transcript text."""

    meeting_id = "test-meeting-123"
    audio_url = "audio/test-meeting-123.mp3"

    # Mock httpx response from Whisper API
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {"text": transcript_text}

    async def run():
        with patch("agent.steps.transcribe._download_audio", return_value=(b"audio_bytes", "mp3")), \
             patch("agent.steps.transcribe._upload_transcript") as mock_upload, \
             patch("agent.db.update_meeting_status", new_callable=AsyncMock) as mock_update_status, \
             patch("httpx.AsyncClient") as mock_client_cls:

            # Configure the async context manager for httpx.AsyncClient
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            from agent.steps.transcribe import transcribe
            result = await transcribe(meeting_id, audio_url)

        # Assert return value equals the generated transcript text
        assert result == transcript_text, (
            f"Expected transcript '{transcript_text}', got '{result}'"
        )

        # Assert update_meeting_status was called with (meeting_id, "transcribed")
        mock_update_status.assert_called_with(meeting_id, "transcribed")

    asyncio.run(run())
