"""
Seed script to create initial test research IDs
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.base import SessionLocal
from app.models.database import ResearchID


def seed_research_ids():
    """Create initial test research IDs"""
    db = SessionLocal()

    test_ids = [
        ("RID001", "Test research ID 001"),
        ("RID002", "Test research ID 002"),
        ("RID003", "Test research ID 003"),
        ("RID004", "Test research ID 004"),
        ("RID005", "Test research ID 005"),
        ("RID006", "Test research ID 006"),
        ("RID007", "Test research ID 007"),
        ("RID008", "Test research ID 008"),
        ("RID009", "Test research ID 009"),
        ("RID010", "Test research ID 010"),
    ]

    created_count = 0
    skipped_count = 0

    for research_id, notes in test_ids:
        # Check if already exists
        existing = db.query(ResearchID).filter(
            ResearchID.research_id == research_id
        ).first()

        if existing:
            print(f"⏭️  Skipped {research_id} (already exists)")
            skipped_count += 1
            continue

        # Create new research ID
        new_rid = ResearchID(
            research_id=research_id,
            notes=notes,
            is_active=True
        )
        db.add(new_rid)
        created_count += 1
        print(f"✅ Created {research_id}")

    db.commit()
    db.close()

    print(f"\n{'='*50}")
    print(f"Created: {created_count} research IDs")
    print(f"Skipped: {skipped_count} (already existed)")
    print(f"Total: {created_count + skipped_count}")
    print(f"{'='*50}\n")


if __name__ == "__main__":
    print("Seeding research IDs...\n")
    try:
        seed_research_ids()
        print("✅ Seeding completed successfully!")
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        sys.exit(1)
