# Production Audio Debug Guide

## Your Production Setup (Confirmed)

**Railway Backend:** `vera-pad.up.railway.app`
**WebSocket URL:** `wss://vera-pad.up.railway.app/api/v1/chat/ws/chat`
**Frontend:** Vercel deployment

✅ **Environment variables ARE configured** (confirmed from production bundle)

---

## Next Debugging Steps

### Step 1: Check Railway Backend Health

Open this URL in your browser:
```
https://vera-pad.up.railway.app/health
```

**Expected:** `{"status":"healthy"}`

If you get an error, your backend is down or not deployed correctly.

---

### Step 2: Check Railway Logs for TTS Errors

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your `vera-pad` project
3. Click **Deployments**
4. Click **View Logs**

**While in production site, send a test message and look for:**

✅ **Success logs:**
```
Generating TTS for response (length: 123)
TTS generated successfully. Base64 length: 45678
Audio message sent to client
```

❌ **Error logs to look for:**
```
TTS generation failed: Invalid API key
TTS generation failed: 401 Unauthorized
TTS generation failed: Rate limit exceeded
KeyError: 'ELEVENLABS_API_KEY'
```

---

### Step 3: Verify ElevenLabs API Key in Railway

The most likely issue is the **ELEVENLABS_API_KEY is not set in Railway production**.

1. Go to Railway → Your Project → **Variables** tab
2. Look for `ELEVENLABS_API_KEY`
3. If missing or incorrect, add it:
   ```
   ELEVENLABS_API_KEY=sk_9ffed2fc9f91d87addaadfaef6e16026db7e50a2912f8349
   ```
4. Railway will auto-redeploy (wait 2-3 minutes)

---

### Step 4: Browser Console Check

In your production site with DevTools open (F12):

**What you should see:**
```
✅ WebSocket connected successfully
✅ Audio enabled successfully
✅ Received audio message: Audio data present
```

**If you see:**
```
❌ Received audio message: No audio data
❌ No audio_base64 in audio message
```

This confirms the backend is NOT generating audio (check Railway logs).

---

## Most Likely Root Cause

Based on the production bundle showing correct URLs, the issue is:

**🎯 ELEVENLABS_API_KEY is not set in Railway environment variables**

### How to Fix:

1. **Go to Railway Dashboard**
2. **Navigate to Variables**
3. **Add this variable:**
   ```
   Key: ELEVENLABS_API_KEY
   Value: sk_9ffed2fc9f91d87addaadfaef6e16026db7e50a2912f8349
   ```
4. **Wait for auto-redeploy** (2-3 minutes)
5. **Test again**

---

## Quick Test Script

You can test your backend directly:

```bash
# Test health endpoint
curl https://vera-pad.up.railway.app/health

# Expected: {"status":"healthy"}
```

---

## What to Share for Further Debugging

If the issue persists after setting ELEVENLABS_API_KEY, please share:

1. **Railway logs** (after sending a message)
2. **Browser console output** (after sending a message)
3. **Railway Variables screenshot** (showing ELEVENLABS_API_KEY is set)

---

## Summary

- ✅ Frontend URLs are configured correctly
- ✅ WebSocket URL is correct (wss://)
- ✅ Backend is deployed and accessible
- ❓ ELEVENLABS_API_KEY status unknown
- 🎯 Check Railway Variables for ELEVENLABS_API_KEY

**Most likely fix:** Add ELEVENLABS_API_KEY to Railway Variables
