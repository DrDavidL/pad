# VERA Production Deployment Setup Guide

## ⚠️ IMMEDIATE ACTIONS REQUIRED

This guide will walk you through configuring your production environment to fix the audio playback issue.

---

## Step 1: Get Your Production URLs

### A. Get Railway Backend URL

1. Open [Railway Dashboard](https://railway.app/dashboard)
2. Navigate to your `vera-api` project
3. Click on the service
4. Go to **Settings** → **Networking**
5. Copy the **Public Domain** (e.g., `vera-api-production.up.railway.app`)

**Save this URL - you'll need it for Vercel configuration**

### B. Get Vercel Frontend URL (Optional - if already deployed)

1. Open [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your `vera-frontend` project
3. Copy the **Production Domain** (e.g., `vera-pad.vercel.app`)

**Save this URL - you'll need it for Railway configuration**

---

## Step 2: Configure Railway (Backend)

### Required Environment Variables

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your `vera-api` project
3. Go to **Variables** tab
4. Add or verify these variables:

```bash
# Database (should already exist)
DATABASE_URL=postgresql://neondb_owner:YOUR_DB_PASSWORD_HERE@ep-wandering-sea-a5xid0o5.us-east-2.aws.neon.tech/neondb?sslmode=require

# Security (should already exist)
SECRET_KEY=YOUR_SECRET_KEY_MIN_32_CHARS_HERE

# OpenAI API Key (should already exist)
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE

# ElevenLabs API Key ⚠️ CRITICAL FOR AUDIO
ELEVENLABS_API_KEY=sk_YOUR_ELEVENLABS_API_KEY_HERE

# Admin Password (should already exist)
ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD_HERE

# CORS Origins ⚠️ UPDATE THIS WITH YOUR VERCEL URL
CORS_ORIGINS=https://[YOUR-VERCEL-URL].vercel.app,http://localhost:3000

# Groq API Key (optional)
GROQ_API_KEY=gsk_...

# OpenRouter API Key (optional)
OPENROUTER_API_KEY=

# Railway Environment Flag
RAILWAY_ENVIRONMENT=production
```

### Critical Variables to Check:
- ✅ `ELEVENLABS_API_KEY` - Must be set for audio generation
- ✅ `CORS_ORIGINS` - Must include your Vercel URL (no trailing slash!)
- ✅ `DATABASE_URL` - Must be valid Neon connection string

### After Adding Variables:
1. Click **Save** or wait for auto-save
2. Railway will automatically redeploy
3. Wait 2-3 minutes for deployment to complete
4. Check **Deployments** tab to verify success

---

## Step 3: Configure Vercel (Frontend)

### Required Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `vera-frontend` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables for **Production** environment:

```bash
# Backend API URL - REST endpoints
# ⚠️ REPLACE [YOUR-RAILWAY-URL] WITH ACTUAL RAILWAY DOMAIN
NEXT_PUBLIC_API_URL=https://[YOUR-RAILWAY-URL]/api/v1

# Backend WebSocket URL
# ⚠️ MUST USE wss:// (not ws://) FOR PRODUCTION
NEXT_PUBLIC_WS_URL=wss://[YOUR-RAILWAY-URL]/api/v1/chat/ws/chat
```

**Example with actual URL:**
```bash
NEXT_PUBLIC_API_URL=https://vera-api-production.up.railway.app/api/v1
NEXT_PUBLIC_WS_URL=wss://vera-api-production.up.railway.app/api/v1/chat/ws/chat
```

### How to Add Each Variable:

1. Click **Add** (or **Add New**)
2. Enter **Key**: `NEXT_PUBLIC_API_URL`
3. Enter **Value**: `https://[your-railway-url]/api/v1`
4. Select Environment: **Production** only (uncheck Preview and Development)
5. Click **Save**
6. Repeat for `NEXT_PUBLIC_WS_URL`

### After Adding Variables:
1. Go to **Deployments** tab
2. Find latest deployment
3. Click **...** menu → **Redeploy**
4. Wait 2-3 minutes for deployment to complete

---

## Step 4: Verify Deployment

### A. Check Railway Backend

1. **Health Check:**
   ```bash
   curl https://[YOUR-RAILWAY-URL]/health
   ```
   Expected: `{"status":"healthy"}`

2. **Check Logs:**
   - Go to Railway → Deployments → View Logs
   - Look for: "Application startup complete"
   - No errors about missing environment variables

3. **Verify Environment Variables:**
   - Go to Railway → Variables
   - Verify `ELEVENLABS_API_KEY` is present (should show masked value)
   - Verify `CORS_ORIGINS` includes your Vercel URL

### B. Check Vercel Frontend

1. **Visit Your Site:**
   ```
   https://[YOUR-VERCEL-URL].vercel.app
   ```

2. **Open Browser DevTools (F12):**
   - Go to **Console** tab
   - Look for any errors (red text)
   - Should NOT see "Failed to load resource" for backend

3. **Check Environment Variables:**
   - Go to Vercel → Settings → Environment Variables
   - Verify both `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` are set
   - Verify they point to your Railway URL

---

## Step 5: Test Audio Functionality

### Complete Test Flow:

1. **Open Production Site:**
   - Visit `https://[YOUR-VERCEL-URL].vercel.app`
   - Open DevTools Console (F12)

2. **Enter Research ID:**
   - Use valid ID (e.g., RID001)
   - Accept disclaimer

3. **Send First Message:**
   ```
   What is peripheral artery disease?
   ```

4. **Monitor Console Output:**

   **Expected messages (in order):**
   ```
   ✅ WebSocket connected successfully
   ✅ Attempting to send message. isConnected: true
   ✅ Message sent successfully
   ✅ Audio enabled successfully
   ✅ Received audio message: Audio data present
   ```

   **If you see these errors:**
   ```
   ❌ Failed to load resource: net::ERR_CONNECTION_REFUSED
      → Backend URL is wrong or backend is down

   ❌ Access to XMLHttpRequest has been blocked by CORS policy
      → CORS_ORIGINS in Railway doesn't include your Vercel URL

   ❌ WebSocket connection failed
      → Check NEXT_PUBLIC_WS_URL uses wss:// not ws://

   ❌ Audio playback failed: NotAllowedError
      → Browser autoplay policy (should be fixed by enableAudio)

   ❌ No audio_base64 in audio message
      → TTS generation failed on backend (check Railway logs)
   ```

5. **Check Audio Playback:**
   - Wait for VERA's response to complete
   - Audio should play automatically
   - Volume should be audible
   - Voice should be clear, female voice (Aria)

6. **Test Multiple Messages:**
   - Send 2-3 more messages
   - Audio should play for each response
   - No "Audio playback failed" errors

### Check Railway Logs:

Open Railway → Deployments → Logs and look for:

```
✅ Generating TTS for response (length: 123)
✅ TTS generated successfully. Base64 length: 45678
✅ Audio message sent to client
```

**If you see errors:**
```
❌ TTS generation failed: Invalid API key
   → ELEVENLABS_API_KEY is missing or invalid in Railway

❌ TTS generation failed: Rate limit exceeded
   → ElevenLabs quota exceeded (check dashboard)

❌ 401 Unauthorized
   → Check ElevenLabs API key is correct
```

---

## Step 6: Troubleshooting

### Issue: "WebSocket connection failed"

**Symptoms:**
- Console: "WebSocket disconnected"
- Console: Repeated reconnection attempts

**Solutions:**
1. Verify `NEXT_PUBLIC_WS_URL` uses `wss://` (not `ws://`)
2. Check Railway backend is running (visit `/health` endpoint)
3. Check CORS_ORIGINS in Railway includes Vercel URL
4. Try in Chrome (best WebSocket support)

**Quick Fix:**
```bash
# Correct format:
wss://vera-api-production.up.railway.app/api/v1/chat/ws/chat

# Wrong formats:
ws://vera-api-production.up.railway.app/api/v1/chat/ws/chat  # ❌ ws not wss
wss://vera-api-production.up.railway.app:443/api/v1/chat/ws/chat  # ❌ don't specify port
```

### Issue: "CORS policy blocked"

**Symptoms:**
- Console: "Access to XMLHttpRequest has been blocked by CORS policy"
- Console: Origin not allowed

**Solutions:**
1. Check `CORS_ORIGINS` in Railway exactly matches your Vercel URL
2. NO trailing slash: `https://app.vercel.app` not `https://app.vercel.app/`
3. Must include `https://` protocol
4. Redeploy Railway after changing

**Correct Examples:**
```bash
# Single origin:
CORS_ORIGINS=https://vera-pad.vercel.app

# Multiple origins (comma-separated):
CORS_ORIGINS=https://vera-pad.vercel.app,http://localhost:3000
```

### Issue: "No audio plays"

**Symptoms:**
- Text appears correctly
- Console shows "Received audio message"
- No sound from speakers

**Debug Steps:**

1. **Check volume:**
   - System volume not muted
   - Browser not muted (check browser's sound indicator)

2. **Check browser console:**
   ```javascript
   // Should see:
   ✅ Received audio message: Audio data present
   ✅ Audio data length: 123456

   // Should NOT see:
   ❌ Audio playback failed
   ❌ No audio_base64 in audio message
   ```

3. **Check Railway logs:**
   - Should see "TTS generated successfully"
   - Should see "Audio message sent to client"
   - If not, check `ELEVENLABS_API_KEY` in Railway

4. **Check ElevenLabs API:**
   - Go to [ElevenLabs Dashboard](https://elevenlabs.io/app)
   - Check API key is active
   - Check quota not exceeded
   - Check no billing issues

5. **Test in different browser:**
   - Try Chrome (recommended)
   - Try Edge
   - Avoid Safari (stricter policies)

### Issue: "Audio works locally but not production"

**This is the original issue! Solutions:**

1. **Verify autoplay fix deployed:**
   ```bash
   # Check git commit
   git log --oneline -5

   # Should see:
   # 0004f13 Fix audio playback on production by enabling on user interaction
   ```

2. **Force redeploy with latest code:**
   ```bash
   # Push to trigger redeployment
   git commit --allow-empty -m "Redeploy with audio fix"
   git push origin main
   ```

3. **Check console for "Audio enabled successfully":**
   - Should appear after first message sent
   - If not, autoplay fix may not be deployed

4. **Try manual audio unlock:**
   - Click anywhere on page before sending message
   - Some browsers require explicit user interaction

---

## Step 7: Success Criteria

Before considering the issue resolved, verify ALL of these:

### Backend (Railway)
- [ ] Health endpoint returns `{"status":"healthy"}`
- [ ] `ELEVENLABS_API_KEY` is set in Variables
- [ ] `CORS_ORIGINS` includes Vercel URL
- [ ] Logs show "TTS generated successfully"
- [ ] Logs show "Audio message sent to client"
- [ ] No errors in deployment logs

### Frontend (Vercel)
- [ ] `NEXT_PUBLIC_API_URL` points to Railway (https://)
- [ ] `NEXT_PUBLIC_WS_URL` points to Railway (wss://)
- [ ] Latest deployment successful
- [ ] Site loads without console errors
- [ ] "WebSocket connected successfully" in console

### Audio Functionality
- [ ] Console shows "Audio enabled successfully" after first interaction
- [ ] Console shows "Received audio message: Audio data present"
- [ ] Audio plays automatically after VERA responds
- [ ] Audio quality is clear (female voice)
- [ ] Works for multiple consecutive messages
- [ ] Works in Chrome browser
- [ ] No "Audio playback failed" errors

### User Experience
- [ ] Research ID authentication works
- [ ] Chat messages send successfully
- [ ] Responses stream in real-time
- [ ] Audio plays without user intervention (after first message)
- [ ] No error messages visible to user

---

## Quick Command Reference

### Check Backend Health:
```bash
curl https://[YOUR-RAILWAY-URL]/health
```

### Check Frontend Build:
```bash
cd vera-frontend
npm run build
```

### View Railway Logs:
```bash
# If Railway CLI installed:
railway logs --tail
```

### View Vercel Logs:
```bash
# If Vercel CLI installed:
vercel logs [deployment-url] --follow
```

### Force Redeploy:
```bash
git commit --allow-empty -m "Force redeploy"
git push origin main
```

---

## Environment Variable Checklist

### Railway (Backend) - 8 Required Variables

- [ ] `DATABASE_URL` - Neon PostgreSQL connection string
- [ ] `SECRET_KEY` - 32+ character random string
- [ ] `OPENAI_API_KEY` - OpenAI API key (sk-proj-...)
- [ ] `ELEVENLABS_API_KEY` - ElevenLabs API key (sk_...)
- [ ] `CORS_ORIGINS` - Vercel URL (https://...)
- [ ] `ADMIN_PASSWORD` - Admin password
- [ ] `GROQ_API_KEY` - Optional (gsk_...)
- [ ] `RAILWAY_ENVIRONMENT` - Set to "production"

### Vercel (Frontend) - 2 Required Variables

- [ ] `NEXT_PUBLIC_API_URL` - Railway URL with /api/v1 (https://...)
- [ ] `NEXT_PUBLIC_WS_URL` - Railway URL with /api/v1/chat/ws/chat (wss://...)

---

## Next Steps After Configuration

1. **Complete this guide** - Follow all steps above
2. **Run verification tests** - Complete Step 5 testing
3. **Document actual URLs** - Update this file with your actual URLs for reference
4. **Test thoroughly** - Send 5+ messages to ensure consistency
5. **Update team** - Notify others that audio is working
6. **Monitor for 24 hours** - Check for any intermittent issues

---

## Support Resources

- **Railway Docs:** https://docs.railway.app/
- **Vercel Docs:** https://vercel.com/docs
- **ElevenLabs Dashboard:** https://elevenlabs.io/app
- **Project Documentation:** See [plan.md](plan.md), [architecture.md](architecture.md)

---

## Record Your Configuration

Once configured, record your actual URLs here for reference:

```
Railway Backend URL: ________________________________
Vercel Frontend URL: ________________________________
Database Host: ep-wandering-sea-a5xid0o5.us-east-2.aws.neon.tech
Configured Date: ________________________________
Tested By: ________________________________
```

**Status:** [ ] Configured  [ ] Tested  [ ] Production Ready
