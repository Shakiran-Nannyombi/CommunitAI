import logging

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from agent.config import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def update_meeting_status(meeting_id: str, status: str) -> None:
    """Update the status field of a meeting row in PostgreSQL."""
    async with AsyncSessionLocal() as session:
        await session.execute(
            text("UPDATE meetings SET status = :status WHERE id = :id"),
            {"status": status, "id": meeting_id},
        )
        await session.commit()
        logger.info("Meeting %s status updated to %s", meeting_id, status)
