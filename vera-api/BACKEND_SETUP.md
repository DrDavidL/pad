# Backend Setup for ElevenLabs Integration

## Overview

The backend has been updated to support saving messages from both ElevenLabs and OpenAI frontends.

## Changes Made

### 1. Database Model Updates
**File:** `app/models/database.py`

Added three new columns to the `vera_conversations` table:
- `provider` (String) - Tracks whether message is from 'elevenlabs' or 'openai'
- `elevenlabs_conversation_id` (String) - ElevenLabs conversation ID
- `elevenlabs_message_id` (String) - ElevenLabs message ID

### 2. New Schemas
**File:** `app/schemas/conversation.py`

Added:
- `MessageSaveRequest` - Request schema for saving messages from frontend
- `MessageSaveResponse` - Response schema confirming message saved

### 3. New Endpoint
**File:** `app/api/endpoints/chat.py`

Added: `POST /api/v1/chat/save-message`

**Purpose:** Saves individual messages from the frontend to the database

**Request Body:**
```json
{
  "research_id": "RID001",
  "role": "user",
  "content": "What is PAD?",
  "timestamp": "2025-01-08T16:00:00Z",
  "provider": "elevenlabs",
  "elevenlabs_conversation_id": "conv_abc123",
  "elevenlabs_message_id": "msg_xyz789"
}
```

**Response:**
```json
{
  "success": true,
  "message_id": 123,
  "timestamp": "2025-01-08T16:00:00+00:00"
}
```

### 4. Database Migration
**File:** `alembic/versions/001_add_elevenlabs_fields.py`

Created migration to add the new columns to the database.

## Setup Instructions

### Step 1: Activate Virtual Environment

```bash
cd vera-api
source ../.venv/bin/activate  # or wherever your venv is
```

### Step 2: Run the Migration

```bash
# Run the migration to add new columns
alembic upgrade head
```

**Expected Output:**
```
INFO  [alembic.runtime.migration] Running upgrade  -> 001, Add ElevenLabs tracking fields
```

### Step 3: Verify Migration

Check that the columns were added:

```bash
# If using SQLite
sqlite3 vera.db "PRAGMA table_info(vera_conversations);"

# Or if using PostgreSQL
psql -d vera_db -c "\d vera_conversations"
```

You should see three new columns:
- `provider`
- `elevenlabs_conversation_id`
- `elevenlabs_message_id`

### Step 4: Restart the API Server

```bash
# If running with uvicorn
uvicorn app.main:app --reload --port 8000
```

### Step 5: Test the Endpoint

```bash
# Get a token first
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"research_id": "RID001"}'

# Use the token to test the save-message endpoint
curl -X POST http://localhost:8000/api/v1/chat/save-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "research_id": "RID001",
    "role": "user",
    "content": "Test message from ElevenLabs",
    "timestamp": "2025-01-08T16:00:00Z",
    "provider": "elevenlabs",
    "elevenlabs_conversation_id": "conv_test123",
    "elevenlabs_message_id": "msg_test456"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message_id": 1,
  "timestamp": "2025-01-08T16:00:00+00:00"
}
```

## Troubleshooting

### Migration Fails

**Error:** `FAILED: Can't locate revision identified by '001'`

**Solution:**
```bash
# Check alembic current version
alembic current

# If no version, stamp the database
alembic stamp head

# Try upgrade again
alembic upgrade head
```

### Column Already Exists

**Error:** `column "provider" of relation "vera_conversations" already exists`

**Solution:** The migration already ran. Skip to testing.

### Import Errors

**Error:** `ModuleNotFoundError: No module named 'app'`

**Solution:** Make sure you're in the vera-api directory and venv is activated:
```bash
cd vera-api
source ../.venv/bin/activate
python -c "import app; print('OK')"
```

## Verifying Frontend Integration

Once the backend is running:

1. **Start the frontend:**
   ```bash
   cd vera-frontend
   npm run dev
   ```

2. **Open browser console** (F12)

3. **Send a message** in ElevenLabs mode

4. **Look for these logs:**
   ```
   Syncing message to backend: { research_id: "...", role: "...", content: "..." }
   Message synced successfully
   ```

5. **Check the database:**
   ```bash
   sqlite3 vera.db "SELECT * FROM vera_conversations ORDER BY id DESC LIMIT 5;"
   ```

   You should see messages with `provider = 'elevenlabs'` and populated `elevenlabs_conversation_id` and `elevenlabs_message_id` fields.

## Data Analysis

### Query ElevenLabs vs OpenAI Messages

```sql
-- Count messages by provider
SELECT provider, COUNT(*) as message_count
FROM vera_conversations
GROUP BY provider;

-- Get all ElevenLabs conversations
SELECT DISTINCT elevenlabs_conversation_id, COUNT(*) as message_count
FROM vera_conversations
WHERE provider = 'elevenlabs'
GROUP BY elevenlabs_conversation_id;

-- Compare message lengths by provider
SELECT
  provider,
  AVG(LENGTH(content)) as avg_length,
  COUNT(*) as total_messages
FROM vera_conversations
GROUP BY provider;
```

## Rollback

If you need to remove the new columns:

```bash
alembic downgrade -1
```

This will remove the `provider`, `elevenlabs_conversation_id`, and `elevenlabs_message_id` columns.

## Next Steps

- [ ] Test with real ElevenLabs conversations
- [ ] Verify conversation continuity across sessions
- [ ] Add indexes if needed for performance
- [ ] Consider adding conversation metadata table
- [ ] Export ElevenLabs conversation transcripts for analysis
