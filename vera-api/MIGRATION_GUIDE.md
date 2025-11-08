# Database Migration Guide

## Apply Migrations to Production (Railway)

### Option 1: Railway CLI (Recommended)

```bash
# Connect to Railway
railway login

# Link to your project
railway link

# Run migration
railway run sh run_migration.sh
```

### Option 2: Railway Web Console

1. Go to Railway dashboard → Your project
2. Click on your service
3. Click "Settings" → "Deploy" section
4. Add a "Release Command" (runs before each deployment):
   ```
   alembic upgrade head
   ```
5. Redeploy the service

### Option 3: Manual SQL (If needed)

If you can't run Alembic migrations, connect to your Neon PostgreSQL database and run this SQL manually:

```sql
-- Add provider column
ALTER TABLE vera_conversations
ADD COLUMN provider VARCHAR(20);

-- Add ElevenLabs-specific columns
ALTER TABLE vera_conversations
ADD COLUMN elevenlabs_conversation_id VARCHAR(255);

ALTER TABLE vera_conversations
ADD COLUMN elevenlabs_message_id VARCHAR(255);

-- Set default value for existing rows
UPDATE vera_conversations
SET provider = 'openai'
WHERE provider IS NULL;
```

## Verify Migration

After running the migration, verify it worked:

```bash
# Check the alembic_version table
railway run psql $DATABASE_URL -c "SELECT * FROM alembic_version;"

# Should show: elevenlabs_001
```

## Local Development

To apply migrations locally:

```bash
cd vera-api
./run_migration.sh
```

Or manually:

```bash
cd vera-api
alembic upgrade head
```
