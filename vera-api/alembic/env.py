from logging.config import fileConfig
from sqlalchemy import engine_from_config, text
from sqlalchemy import pool
from alembic import context
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.db.base import Base
from app.models.database import ResearchID, UserSession, DisclaimerAcknowledgment, Conversation
from app.core.config import get_settings

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Get database URL from settings
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# add your model's MetaData object here for 'autogenerate' support
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Clean up orphaned alembic_version entries before running migrations
        try:
            result = connection.execute(text(
                "SELECT version_num FROM alembic_version WHERE version_num IN ('39bc126e2b3a', 'elevenlabs_001')"
            ))
            orphaned = result.fetchone()
            if orphaned:
                print(f"🧹 Found orphaned revision: {orphaned[0]}, cleaning up...")
                connection.execute(text("DELETE FROM alembic_version WHERE version_num IN ('39bc126e2b3a', 'elevenlabs_001')"))
                connection.commit()
                print("✅ Cleaned up orphaned revisions")
        except Exception as e:
            print(f"ℹ️  Alembic version cleanup: {e}")

        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
