-- Fix Alembic version tracking on Neon database
-- Run this in the Neon SQL Editor: https://console.neon.tech/

-- Step 1: Create alembic_version table if it doesn't exist
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Step 2: Clear any existing version and set to base migration
DELETE FROM alembic_version;
INSERT INTO alembic_version (version_num) VALUES ('39bc126e2b3a');

-- Step 3: Add missing columns to vera_conversations
ALTER TABLE vera_conversations
ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'openai';

ALTER TABLE vera_conversations
ADD COLUMN IF NOT EXISTS elevenlabs_conversation_id VARCHAR(255);

ALTER TABLE vera_conversations
ADD COLUMN IF NOT EXISTS elevenlabs_message_id VARCHAR(255);

-- Step 4: Update to latest migration version
UPDATE alembic_version SET version_num = '694a65473b3d';

-- Verify the fix
SELECT version_num FROM alembic_version;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'vera_conversations'
  AND column_name IN ('provider', 'elevenlabs_conversation_id', 'elevenlabs_message_id');
