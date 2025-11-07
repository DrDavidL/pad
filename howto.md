# VERA - How to Run and Deploy

## Local Development

### Prerequisites
- Python 3.10+
- Node.js 25+
- PostgreSQL database (or Neon cloud database)
- API Keys:
  - OpenAI API key
  - ElevenLabs API key
  - Groq API key (optional)

### Backend Setup (vera-api)

1. **Create and activate virtual environment:**
```bash
cd /Users/david/GitHub/pad
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. **Install dependencies:**
```bash
cd vera-api
pip install -r requirements.txt
```

3. **Configure environment variables:**
Create `.env` file in project root:
```env
DATABASE_URL=postgresql://user:password@localhost/vera
SECRET_KEY=your-secret-key-min-32-chars
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
ELEVENLABS_API_KEY=sk_...
ADMIN_PASSWORD=your-admin-password
CORS_ORIGINS=http://localhost:3000
```

4. **Run database migrations:**
```bash
alembic upgrade head
```

5. **Seed research IDs (optional):**
```bash
python scripts/seed_research_ids.py
```

6. **Start backend server:**
```bash
uvicorn app.main:app --reload --port 8000
```

Backend available at: http://localhost:8000
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

---

### Frontend Setup (vera-frontend)

1. **Install dependencies:**
```bash
cd vera-frontend
npm install
```

2. **Configure environment variables:**
Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/api/v1/chat/ws/chat
```

3. **Start development server:**
```bash
npm run dev
```

Frontend available at: http://localhost:3000

---

### Testing Locally

1. Open browser to http://localhost:3000
2. Enter research ID (e.g., RID001-RID010 if seeded)
3. Accept disclaimer
4. Start chatting with VERA
5. Audio should play automatically after first interaction

**Troubleshooting:**
- Check browser console for errors (F12)
- Check backend logs for TTS generation
- Verify WebSocket connection in Network tab
- Ensure microphone permissions granted for voice input

---

## Production Deployment

### Architecture
```
Vercel (Frontend) ←→ Railway (Backend) ←→ Neon (Database)
                ↓
         ElevenLabs (TTS)
         OpenAI (LLM)
```

---

### Backend Deployment (Railway)

#### Initial Setup

1. **Create Railway project:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `vera-api` repository
   - Set Root Directory to `vera-api`

2. **Configure environment variables:**
   Go to Variables tab and add:
   ```
   DATABASE_URL=postgresql://neondb_owner:xxx@ep-xxx.aws.neon.tech/neondb?sslmode=require
   SECRET_KEY=YOUR_SECRET_KEY_MIN_32_CHARS_HERE
   OPENAI_API_KEY=sk-proj-xxx
   GROQ_API_KEY=gsk_xxx
   ELEVENLABS_API_KEY=sk_YOUR_ELEVENLABS_API_KEY_HERE
   ADMIN_PASSWORD=your-admin-password
   CORS_ORIGINS=https://your-frontend.vercel.app
   RAILWAY_ENVIRONMENT=production
   ```

3. **Configure deployment:**
   - Railway should auto-detect Python
   - Start command (in railway.toml): `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health check path: `/health`

4. **Get Railway URL:**
   - After deployment, copy the public URL
   - Example: `https://vera-api-production.up.railway.app`
   - Note this URL for frontend configuration

#### Updating Backend

**Method 1: Git Push (Automatic)**
```bash
git add .
git commit -m "Update backend"
git push origin main
```
Railway auto-deploys on push to main branch.

**Method 2: Manual Redeploy**
- Go to Railway dashboard
- Click "Deploy" → "Redeploy"

**View Logs:**
- Railway dashboard → Deployments → View Logs
- Check for startup errors and TTS generation logs

---

### Frontend Deployment (Vercel)

#### Initial Setup

1. **Create Vercel project:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import from GitHub
   - Select `vera-frontend` repository
   - Root Directory: `vera-frontend`
   - Framework: Next.js (auto-detected)

2. **Configure environment variables:**
   Go to Settings → Environment Variables and add:
   ```
   NEXT_PUBLIC_API_URL=https://vera-api-production.up.railway.app/api/v1
   NEXT_PUBLIC_WS_URL=wss://vera-api-production.up.railway.app/api/v1/chat/ws/chat
   ```

   **Important:**
   - Use `https://` for API_URL
   - Use `wss://` (WebSocket Secure) for WS_URL
   - Replace with your actual Railway URL

3. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete

4. **Get Vercel URL:**
   - Copy the production URL
   - Example: `https://vera-frontend.vercel.app`
   - Add this URL to Railway CORS_ORIGINS

#### Updating Frontend

**Method 1: Git Push (Automatic)**
```bash
git add .
git commit -m "Update frontend"
git push origin main
```
Vercel auto-deploys on push to main branch.

**Method 2: Manual Redeploy**
- Go to Vercel dashboard
- Select deployment → Click "Redeploy"

**View Logs:**
- Vercel dashboard → Deployments → View Function Logs
- Check for build errors

---

### Post-Deployment Configuration

#### Update CORS Origins (Railway)
1. Get your Vercel production URL
2. Go to Railway → Variables
3. Update `CORS_ORIGINS`:
   ```
   CORS_ORIGINS=https://your-frontend.vercel.app
   ```
4. Redeploy backend

#### Update Frontend URLs (Vercel)
1. Get your Railway production URL
2. Go to Vercel → Settings → Environment Variables
3. Update both variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app/api/v1
   NEXT_PUBLIC_WS_URL=wss://your-backend.up.railway.app/api/v1/chat/ws/chat
   ```
4. Redeploy frontend

---

## Testing Production Deployment

### Checklist

#### 1. Backend Health
- [ ] Visit `https://your-backend.up.railway.app/health`
- [ ] Should return: `{"status": "healthy"}`

#### 2. Frontend Load
- [ ] Visit `https://your-frontend.vercel.app`
- [ ] Page should load without errors
- [ ] Open DevTools Console (F12)
- [ ] Should see "WebSocket connected successfully"

#### 3. Authentication Flow
- [ ] Enter valid research ID
- [ ] Accept disclaimer
- [ ] Should reach chat interface

#### 4. Chat Functionality
- [ ] Send a test message
- [ ] VERA should respond with streaming text
- [ ] Check console for "Generating TTS for response" (backend logs)
- [ ] Check console for "Received audio message" (frontend)

#### 5. Audio Playback
- [ ] Send message (triggers audio unlock)
- [ ] Check console for "Audio enabled successfully"
- [ ] Wait for VERA response
- [ ] Audio should play automatically
- [ ] Test 2-3 more messages to verify consistency

#### 6. WebSocket Connection
- [ ] Open DevTools → Network tab
- [ ] Filter by "WS" (WebSocket)
- [ ] Should see connection with Status 101
- [ ] Click on connection → Messages
- [ ] Should see message flow

---

## Debugging Production Issues

### No Audio in Production

**Symptoms:**
- Text appears but no audio plays
- Console shows "Audio playback failed"

**Debug Steps:**

1. **Check environment variables:**
   ```bash
   # Vercel
   vercel env ls

   # Railway (via dashboard or CLI)
   railway variables
   ```

2. **Check WebSocket connection:**
   - Open DevTools → Network → WS
   - Verify connection established (Status 101)
   - Check message flow for `type: "audio"`

3. **Check backend logs:**
   ```bash
   # Railway logs
   railway logs

   # Look for:
   # ✅ "Generating TTS for response"
   # ✅ "TTS generated successfully"
   # ❌ "TTS generation failed"
   ```

4. **Check browser console:**
   ```
   ✅ "WebSocket connected successfully"
   ✅ "Audio enabled successfully"
   ✅ "Received audio message: Audio data present"
   ❌ "Audio playback failed"
   ❌ "NotAllowedError: play() failed"
   ```

5. **Common fixes:**
   - Verify `ELEVENLABS_API_KEY` set in Railway
   - Verify `NEXT_PUBLIC_WS_URL` uses `wss://` not `ws://`
   - Verify CORS_ORIGINS includes Vercel URL
   - Clear browser cache and cookies
   - Try different browser (Chrome recommended)
   - Ensure user interacted with page first (click or type)

---

### CORS Errors

**Symptoms:**
- Console: "Access to XMLHttpRequest has been blocked by CORS policy"
- Console: "WebSocket connection failed"

**Fix:**
1. Check `CORS_ORIGINS` in Railway includes exact Vercel URL
2. No trailing slash: `https://app.vercel.app` not `https://app.vercel.app/`
3. Include protocol: `https://` not just `app.vercel.app`
4. Redeploy backend after updating

---

### WebSocket Won't Connect

**Symptoms:**
- "WebSocket disconnected" repeatedly
- Network tab shows failed WS connection

**Fix:**
1. Verify `NEXT_PUBLIC_WS_URL` uses `wss://` (not `ws://`)
2. Verify Railway backend is running (check health endpoint)
3. Check Railway logs for WebSocket errors
4. Verify no firewall/proxy blocking WebSocket

---

### Build Failures

**Backend (Railway):**
```bash
# Check requirements.txt has all dependencies
pip freeze > requirements.txt

# Verify Python version in runtime.txt (if used)
python-3.11.0
```

**Frontend (Vercel):**
```bash
# Check package.json and package-lock.json in sync
npm install

# Test build locally
npm run build

# Check Next.js version compatibility
npm ls next
```

---

## Monitoring and Maintenance

### Regular Checks
- [ ] Backend health endpoint responding
- [ ] Database connection working
- [ ] ElevenLabs API quota and usage
- [ ] OpenAI API quota and usage
- [ ] Error logs in Railway
- [ ] Build logs in Vercel

### Cost Monitoring
- **Railway:** Check usage and billing
- **Vercel:** Check bandwidth and function invocations
- **Neon:** Check database storage and connections
- **ElevenLabs:** Check character usage (charged per character)
- **OpenAI:** Check token usage

### Security
- [ ] Rotate API keys quarterly
- [ ] Review CORS origins
- [ ] Check for dependency updates
- [ ] Review access logs for suspicious activity
- [ ] Ensure SECRET_KEY not exposed

---

## Useful Commands

### Local Development
```bash
# Backend
cd vera-api
source ../.venv/bin/activate
uvicorn app.main:app --reload

# Frontend
cd vera-frontend
npm run dev

# Database
alembic upgrade head  # Run migrations
alembic revision --autogenerate -m "message"  # Create migration

# Testing
pytest  # Backend tests
npm test  # Frontend tests
```

### Production
```bash
# View Railway logs
railway logs --follow

# View Vercel logs
vercel logs [deployment-url]

# Redeploy
git push origin main  # Auto-deploys both platforms

# Force redeploy
vercel --prod  # Frontend
railway up  # Backend
```

---

## URLs and Resources

### Documentation
- [Railway Docs](https://docs.railway.app/)
- [Vercel Docs](https://vercel.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)

### API Documentation
- [ElevenLabs API](https://elevenlabs.io/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [Groq API](https://console.groq.com/docs)

### Dashboards
- Railway: https://railway.app/dashboard
- Vercel: https://vercel.com/dashboard
- Neon: https://console.neon.tech/
- ElevenLabs: https://elevenlabs.io/app
- OpenAI: https://platform.openai.com/

---

## Support

### Getting Help
1. Check browser console for errors
2. Check Railway logs for backend errors
3. Review [plan.md](plan.md) for troubleshooting
4. Check [decisions.md](decisions.md) for architecture context

### Known Issues
- Audio requires first user interaction (browser policy - expected)
- Safari may have stricter autoplay policies than Chrome
- WebSocket connection requires `wss://` in production

### Contact
- Project repository: [GitHub link]
- Documentation: This repo's markdown files
