"""add slack_webhook_url to workspaces

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-17 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "workspaces",
        sa.Column("slack_webhook_url", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("workspaces", "slack_webhook_url")
