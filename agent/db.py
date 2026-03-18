"""
Async SQLAlchemy engine, session factory, and DB helpers for the CommunitAI agent.
DATABASE_URL must be an async-compatible URL, e.g. postgresql+asyncpg://...
"""

from sqlalchemy import Column, String, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from agent.config import settings


engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

# Alias for backwards compatibility
AsyncSessionLocal = SessionLocal


class Base(DeclarativeBase):
    """Shared declarative base for agent ORM models."""
    pass


class Meeting(Base):
    """Minimal ORM model for updating meeting status from the agent."""
    __tablename__ = "meetings"

    id = Column(String, primary_key=True)
    status = Column(String, nullable=False)


async def update_meeting_status(meeting_id: str, status: str) -> None:
    """Update the status field of a meeting row by its ID."""
    async with SessionLocal() as session:
        await session.execute(
            text("UPDATE meetings SET status = :status WHERE id = :id"),
            {"status": status, "id": meeting_id},
        )
        await session.commit()
