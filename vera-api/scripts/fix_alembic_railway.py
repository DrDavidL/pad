#!/usr/bin/env python3
"""
Fix Alembic version tracking on Railway
Run this once to mark the database as being at the correct migration version
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import text
from app.db.base import SessionLocal

def fix_alembic_version():
    """Stamp the database with the current migration version"""
    db = SessionLocal()

    try:
        # Check if alembic_version table exists
        result = db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'alembic_version'
            )
        """))
        table_exists = result.scalar()

        if not table_exists:
            print("Creating alembic_version table...")
            db.execute(text("""
                CREATE TABLE alembic_version (
                    version_num VARCHAR(32) NOT NULL,
                    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
                )
            """))
            db.commit()
            print("✅ Created alembic_version table")

        # Check current version
        result = db.execute(text("SELECT version_num FROM alembic_version"))
        current_version = result.scalar()

        if current_version:
            print(f"Current Alembic version: {current_version}")
        else:
            print("No Alembic version set")

        # Set to base migration
        if not current_version or current_version != '39bc126e2b3a':
            print("Setting Alembic version to 39bc126e2b3a (base migration)...")
            db.execute(text("DELETE FROM alembic_version"))
            db.execute(text("INSERT INTO alembic_version (version_num) VALUES ('39bc126e2b3a')"))
            db.commit()
            print("✅ Set Alembic version to 39bc126e2b3a")

        # Now add the missing columns if they don't exist
        print("\nAdding missing columns to vera_conversations...")

        db.execute(text("""
            ALTER TABLE vera_conversations
            ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'openai'
        """))
        print("✅ Added provider column")

        db.execute(text("""
            ALTER TABLE vera_conversations
            ADD COLUMN IF NOT EXISTS elevenlabs_conversation_id VARCHAR(255)
        """))
        print("✅ Added elevenlabs_conversation_id column")

        db.execute(text("""
            ALTER TABLE vera_conversations
            ADD COLUMN IF NOT EXISTS elevenlabs_message_id VARCHAR(255)
        """))
        print("✅ Added elevenlabs_message_id column")

        db.commit()

        # Update alembic version to latest
        print("\nUpdating Alembic version to 694a65473b3d (latest)...")
        db.execute(text("UPDATE alembic_version SET version_num = '694a65473b3d'"))
        db.commit()
        print("✅ Updated Alembic version to 694a65473b3d")

        print("\n" + "="*60)
        print("✅ Database migration fixed successfully!")
        print("="*60)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        sys.exit(1)

    finally:
        db.close()

if __name__ == "__main__":
    print("="*60)
    print("Fixing Alembic Migration Version on Railway")
    print("="*60)
    fix_alembic_version()
