# VERA Project Documentation

This file contains important project-specific guidelines and procedures for the VERA (Voice-Enabled Research Assistant) project.

## Project Structure

This is a monorepo containing:
- **vera-api/** - FastAPI backend (deployed on Railway)
- **vera-frontend/** - Next.js frontend (deployed on Vercel)

## Research ID Management

### How Research IDs Work

Research IDs are managed through a database-driven system:

1. **Environment Variable** (`RESEARCH_IDS`) - Comma-separated list in Railway environment
2. **Database** - IDs must be added to `vera_research_ids` table in PostgreSQL
3. **Validation** - Frontend validates IDs by calling backend API, which checks the database

### Adding New Research IDs

**CRITICAL: This is a multi-step process that must be completed for new IDs to work!**

#### Step 1: Update Railway Environment Variable
1. Go to Railway dashboard → Vera project → Variables
2. Add or update `RESEARCH_IDS` with your new IDs (comma-separated)
   - Example: `VSLZSMV-01,2RQH8R6-02,goofy-test`
3. Save the changes

#### Step 2: Seed the Database
After updating the environment variable, you **MUST** seed the database:

**Option A: Using the Admin API Endpoint (Recommended)**
```bash
# Use the provided script
./seed_railway.sh https://YOUR-RAILWAY-URL

# Or use curl directly
curl -X POST https://YOUR-RAILWAY-URL/api/v1/admin/seed-research-ids \
  -H "Content-Type: application/json" \
  -d '{"password": "YOUR_ADMIN_PASSWORD"}'
```

**Option B: Using the Seed Script (if you have Railway CLI)**
```bash
cd vera-api
railway run python scripts/seed_research_ids.py
```

#### Step 3: Verify
Check your PostgreSQL database to confirm the IDs were added to `vera_research_ids` table.

### Important Notes

- **Frontend does NOT need RESEARCH_IDS** - It only needs the API URL
- All validation happens in the backend via database lookups
- The seed endpoint is idempotent (safe to run multiple times - skips existing IDs)
- IDs are NOT added automatically on deployment - you must run the seed step manually

## Environment Variables

### Backend (Railway)
Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret key
- `OPENAI_API_KEY` - OpenAI API key
- `GROQ_API_KEY` - Groq API key
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `ADMIN_PASSWORD` - Admin password for protected endpoints
- `RESEARCH_IDS` - Comma-separated list of valid research participant IDs
- `CORS_ORIGINS` - Comma-separated list of allowed origins

### Frontend (Vercel)
Required variables:
- `NEXT_PUBLIC_API_URL` - Backend API URL (e.g., `https://pad-production.up.railway.app/api/v1`)
- `NEXT_PUBLIC_ELEVENLABS_API_KEY` - ElevenLabs API key (for transcript fetching)
- `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` - ElevenLabs agent ID

## Deployment

### Backend (Railway)
- Auto-deploys on push to main branch
- Runs database migrations automatically via Alembic
- **Remember to seed research IDs after updating environment variables!**

### Frontend (Vercel)
- Auto-deploys on push to main branch
- Build command: `cd vera-frontend && npm run build`
- No additional steps needed

## Database

### Running Migrations (Backend)

When you add new models or modify existing ones:

```bash
# Create a new migration
cd vera-api
source ../.venv/bin/activate
alembic revision --autogenerate -m "Description of changes"

# Review the migration file in vera-api/alembic/versions/

# Apply migrations locally
alembic upgrade head

# On Railway, migrations run automatically on deployment
```

### Important Tables

- `vera_research_ids` - Valid research participant IDs
- `vera_user_sessions` - User login sessions
- `vera_disclaimer_acknowledgments` - Disclaimer acceptance records
- `vera_conversations` - All chat messages (voice and text)

## ElevenLabs Widget

The frontend uses ElevenLabs Conversational AI Widget for voice and text input:

- Widget appears in bottom-right corner
- Supports both voice AND text input
- Conversations are synced to database every 5 seconds during active conversation
- Transcripts are fetched from ElevenLabs API and saved to PostgreSQL

### Troubleshooting Widget Issues

If widget doesn't load:
- Check browser console for errors
- Verify `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` is set correctly
- Chrome requires hardware acceleration enabled (Safari is more reliable)
- Check that WebGL is enabled (chrome://gpu)

## Common Issues

### "Loading VERA" hangs
- This was caused by React hooks being called before function definitions
- Fixed by using `React.useCallback` at top of component
- See commit: "Fix widget loading issue by removing duplicate function definitions"

### Messages not saving to database
- Widget events may not fire reliably
- Solution: Periodic transcript fetching every 5 seconds during conversation
- Fetches from ElevenLabs API instead of relying on widget events

### Research ID not working
- **Most common issue:** Forgot to run seed script after updating environment variable
- Check that ID exists in `vera_research_ids` table
- Verify ID is marked as `is_active = true`

## Security Notes

- Never commit `.env` files (already in `.gitignore`)
- Admin password required for all admin endpoints
- Research IDs should be kept confidential
- JWT tokens expire after 24 hours (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)

## Testing Locally

### Backend
```bash
cd vera-api
source ../.venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd vera-frontend
npm run dev
```

Access at: http://localhost:3000

## Useful Commands

### Check Railway deployment status
```bash
cd vera-api
railway status
```

### View Railway logs
```bash
railway logs
```

### Seed research IDs on Railway
```bash
./seed_railway.sh https://YOUR-RAILWAY-URL
```

## Architecture Decisions

### Why polling instead of events for message syncing?
The ElevenLabs widget's custom events (`elevenlabs-message`, etc.) were not firing reliably. Switched to polling the ElevenLabs Conversations API every 5 seconds during active conversations, with incremental syncing to avoid duplicates.

### Why database validation instead of frontend list?
Security and centralization. Research IDs are sensitive, and validation should happen server-side. This also makes it easier to add/remove IDs without redeploying the frontend.

### Why separate seed step instead of auto-seed on startup?
- Prevents unnecessary database queries on every deployment
- Gives explicit control over when IDs are added
- Avoids race conditions during startup
- Database persists between deployments, so seeding only needed when IDs change
