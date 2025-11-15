#!/usr/bin/env python3
"""
Test script to fetch a conversation from ElevenLabs and save to PostgreSQL
Usage: python test_transcript_sync.py CONVERSATION_ID RESEARCH_ID
"""

import sys
import os
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables FIRST before importing app modules
load_dotenv('/Users/david/GitHub/pad/vera-api/.env')

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'vera-api'))

from app.db.base import SessionLocal
from app.models.database import Conversation, ResearchID

def fetch_elevenlabs_transcript(conversation_id: str):
    """Fetch conversation transcript from ElevenLabs API"""
    api_key = os.getenv('ELEVENLABS_API_KEY')

    if not api_key:
        raise ValueError("ELEVENLABS_API_KEY not found in environment")

    url = f"https://api.elevenlabs.io/v1/convai/conversations/{conversation_id}"
    headers = {
        'xi-api-key': api_key
    }

    print(f"🔄 Fetching conversation: {conversation_id}")
    print(f"📡 URL: {url}")

    response = requests.get(url, headers=headers)

    if not response.ok:
        print(f"❌ Error: {response.status_code} - {response.text}")
        return None

    data = response.json()
    print(f"✅ Successfully fetched conversation")
    print(f"📊 Raw response keys: {data.keys()}")

    return data


def save_to_database(conversation_data: dict, research_id: str):
    """Save conversation messages to PostgreSQL"""
    db = SessionLocal()

    try:
        # Verify research ID exists
        research_user = db.query(ResearchID).filter(
            ResearchID.research_id == research_id
        ).first()

        if not research_user:
            print(f"❌ Research ID '{research_id}' not found in database")
            print("Available research IDs:")
            for rid in db.query(ResearchID).all():
                print(f"  - {rid.research_id}")
            return False

        print(f"\n✅ Found research user: {research_user.research_id} (ID: {research_user.id})")

        # Check if conversation has transcript
        if 'transcript' not in conversation_data:
            print(f"❌ No 'transcript' field in conversation data")
            print(f"Available fields: {conversation_data.keys()}")
            return False

        transcript = conversation_data['transcript']

        if not isinstance(transcript, list):
            print(f"❌ Transcript is not a list: {type(transcript)}")
            return False

        print(f"\n📝 Processing {len(transcript)} messages...")

        conversation_id = conversation_data.get('conversation_id', 'unknown')

        saved_count = 0
        skipped_count = 0

        for idx, message in enumerate(transcript, 1):
            print(f"\n--- Message {idx} ---")
            print(f"Message data: {message}")

            # Extract message details
            role = message.get('role', 'unknown')
            content = message.get('message') or message.get('text', '')
            message_id = message.get('id', f'msg_{idx}')
            timestamp = message.get('timestamp')

            if not content:
                print(f"⚠️  Skipping message {idx} - no content")
                skipped_count += 1
                continue

            # Convert timestamp
            if timestamp:
                try:
                    msg_timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                except:
                    msg_timestamp = datetime.utcnow()
            else:
                msg_timestamp = datetime.utcnow()

            # Check if message already exists
            existing = db.query(Conversation).filter(
                Conversation.elevenlabs_message_id == message_id,
                Conversation.elevenlabs_conversation_id == conversation_id
            ).first()

            if existing:
                print(f"⏭️  Message {idx} already exists (ID: {message_id})")
                skipped_count += 1
                continue

            # Create new conversation record
            conv_record = Conversation(
                research_id_fk=research_user.id,
                conversation_id=conversation_id,
                timestamp=msg_timestamp,
                role=role,
                content=content,
                provider='elevenlabs',
                elevenlabs_conversation_id=conversation_id,
                elevenlabs_message_id=message_id
            )

            db.add(conv_record)
            print(f"✅ Saved message {idx}: {role} - {content[:50]}...")
            saved_count += 1

        # Commit all changes
        db.commit()

        print(f"\n{'='*60}")
        print(f"✅ Successfully saved {saved_count} messages")
        print(f"⏭️  Skipped {skipped_count} messages (already existed or no content)")
        print(f"📊 Total processed: {len(transcript)}")
        print(f"{'='*60}")

        return True

    except Exception as e:
        print(f"\n❌ Error saving to database: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False

    finally:
        db.close()


def main():
    if len(sys.argv) < 3:
        print("Usage: python test_transcript_sync.py CONVERSATION_ID RESEARCH_ID")
        print("\nExample:")
        print("  python test_transcript_sync.py conv_4501ka4xdsp2f6j80ba7nmzfk8dx goofy-test")
        sys.exit(1)

    conversation_id = sys.argv[1]
    research_id = sys.argv[2]

    print("="*60)
    print("VERA Transcript Sync Test")
    print("="*60)
    print(f"Conversation ID: {conversation_id}")
    print(f"Research ID: {research_id}")
    print("="*60)

    # Fetch from ElevenLabs
    conversation_data = fetch_elevenlabs_transcript(conversation_id)

    if not conversation_data:
        print("\n❌ Failed to fetch conversation from ElevenLabs")
        sys.exit(1)

    # Save to database
    success = save_to_database(conversation_data, research_id)

    if success:
        print("\n✅ Test completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Test failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
