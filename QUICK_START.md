# 🚀 VERA Audio Fix - Quick Start Guide

## What's the Problem?
Audio works locally but not in production. Text displays but no voice plays.

## Root Cause
Missing or incorrect environment variables in Vercel and Railway.

---

## ⚡ 3-Step Fix (Takes 10 minutes)

### Step 1: Get Your URLs (2 minutes)

**Railway URL:**
1. Open https://railway.app/dashboard
2. Click your `vera-api` project
3. Copy the domain (e.g., `vera-api-production.up.railway.app`)

**Vercel URL:**
1. Open https://vercel.com/dashboard
2. Click your `vera-frontend` project
3. Copy the domain (e.g., `vera-pad.vercel.app`)

**Write them down:**
```
Railway URL: _______________________________
Vercel URL:  _______________________________
```

---

### Step 2: Configure Railway (3 minutes)

1. Go to Railway → Your Project → **Variables** tab
2. Add or verify these variables (click "+ Add Variable"):

**Critical ones:**
```
ELEVENLABS_API_KEY=sk_YOUR_ELEVENLABS_API_KEY_HERE
CORS_ORIGINS=https://[YOUR-VERCEL-URL],http://localhost:3000
```

**Others (should already exist):**
```
DATABASE_URL=postgresql://neondb_owner:YOUR_DB_PASSWORD_HERE@ep-wandering-sea-a5xid0o5.us-east-2.aws.neon.tech/neondb?sslmode=require
SECRET_KEY=YOUR_SECRET_KEY_MIN_32_CHARS_HERE
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE
ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD_HERE
RAILWAY_ENVIRONMENT=production
```

3. **Save** → Railway will auto-redeploy (wait 2-3 minutes)

**⚠️ Important:**
- Replace `[YOUR-VERCEL-URL]` with your actual Vercel domain
- NO trailing slash: `https://app.vercel.app` ✅ not `https://app.vercel.app/` ❌

---

### Step 3: Configure Vercel (3 minutes)

1. Go to Vercel → Your Project → **Settings** → **Environment Variables**
2. Add these 2 variables:

**Variable 1:**
- Name: `NEXT_PUBLIC_API_URL`
- Value: `https://[YOUR-RAILWAY-URL]/api/v1`
- Environment: **Production** only ✅

**Variable 2:**
- Name: `NEXT_PUBLIC_WS_URL`
- Value: `wss://[YOUR-RAILWAY-URL]/api/v1/chat/ws/chat`
- Environment: **Production** only ✅

3. Go to **Deployments** → Find latest → Click **"..."** → **Redeploy**
4. Wait 2-3 minutes for deployment

**⚠️ Important:**
- Use `https://` for API_URL
- Use `wss://` (not `ws://`) for WS_URL
- Replace `[YOUR-RAILWAY-URL]` with your actual Railway domain

---

## ✅ Test It (2 minutes)

### Quick Test:
1. Open `https://[YOUR-VERCEL-URL]` in Chrome
2. Press **F12** to open DevTools Console
3. Enter research ID (e.g., RID001)
4. Send message: "What is peripheral artery disease?"

### What to Look For:

**✅ Success indicators:**
```
✓ WebSocket connected successfully
✓ Audio enabled successfully
✓ Received audio message: Audio data present
✓ (Audio plays automatically)
```

**❌ If you see errors:**
```
✗ Failed to load resource → Wrong backend URL
✗ CORS blocked → Fix CORS_ORIGINS in Railway
✗ WebSocket failed → Check you used wss:// not ws://
✗ Audio playback failed → Check ELEVENLABS_API_KEY in Railway
```

---

## 🔧 Troubleshooting

### Audio still doesn't work?

**Check Railway logs:**
1. Railway → Deployments → View Logs
2. Send a message from frontend
3. Look for:
   - ✅ "Generating TTS for response"
   - ✅ "TTS generated successfully"
   - ❌ "TTS generation failed" → Check ELEVENLABS_API_KEY

**Check browser console:**
1. Should see "Audio enabled successfully" after first message
2. Should see "Received audio message: Audio data present"
3. If not, check NEXT_PUBLIC_WS_URL uses `wss://`

**Common mistakes:**
- ❌ Used `ws://` instead of `wss://` for WebSocket URL
- ❌ Trailing slash in CORS_ORIGINS: `https://app.vercel.app/`
- ❌ Missing `https://` in CORS_ORIGINS
- ❌ Forgot to redeploy Vercel after adding variables
- ❌ ELEVENLABS_API_KEY not set or invalid

---

## 📋 Verification Checklist

Before considering it fixed:

### Railway (Backend)
- [ ] `ELEVENLABS_API_KEY` is set (check Variables tab)
- [ ] `CORS_ORIGINS` includes your Vercel URL
- [ ] Health check works: `curl https://[RAILWAY-URL]/health`
- [ ] Logs show "TTS generated successfully" when you send message

### Vercel (Frontend)
- [ ] `NEXT_PUBLIC_API_URL` points to Railway with `https://`
- [ ] `NEXT_PUBLIC_WS_URL` points to Railway with `wss://`
- [ ] Latest deployment successful (check Deployments tab)
- [ ] Site loads without console errors

### Audio Works
- [ ] Console shows "WebSocket connected successfully"
- [ ] Console shows "Audio enabled successfully" (after first message)
- [ ] Console shows "Received audio message: Audio data present"
- [ ] Audio plays automatically
- [ ] No "Audio playback failed" errors

---

## 🆘 Still Having Issues?

### Use the verification script:
```bash
cd /Users/david/GitHub/pad
./scripts/verify_deployment.sh
```

### Check detailed guides:
- [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md) - Full step-by-step guide
- [plan.md](plan.md) - Complete technical analysis
- [todo.md](todo.md) - Detailed checklist

### Manual verification:
```bash
# Test backend health
curl https://[YOUR-RAILWAY-URL]/health

# Should return: {"status":"healthy"}
```

---

## 📞 Quick Reference

### Railway Dashboard
- URL: https://railway.app/dashboard
- Need: Variables tab, Deployment logs

### Vercel Dashboard
- URL: https://vercel.com/dashboard
- Need: Settings → Environment Variables, Deployments

### ElevenLabs Dashboard
- URL: https://elevenlabs.io/app
- Check: API key active, quota not exceeded

---

## ✨ Success!

Once audio works:
1. Test with 3-4 messages to ensure consistency
2. Try in different browsers (Chrome, Edge)
3. Update team that audio is working
4. Consider this issue resolved! 🎉

---

## 💡 Pro Tips

- **Always use Chrome** for best WebSocket support
- **Check Railway logs** when debugging backend issues
- **Check browser console** when debugging frontend issues
- **Force redeploy** if changes don't take effect:
  ```bash
  git commit --allow-empty -m "Force redeploy"
  git push origin main
  ```

---

## Time Estimate

- Reading this guide: 2 minutes ⏱️
- Getting URLs: 2 minutes ⏱️
- Configuring Railway: 3 minutes ⏱️
- Configuring Vercel: 3 minutes ⏱️
- Testing: 2 minutes ⏱️

**Total: ~12 minutes** to fix the audio issue!

---

*Last updated: $(date)*
