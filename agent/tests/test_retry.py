# Feature: communit-ai, Property 5: Retry exhaustion produces failed status
"""
Property 5: Retry exhaustion produces failed status
Validates: Requirements 3.4, 5.5, 6.6

For any processing step (transcription, sentiment, summarization) where the
external API consistently returns errors, after exactly 3 retry attempts the
with_retry helper raises and no further calls are made.
"""
import asyncio
from unittest.mock import AsyncMock

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from agent.utils import with_retry


@given(st.sampled_from(["transcription", "sentiment", "summarization"]))
@settings(max_examples=20)
def test_retry_exhaustion(step_name: str) -> None:
    """After exactly 3 failures, with_retry raises and makes no further calls."""
    call_count = 0

    async def always_fails():
        nonlocal call_count
        call_count += 1
        raise RuntimeError(f"{step_name} step failed")

    async def run():
        nonlocal call_count
        call_count = 0
        with pytest.raises(RuntimeError):
            await with_retry(always_fails, max_retries=3)
        assert call_count == 3, (
            f"Expected exactly 3 calls for '{step_name}', got {call_count}"
        )

    asyncio.run(run())
