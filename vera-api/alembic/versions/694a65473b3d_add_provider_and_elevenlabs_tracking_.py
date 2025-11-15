"""Add provider and elevenlabs tracking columns

Revision ID: 694a65473b3d
Revises: 39bc126e2b3a
Create Date: 2025-11-15 17:35:50.085487

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '694a65473b3d'
down_revision = '39bc126e2b3a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add provider column
    op.execute("""
        ALTER TABLE vera_conversations
        ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'openai'
    """)

    # Add ElevenLabs tracking columns
    op.execute("""
        ALTER TABLE vera_conversations
        ADD COLUMN IF NOT EXISTS elevenlabs_conversation_id VARCHAR(255)
    """)

    op.execute("""
        ALTER TABLE vera_conversations
        ADD COLUMN IF NOT EXISTS elevenlabs_message_id VARCHAR(255)
    """)


def downgrade() -> None:
    # Remove columns in reverse order
    op.execute("ALTER TABLE vera_conversations DROP COLUMN IF EXISTS elevenlabs_message_id")
    op.execute("ALTER TABLE vera_conversations DROP COLUMN IF EXISTS elevenlabs_conversation_id")
    op.execute("ALTER TABLE vera_conversations DROP COLUMN IF EXISTS provider")
