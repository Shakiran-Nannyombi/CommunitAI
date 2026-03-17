"""
Alembic environment configuration for CommunitAI backend.
Uses the async SQLAlchemy engine from backend/db.py and imports
metadata from backend/models/db.py for autogenerate support.
"""

import asyncio
import os
import sys
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# ---------------------------------------------------------------------------
# Make sure the backend package is importable when running alembic from the
# backend/ directory (e.g. `alembic -c alembic.ini upgrade head`).
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the shared Base so autogenerate can detect all mapped tables.
# models/db.py must import Base from db.py and define all ORM models.
from models.db import Base  # noqa: E402  (imported after sys.path manipulation)

# ---------------------------------------------------------------------------
# Alembic Config object — gives access to values in alembic.ini
# ---------------------------------------------------------------------------
config = context.config

# Override sqlalchemy.url with the DATABASE_URL environment variable when set.
database_url = os.environ.get("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging if present.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata object used by autogenerate.
target_metadata = Base.metadata


# ---------------------------------------------------------------------------
# Offline migrations (no live DB connection required)
# ---------------------------------------------------------------------------
def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    Configures the context with just a URL and not an Engine, so a DBAPI
    connection is never required.  Calls to context.execute() emit the given
    string to the script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# Online migrations (async engine)
# ---------------------------------------------------------------------------
def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Create an async engine and run migrations within a synchronous context."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode using the async engine."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
