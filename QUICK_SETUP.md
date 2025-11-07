# VERA - Quick Setup Reference

## For Vercel Deployment (Production)

### Step 1: Add Environment Variables
Go to: https://vercel.com → Your Project → Settings → Environment Variables

Add these **3 variables** (check all environments):

```
NEXT_PUBLIC_API_URL = https://your-backend.railway.app/api/v1
NEXT_PUBLIC_WS_URL = wss://your-backend.railway.app/api/v1/chat/ws/chat
NEXT_PUBLIC_ELEVENLABS_AGENT_ID = your_agent_id_here
```

### Step 2: Redeploy
Deployments → Latest → "..." → Redeploy

### Step 3: Test
Open your Vercel URL → F12 Console → Should see "Agent ID configured: Yes"

---

## For Local Development

### On This Machine
```bash
cd vera-frontend
# .env.local already exists with correct values
npm run dev
```

### On Your Other Machine
```bash
cd vera-frontend
cp .env.local.example .env.local
# Edit .env.local and fill in values
npm install
npm run dev
```

---

## Backend Setup (One Time)

```bash
cd vera-api
source ../.venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

---

## Testing Checklist

### Frontend (Vercel or Local)
- [ ] Can login with research ID
- [ ] See toggle button: "⚡ ElevenLabs" or "🤖 OpenAI"
- [ ] ElevenLabs mode: Click phone → "Agent ID configured: Yes"
- [ ] OpenAI mode: Send message → Gets response

### Backend (Railway or Local)
- [ ] Can access `/docs` endpoint
- [ ] Migration ran successfully
- [ ] No errors in logs
- [ ] Can POST to `/api/v1/chat/save-message`

---

## Quick Debugging

**"Failed to start conversation"**
1. Check console: "Agent ID configured: Yes"?
2. If "No": Add env var + Redeploy
3. If "Yes": Check ElevenLabs agent is published

**Backend 404 on save-message**
1. Run migration: `alembic upgrade head`
2. Restart API server

**WebSocket not connecting**
1. Check URL uses `wss://` (not `ws://`) in production
2. Backend must be running

---

## Important Files

- `vera-frontend/.env.local` - Local environment variables (gitignored)
- `vera-frontend/.env.local.example` - Template for setup
- `vera-frontend/VERCEL_DEPLOYMENT.md` - Full Vercel guide
- `vera-frontend/DEBUGGING_ELEVENLABS.md` - Frontend debugging
- `vera-api/BACKEND_SETUP.md` - Backend setup guide

---

## Support Links

- ElevenLabs Dashboard: https://elevenlabs.io/app/conversational-ai
- Vercel Dashboard: https://vercel.com
- Railway Dashboard: https://railway.app

---

## Common Issues

| Issue | Solution |
|-------|----------|
| "Agent ID not configured" | Add `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` → Redeploy |
| "Failed to start conversation" | Publish agent on ElevenLabs dashboard |
| Backend 404 | Run `alembic upgrade head` |
| WebSocket fails | Use `wss://` not `ws://` |
| Env vars not working | Hard refresh (Cmd+Shift+R) after redeploy |
