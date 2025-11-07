# VERA Audio Playback Issue - Assessment & Fix Plan

## Problem Statement
Voice audio works perfectly in local development but fails in production hosted environment. Text displays correctly, but no audio playback occurs.

---

## Assessment Findings

### Architecture Overview
**Audio Pipeline:**
1. User sends message → LLM generates response
2. Backend generates TTS audio via ElevenLabs API
3. Audio converted to base64 and sent via WebSocket
4. Frontend receives base64 audio and plays through HTML5 Audio API

### Current Implementation

**Backend ([chat.py:244-256](vera-api/app/api/endpoints/chat.py#L244-L256)):**
- ✅ TTS service generates MP3 audio (ElevenLabs)
- ✅ Audio converted to base64
- ✅ Sent via WebSocket as `audio` message type
- ✅ Uses `/tmp` directory for Railway deployment

**Frontend ([ChatInterface.tsx:50-61](vera-frontend/components/ChatInterface.tsx#L50-L61)):**
- ✅ `playAudio()` function receives base64 audio
- ✅ Sets audio source as data URL
- ✅ Calls `.play()` on audio element
- ✅ **FIXED**: Browser autoplay policy handled (lines 36-47, 190, 286)

**Environment Configuration:**
- ✅ ElevenLabs API key present in `.env`
- ⚠️ Production URLs not configured (still showing placeholders)
- ⚠️ `.env.local` uses localhost URLs

---

## Root Causes Identified

### 1. **Environment Variables Not Set for Production** ⚠️ HIGH PRIORITY
**Issue:** Frontend `.env.local` still points to localhost
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/api/v1/chat/ws/chat
```

**Impact:** Frontend may not be connecting to production backend correctly

**Fix Required:**
- Set production environment variables in Vercel
- Update to actual Railway backend URLs (wss:// for WebSocket)

### 2. **Browser Autoplay Policy** ✅ ALREADY FIXED
**Issue:** Modern browsers block autoplay on HTTPS without user interaction

**Fix Applied:** Commit `0004f13` implemented:
- Silent audio playback on first user interaction
- `audioEnabled` state tracking
- Triggered on message send or call start

**Status:** Should be working, but verify deployment has latest code

### 3. **Potential WebSocket Connection Issues** ⚠️ NEEDS VERIFICATION
**Issue:** If WebSocket isn't connecting properly, audio messages won't arrive

**Indicators to Check:**
- Console errors about WebSocket connection
- `type: 'audio'` messages not being received
- Network tab showing failed WebSocket upgrade

### 4. **CORS Configuration** ⚠️ NEEDS VERIFICATION
**Issue:** Backend CORS_ORIGINS may not include production frontend URL

**Current Setting:**
```python
CORS_ORIGINS=http://localhost:3000,https://your-app.vercel.app
```

**Fix Required:** Update with actual Vercel deployment URL

### 5. **ElevenLabs API Key Validation** ⚠️ NEEDS VERIFICATION
**Issue:** Backend may not have ElevenLabs API key in Railway environment

**Fix Required:** Verify Railway has `ELEVENLABS_API_KEY` set

---

## Diagnostic Steps

### Step 1: Check Production Environment Variables
**Vercel Dashboard:**
- [ ] Verify `NEXT_PUBLIC_API_URL` points to Railway URL
- [ ] Verify `NEXT_PUBLIC_WS_URL` uses `wss://` protocol
- [ ] Redeploy after setting variables

**Railway Dashboard:**
- [ ] Verify `ELEVENLABS_API_KEY` is set
- [ ] Verify `CORS_ORIGINS` includes Vercel URL
- [ ] Check deployment logs for TTS errors

### Step 2: Check Browser Console
**Open Production Site → Browser DevTools:**
- [ ] Check Console for WebSocket connection errors
- [ ] Check Console for audio playback errors
- [ ] Look for "Audio enabled successfully" message
- [ ] Check Network tab for WebSocket messages

### Step 3: Verify Backend TTS Generation
**Railway Logs:**
```bash
# Look for these log messages:
- "Generating TTS for response"
- "TTS generated successfully"
- "Audio message sent to client"
- Any "TTS generation failed" errors
```

### Step 4: Test WebSocket Audio Delivery
**Browser Console:**
```javascript
// Check if audio messages are being received
// Look for: {type: "audio", audio_base64: "..."}
```

---

## Fix Implementation Plan

### Priority 1: Environment Configuration ⚠️ CRITICAL
**Vercel (Frontend):**
1. Get actual Railway backend URL (e.g., `https://vera-api.up.railway.app`)
2. Set environment variables in Vercel dashboard:
   ```
   NEXT_PUBLIC_API_URL=https://[your-railway-url]/api/v1
   NEXT_PUBLIC_WS_URL=wss://[your-railway-url]/api/v1/chat/ws/chat
   ```
3. Redeploy frontend

**Railway (Backend):**
1. Get actual Vercel frontend URL (e.g., `https://vera.vercel.app`)
2. Set environment variables in Railway dashboard:
   ```
   ELEVENLABS_API_KEY=sk_YOUR_ELEVENLABS_API_KEY_HERE
   CORS_ORIGINS=https://[your-vercel-url]
   ```
3. Redeploy backend

### Priority 2: Verify Autoplay Fix Deployed
**Check:**
- [ ] Latest commit (`0004f13` or later) deployed to production
- [ ] `enableAudio()` function exists in production bundle
- [ ] Console shows "Audio enabled successfully" on first interaction

### Priority 3: Add Enhanced Debugging
**If issue persists, add logging to production:**

**Backend enhancement ([chat.py:244-261](vera-api/app/api/endpoints/chat.py#L244-L261)):**
```python
# Add more detailed logging
print(f"TTS API Key present: {bool(settings.ELEVENLABS_API_KEY)}")
print(f"Audio base64 length: {len(audio_base64)} bytes")
```

**Frontend enhancement ([ChatInterface.tsx:89-96](vera-frontend/components/ChatInterface.tsx#L89-L96)):**
```typescript
case 'audio':
  console.log('Audio message received:', {
    hasAudioData: !!data.audio_base64,
    audioLength: data.audio_base64?.length,
    audioEnabled: audioEnabled,
    audioRefExists: !!audioRef.current
  });
```

### Priority 4: Add Fallback User Notification
**If audio continues to fail silently, notify user:**
```typescript
// In ChatInterface.tsx playAudio function
.catch((error) => {
  console.error('Audio playback failed:', error);
  // Add user-visible notification
  alert('Audio playback is unavailable. Please check browser settings.');
});
```

---

## Testing Checklist

### Local Testing
- [x] Audio works in development mode
- [ ] WebSocket connects successfully
- [ ] Console shows "Audio enabled successfully"
- [ ] Console shows "Audio message sent to client"

### Production Testing
- [ ] Frontend connects to backend WebSocket
- [ ] CORS allows connection
- [ ] Audio messages received in browser
- [ ] Audio plays after first user interaction
- [ ] No console errors related to audio
- [ ] Browser DevTools Network tab shows WebSocket with audio messages

---

## Deployment Architecture

```
┌─────────────────────┐
│   Vercel (Frontend) │
│  vera.vercel.app    │
│                     │
│  - Next.js App      │
│  - WebSocket Client │
│  - HTML5 Audio      │
└──────────┬──────────┘
           │ wss://
           ▼
┌─────────────────────┐
│  Railway (Backend)  │
│  vera-api.railway   │
│                     │
│  - FastAPI          │
│  - WebSocket Server │
│  - TTS Service      │
└──────────┬──────────┘
           │ HTTPS API
           ▼
┌─────────────────────┐
│  ElevenLabs API     │
│  Text-to-Speech     │
└─────────────────────┘
```

---

## Common Issues & Solutions

### Issue: "Failed to load resource: net::ERR_CONNECTION_REFUSED"
**Cause:** Frontend trying to connect to localhost in production
**Fix:** Set correct `NEXT_PUBLIC_WS_URL` in Vercel

### Issue: "WebSocket connection failed"
**Cause:** CORS blocking connection or wrong protocol (ws:// vs wss://)
**Fix:** Use `wss://` for production, add origin to `CORS_ORIGINS`

### Issue: "NotAllowedError: play() failed"
**Cause:** Browser autoplay policy blocking audio
**Fix:** Already fixed in commit `0004f13`, verify deployed

### Issue: Audio messages not in WebSocket
**Cause:** Backend TTS failing silently
**Fix:** Check Railway logs, verify `ELEVENLABS_API_KEY` set

### Issue: "Audio ref is null"
**Cause:** Audio element not rendered
**Fix:** Verify `<audio ref={audioRef}>` exists in DOM

---

## Success Criteria

- [ ] Production site loads without console errors
- [ ] WebSocket connects (check Network tab)
- [ ] User can send message successfully
- [ ] VERA responds with streaming text
- [ ] Console shows "Audio message sent to client" (backend logs)
- [ ] Console shows "Received audio message: Audio data present" (frontend)
- [ ] Audio plays automatically after first user interaction
- [ ] No "Audio playback failed" errors

---

## Next Steps

1. **Immediate:** Check Vercel and Railway environment variables
2. **Immediate:** Get actual production URLs and update configs
3. **Quick:** Verify latest code deployed to both platforms
4. **Quick:** Check Railway logs for TTS errors
5. **If needed:** Add enhanced debugging logging
6. **If needed:** Test with different browsers
7. **Future:** Add user-visible audio status indicator

---

## Files to Monitor

**Backend:**
- [vera-api/app/api/endpoints/chat.py:244-261](vera-api/app/api/endpoints/chat.py#L244-L261) - TTS generation
- [vera-api/app/services/tts_service.py](vera-api/app/services/tts_service.py) - ElevenLabs integration
- [vera-api/app/core/config.py](vera-api/app/core/config.py) - Environment config

**Frontend:**
- [vera-frontend/components/ChatInterface.tsx:35-47](vera-frontend/components/ChatInterface.tsx#L35-L47) - Audio enablement
- [vera-frontend/components/ChatInterface.tsx:50-61](vera-frontend/components/ChatInterface.tsx#L50-L61) - Audio playback
- [vera-frontend/components/ChatInterface.tsx:89-96](vera-frontend/components/ChatInterface.tsx#L89-L96) - Audio message handling
- [vera-frontend/hooks/useWebSocket.ts](vera-frontend/hooks/useWebSocket.ts) - WebSocket connection

**Configuration:**
- Railway environment variables
- Vercel environment variables
- [vera-api/railway.toml](vera-api/railway.toml) - Railway config

---

## Contact & Resources

- **Railway Dashboard:** Check deployment logs and environment variables
- **Vercel Dashboard:** Check deployment status and environment variables
- **Browser DevTools:** Console + Network tab for debugging
- **ElevenLabs Dashboard:** Check API usage and quota
