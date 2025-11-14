#!/usr/bin/env python3
"""
Fix Alembic version table by removing invalid revision references.
Run this script before migrations to clean up orphaned revision entries.
"""
import os
import sys
from sqlalchemy import create_engine, text

# Add parent directory to path
sys.path.append(os.path.dirname(__file__))

from app.core.config import get_settings

def fix_alembic_version():
    """Remove invalid revision from alembic_version table"""
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        # Check if alembic_version table exists
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'alembic_version'
            );
        """))
        table_exists = result.scalar()

        if not table_exists:
            print("✅ No alembic_version table found - this is a fresh database")
            return

        # Check current version
        result = conn.execute(text("SELECT version_num FROM alembic_version;"))
        current_version = result.scalar()
        print(f"📊 Current Alembic version: {current_version}")

        # Remove invalid revision if present
        if current_version == '39bc126e2b3a' or current_version == 'elevenlabs_001':
            print(f"🧹 Removing invalid revision: {current_version}")
            conn.execute(text("DELETE FROM alembic_version;"))
            conn.commit()
            print("✅ Cleaned up alembic_version table")
        else:
            print(f"✅ Version is valid or table is empty")

if __name__ == "__main__":
    try:
        fix_alembic_version()
        print("✅ Alembic version table fixed successfully")
    except Exception as e:
        print(f"❌ Error fixing alembic version: {e}")
        sys.exit(1)
