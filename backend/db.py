"""
Async SQLAlchemy engine, session factory, and FastAPI dependency for database access.
DATABASE_URL must be an async-compatible URL, e.g. postgresql+asyncpg://...
"""

import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://localhost/communitai")

engine = create_async_engine(DATABASE_URL, echo=False, future=True)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session."""
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
