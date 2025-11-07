# VERA Audio Fix - TODO Checklist

## Immediate Actions Required

### 1. Environment Variables Configuration ⚠️ CRITICAL

#### Vercel (Frontend)
- [ ] Log into Vercel dashboard
- [ ] Navigate to project settings → Environment Variables
- [ ] Get Railway backend URL from Railway dashboard
- [ ] Add/update environment variables:
  - [ ] `NEXT_PUBLIC_API_URL` = `https://[your-railway-url]/api/v1`
  - [ ] `NEXT_PUBLIC_WS_URL` = `wss://[your-railway-url]/api/v1/chat/ws/chat`
- [ ] Redeploy frontend from Vercel dashboard

#### Railway (Backend)
- [ ] Log into Railway dashboard
- [ ] Navigate to project → Variables
- [ ] Get Vercel frontend URL from Vercel dashboard
- [ ] Add/update environment variables:
  - [ ] `ELEVENLABS_API_KEY` = `sk_YOUR_ELEVENLABS_API_KEY_HERE`
  - [ ] `CORS_ORIGINS` = `https://[your-vercel-url]`
  - [ ] `OPENAI_API_KEY` = (existing key)
  - [ ] `DATABASE_URL` = (existing connection string)
  - [ ] `SECRET_KEY` = (existing secret)
- [ ] Redeploy backend from Railway dashboard

---

## 2. Verification Steps

### Frontend Verification
- [ ] Open production site in browser
- [ ] Open DevTools Console (F12)
- [ ] Look for console messages:
  - [ ] No CORS errors
  - [ ] "WebSocket connected successfully"
  - [ ] No "Failed to load resource" errors
- [ ] Check Network tab:
  - [ ] WebSocket connection established (status 101)
  - [ ] WebSocket shows "ws" in Type column

### Backend Verification
- [ ] Open Railway deployment logs
- [ ] Send a test message from frontend
- [ ] Check logs for:
  - [ ] "Generating TTS for response"
  - [ ] "TTS generated successfully"
  - [ ] "Audio message sent to client"
  - [ ] NO "TTS generation failed" errors
  - [ ] NO ElevenLabs API errors

### Audio Playback Test
- [ ] Open production site
- [ ] Send first message (this should trigger audio unlock)
- [ ] Check console for "Audio enabled successfully"
- [ ] Wait for VERA response
- [ ] Check console for "Received audio message: Audio data present"
- [ ] Verify audio plays automatically
- [ ] Test with 2-3 more messages to confirm consistency

---

## 3. If Issues Persist

### Enhanced Debugging - Backend
- [ ] Add more logging to [chat.py:244-261](vera-api/app/api/endpoints/chat.py#L244-L261):
```python
print(f"ElevenLabs API Key configured: {bool(settings.ELEVENLABS_API_KEY)}")
print(f"ElevenLabs API Key prefix: {settings.ELEVENLABS_API_KEY[:10]}...")
print(f"Generated audio bytes: {len(audio_bytes)}")
print(f"Base64 encoded length: {len(audio_base64)}")
```
- [ ] Commit and push changes
- [ ] Check Railway logs for new output

### Enhanced Debugging - Frontend
- [ ] Add more logging to [ChatInterface.tsx:89-96](vera-frontend/components/ChatInterface.tsx#L89-L96):
```typescript
case 'audio':
  console.log('=== AUDIO DEBUG ===');
  console.log('Audio data received:', {
    hasAudioData: !!data.audio_base64,
    audioDataLength: data.audio_base64?.length,
    audioDataPrefix: data.audio_base64?.substring(0, 50),
    audioEnabled: audioEnabled,
    audioRefExists: !!audioRef.current,
    audioRefReadyState: audioRef.current?.readyState
  });
  console.log('==================');
```
- [ ] Commit and push changes
- [ ] Redeploy to Vercel
- [ ] Check browser console for detailed output

### Test with Different Browsers
- [ ] Chrome (primary - best support)
- [ ] Edge (Chromium-based)
- [ ] Safari (may have different autoplay policies)
- [ ] Firefox (may have different autoplay policies)

### Verify Latest Code Deployed
- [ ] Check git log for latest commit hash
- [ ] Verify Vercel deployment shows same commit hash
- [ ] Verify Railway deployment shows same commit hash
- [ ] Specifically check commit `0004f13` (audio fix) is included

---

## 4. Additional Improvements (If Needed)

### Add User-Visible Audio Status
- [ ] Add audio icon indicator in [ChatInterface.tsx](vera-frontend/components/ChatInterface.tsx)
- [ ] Show loading state while audio generates
- [ ] Show play icon when audio is ready
- [ ] Show error state if audio fails

### Add Manual Audio Toggle
- [ ] Add button to manually enable/disable audio
- [ ] Store preference in localStorage
- [ ] Allow user to replay audio if needed

### Add Error Handling
- [ ] Show user-friendly error message if audio fails
- [ ] Provide troubleshooting tips in UI
- [ ] Add retry mechanism for failed audio

### Backend Improvements
- [ ] Add health check endpoint that tests ElevenLabs API
- [ ] Add audio file caching to reduce API calls
- [ ] Add fallback TTS service if ElevenLabs fails

---

## 5. Testing Matrix

| Test Case | Local | Production | Status |
|-----------|-------|------------|--------|
| WebSocket connects | ✅ | ⬜ | Pending |
| Text messages display | ✅ | ⬜ | Pending |
| Audio messages received | ✅ | ⬜ | Pending |
| Audio plays automatically | ✅ | ⬜ | Pending |
| Audio after first interaction | ✅ | ⬜ | Pending |
| Multiple messages | ✅ | ⬜ | Pending |
| Voice call mode | ✅ | ⬜ | Pending |
| Different browsers | ✅ | ⬜ | Pending |

---

## 6. Documentation Updates

After fixing:
- [ ] Update [howto.md](howto.md) with deployment instructions
- [ ] Document environment variable requirements
- [ ] Add troubleshooting section for audio issues
- [ ] Update README with production URLs
- [ ] Document browser compatibility notes

---

## 7. Future Enhancements

- [ ] Add audio playback controls (play/pause/volume)
- [ ] Add option to download audio files
- [ ] Add different voice options
- [ ] Add speech rate adjustment
- [ ] Add audio visualization
- [ ] Cache audio locally to reduce regeneration
- [ ] Add audio preloading for better performance

---

## Emergency Rollback Plan

If issues cannot be resolved quickly:
- [ ] Revert to last known good commit
- [ ] Temporarily disable audio in production:
  ```typescript
  const ENABLE_AUDIO = false; // Set to false to disable audio
  ```
- [ ] Add notice to users about audio being temporarily unavailable
- [ ] Continue debugging in development environment

---

## Sign-off Checklist

Before considering issue resolved:
- [ ] All environment variables configured correctly
- [ ] Both platforms redeployed with correct configuration
- [ ] Audio works in production for at least 3 consecutive messages
- [ ] Tested in Chrome and Edge browsers
- [ ] No console errors related to audio or WebSocket
- [ ] Backend logs show successful TTS generation
- [ ] Documentation updated with production URLs
- [ ] Team notified of resolution
