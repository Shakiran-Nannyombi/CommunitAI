"""Retry helper for agent pipeline steps."""


async def with_retry(fn, max_retries: int = 3):
    last_exc = None
    for attempt in range(max_retries):
        try:
            return await fn()
        except Exception as exc:
            last_exc = exc
    raise last_exc
