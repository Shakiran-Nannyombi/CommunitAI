import logging
from typing import Any, Callable

logger = logging.getLogger(__name__)


async def with_retry(fn: Callable, max_retries: int = 3) -> Any:
    """Retry an async callable up to max_retries times on exception.

    Logs each failed attempt. Re-raises the exception on the final failure.
    """
    for attempt in range(max_retries):
        try:
            return await fn()
        except Exception as exc:
            logger.warning(
                "Attempt %d/%d failed: %s", attempt + 1, max_retries, exc
            )
            if attempt == max_retries - 1:
                raise
