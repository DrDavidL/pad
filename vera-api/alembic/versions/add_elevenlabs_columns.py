"""add elevenlabs provider columns

Revision ID: elevenlabs_001
Revises: 39bc126e2b3a
Create Date: 2025-11-08 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'elevenlabs_001'
down_revision = '39bc126e2b3a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add provider column
    op.add_column('vera_conversations', sa.Column('provider', sa.String(length=20), nullable=True))

    # Add ElevenLabs-specific columns
    op.add_column('vera_conversations', sa.Column('elevenlabs_conversation_id', sa.String(length=255), nullable=True))
    op.add_column('vera_conversations', sa.Column('elevenlabs_message_id', sa.String(length=255), nullable=True))

    # Set default value for existing rows
    op.execute("UPDATE vera_conversations SET provider = 'openai' WHERE provider IS NULL")


def downgrade() -> None:
    # Remove columns
    op.drop_column('vera_conversations', 'elevenlabs_message_id')
    op.drop_column('vera_conversations', 'elevenlabs_conversation_id')
    op.drop_column('vera_conversations', 'provider')
