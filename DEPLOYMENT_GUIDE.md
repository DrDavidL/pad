# VERA Deployment Guide - CI/CD with Vercel & Railway

Complete guide to deploy VERA frontend and backend with automatic CI/CD from GitHub.

## Overview

- **Frontend**: Vercel (Next.js)
- **Backend**: Railway (FastAPI + PostgreSQL)
- **Database**: Neon PostgreSQL (already configured)
- **CI/CD**: Automatic deployment on git push

**Estimated Cost**: $5-10/month
**Setup Time**: 15-20 minutes

---

## Part 1: Deploy Backend to Railway

### Step 1: Sign Up for Railway

1. Go to [railway.app](https://railway.app)
2. Click "Login" → "Login with GitHub"
3. Authorize Railway to access your GitHub account

### Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository: `pad`
4. Railway will auto-detect the Python app

### Step 3: Configure Service

1. Click on the service that was created
2. Go to "Settings" tab
3. **IMPORTANT - Root Directory**: Set to `vera-api`
   - This ensures Railway builds the FastAPI app, not the Streamlit app
4. **Builder**: Should auto-detect "railpack" (Python)
5. **Start Command**: Auto-detected from `railpack.toml`
   - If not set: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. **Health Check Path**: `/health`

### Step 4: Add Environment Variables

In Railway dashboard → Variables tab, add these:

```env
# Database (use your existing Neon connection)
DATABASE_URL=postgresql://[your-neon-connection-string]

# Security
SECRET_KEY=vera-secret-key-change-in-production-use-long-random-string

# API Keys
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
ELEVENLABS_API_KEY=sk_...

# Admin
ADMIN_PASSWORD=your-secure-admin-password

# CORS (will update after Vercel deployment)
CORS_ORIGINS=http://localhost:3000
```

### Step 5: Deploy

1. Click "Deploy" (Railway will build and deploy automatically)
2. Wait 2-3 minutes for build to complete
3. Once deployed, note your Railway URL: `https://your-app.up.railway.app`

### Step 6: Test Backend

```bash
curl https://your-app.up.railway.app/health
# Should return: {"status":"healthy"}
```

### Step 7: Enable CI/CD

Railway automatically enables CI/CD! Every push to your `main` branch will trigger a new deployment.

**Settings → Service → Deploy**:
- ✅ Watch Paths: `vera-api/**`
- ✅ Auto Deploy: Enabled
- ✅ Branch: main

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Sign Up for Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" → "Continue with GitHub"
3. Authorize Vercel to access your GitHub account

### Step 2: Import Project

1. Click "Add New..." → "Project"
2. Import your GitHub repository: `pad`
3. Vercel will auto-detect Next.js

### Step 3: Configure Build Settings

**Framework Preset**: Next.js (auto-detected)
**Root Directory**: `vera-frontend`
**Build Command**: `npm run build`
**Output Directory**: `.next` (default)
**Install Command**: `npm install`

### Step 4: Add Environment Variables

Before deploying, add these environment variables:

```env
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app/api/v1
NEXT_PUBLIC_WS_URL=wss://your-app.up.railway.app/api/v1/chat/ws/chat
```

**Replace `your-app.up.railway.app` with your actual Railway URL!**

### Step 5: Deploy

1. Click "Deploy"
2. Wait 2-3 minutes for build
3. Vercel will give you a URL: `https://your-app.vercel.app`

### Step 6: Update Backend CORS

Go back to Railway and update the `CORS_ORIGINS` variable:

```env
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

Railway will automatically redeploy with the new CORS settings.

### Step 7: Test Frontend

1. Open `https://your-app.vercel.app`
2. Enter Research ID: `RID001`
3. Acknowledge disclaimer
4. Chat with VERA!

### Step 8: Enable CI/CD

Vercel automatically enables CI/CD! Settings are at:

**Project Settings → Git**:
- ✅ Production Branch: `main`
- ✅ Auto Deploy: Enabled
- ✅ Build Command: `npm run build`

---

## Part 3: Custom Domain (Optional)

### For Frontend (Vercel)

1. Go to Project Settings → Domains
2. Add your domain (e.g., `vera.yourdomain.com`)
3. Follow DNS instructions (add CNAME record)
4. Vercel auto-provisions SSL certificate

### For Backend (Railway)

1. Go to Service Settings → Networking
2. Click "Generate Domain" or add custom domain
3. Add CNAME record to your DNS
4. Railway auto-provisions SSL certificate

---

## CI/CD Workflow

Once set up, your workflow is:

```bash
# 1. Make changes locally
cd /Users/david/GitHub/pad
# ... edit files ...

# 2. Commit changes
git add .
git commit -m "Update feature X"

# 3. Push to GitHub
git push origin main

# 4. Automatic deployments trigger!
# - Railway deploys backend (if vera-api/ changed)
# - Vercel deploys frontend (if vera-frontend/ changed)
# - Takes 2-3 minutes
```

**You can monitor deployments**:
- Railway: Dashboard shows build logs
- Vercel: Dashboard shows deployment status

---

## Environment Variables Reference

### Backend (Railway)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `SECRET_KEY` | JWT signing key (long random string) | `your-secret-key-min-32-chars` |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o | `sk-...` |
| `GROQ_API_KEY` | Groq API key (optional) | `gsk_...` |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS API key | `sk_...` |
| `ADMIN_PASSWORD` | Admin endpoint password | `SecurePassword123!` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `https://app.vercel.app,http://localhost:3000` |

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend REST API URL | `https://your-app.up.railway.app/api/v1` |
| `NEXT_PUBLIC_WS_URL` | Backend WebSocket URL | `wss://your-app.up.railway.app/api/v1/chat/ws/chat` |

---

## Monitoring & Logs

### Railway Logs

```
Dashboard → Service → Deployments → Click deployment → View Logs
```

Real-time logs show:
- API requests
- WebSocket connections
- Errors and stack traces
- Database queries

### Vercel Logs

```
Dashboard → Project → Deployments → Click deployment → Runtime Logs
```

Shows:
- Page loads
- API route calls
- Build errors
- Runtime errors

---

## Rollback Strategy

### Railway

1. Go to Deployments
2. Find previous working deployment
3. Click "Redeploy"

### Vercel

1. Go to Deployments
2. Find previous working deployment
3. Click "⋯" → "Promote to Production"

---

## Cost Breakdown

### Railway (Backend)

- **Starter Plan**: $5/month
  - 512MB RAM, 1GB storage
  - Unlimited requests
  - WebSocket support
  - Auto-scaling

**OR** Use free tier (500 hours/month)

### Vercel (Frontend)

- **Hobby Plan**: Free
  - 100GB bandwidth
  - Unlimited requests
  - Automatic HTTPS
  - Global CDN

### Neon (Database)

- **Free Tier**: $0
  - 0.5GB storage
  - 3GB data transfer
  - Auto-scaling compute

### Total

- **Free option**: $0/month (Railway free tier + Vercel free + Neon free)
- **Paid option**: $5/month (Railway Starter + Vercel free + Neon free)

---

## Troubleshooting

### Backend Build Fails

**Error**: `ModuleNotFoundError`
**Fix**: Ensure `requirements.txt` is in `vera-api/` directory

**Error**: `Database connection failed`
**Fix**: Check `DATABASE_URL` in Railway environment variables

**Error**: Railway detects wrong app (Streamlit instead of FastAPI)
**Fix**:
1. Go to Settings → Service
2. Set **Root Directory** to `vera-api`
3. Verify `railpack.toml` exists in `vera-api/` directory
4. Redeploy the service

### Frontend Build Fails

**Error**: `Module not found: Can't resolve '@/components/...'`
**Fix**: Ensure Root Directory is set to `vera-frontend` in Vercel

**Error**: `NEXT_PUBLIC_API_URL is not defined`
**Fix**: Add environment variables in Vercel project settings

### WebSocket Connection Fails

**Error**: `WebSocket connection to 'wss://...' failed`
**Fix**:
1. Check `NEXT_PUBLIC_WS_URL` uses `wss://` (not `ws://`)
2. Verify Railway backend is running
3. Check CORS settings in Railway

### CORS Errors

**Error**: `Access to fetch at '...' has been blocked by CORS policy`
**Fix**:
1. Go to Railway → Variables
2. Update `CORS_ORIGINS` to include your Vercel URL
3. Example: `https://your-app.vercel.app,http://localhost:3000`

---

## Security Best Practices

1. **Change SECRET_KEY**: Use a long random string (32+ characters)
2. **Rotate API Keys**: If keys are exposed, rotate them immediately
3. **Update ADMIN_PASSWORD**: Use a strong password
4. **Enable 2FA**: On GitHub, Vercel, and Railway accounts
5. **Review CORS**: Only allow your frontend domain
6. **Monitor Logs**: Regularly check for suspicious activity

---

## Next Steps After Deployment

1. **Test all features**:
   - Research ID validation
   - Disclaimer acknowledgment
   - Text chat
   - Voice input
   - Phone call mode
   - 5-minute timer

2. **Monitor performance**:
   - Check Railway logs for errors
   - Monitor Vercel analytics
   - Review database usage in Neon

3. **Set up alerts** (optional):
   - Railway: Configure Slack/Discord webhooks
   - Vercel: Enable deployment notifications

4. **Share with users**:
   - Your VERA app is live at: `https://your-app.vercel.app`
   - Provide research IDs: RID001-RID010

---

## Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **FastAPI Deployment**: [fastapi.tiangolo.com/deployment](https://fastapi.tiangolo.com/deployment)
- **Next.js Deployment**: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)

---

## Quick Reference Commands

### Check Deployment Status

```bash
# Backend (Railway)
curl https://your-app.up.railway.app/health

# Frontend (Vercel)
curl https://your-app.vercel.app
```

### View Logs

```bash
# Railway CLI (install: npm i -g @railway/cli)
railway logs

# Vercel CLI (install: npm i -g vercel)
vercel logs
```

### Force Redeploy

```bash
# Railway
railway up

# Vercel
vercel --prod
```

---

## Summary

✅ **Backend**: Railway + Neon PostgreSQL
✅ **Frontend**: Vercel
✅ **CI/CD**: Automatic on git push
✅ **Cost**: $0-5/month
✅ **SSL**: Automatic HTTPS
✅ **Monitoring**: Built-in logs and analytics

**You're ready to deploy! Follow the steps above and your VERA app will be live in ~15 minutes.**
