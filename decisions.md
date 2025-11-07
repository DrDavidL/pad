# VERA Audio Implementation - Architectural Decisions

## Decision Log

### Decision 1: Audio Delivery Method
**Date:** Initial implementation
**Status:** ✅ Implemented

**Context:**
Need to deliver generated audio from backend to frontend for playback.

**Options Considered:**
1. Static file URLs served by backend
2. Base64 encoding via WebSocket
3. Streaming audio chunks

**Decision:** Base64 encoding via WebSocket

**Rationale:**
- Real-time delivery alongside text response
- No need for static file hosting/cleanup
- Works well with existing WebSocket infrastructure
- Simpler deployment (no shared storage needed)
- Base64 overhead acceptable for short audio clips

**Trade-offs:**
- ✅ Simple implementation
- ✅ No file management needed
- ✅ Works on ephemeral filesystems (Railway)
- ⚠️ Larger payload size (base64 adds ~33% overhead)
- ⚠️ All-or-nothing delivery (no progressive streaming)

**Implementation:**
- Backend: [tts_service.py:74-78](vera-api/app/services/tts_service.py#L74-L78)
- Backend: [chat.py:247-256](vera-api/app/api/endpoints/chat.py#L247-L256)
- Frontend: [ChatInterface.tsx:50-61](vera-frontend/components/ChatInterface.tsx#L50-L61)

---

### Decision 2: TTS Provider Selection
**Date:** Initial implementation
**Status:** ✅ Implemented

**Context:**
Need high-quality, natural-sounding text-to-speech for medical education content.

**Options Considered:**
1. Google Cloud TTS
2. Amazon Polly
3. ElevenLabs
4. OpenAI TTS
5. Browser Web Speech API

**Decision:** ElevenLabs

**Rationale:**
- Highest quality, most natural voices
- Excellent emotional expression
- Medical terminology pronunciation
- Good API performance
- Reasonable pricing for research project

**Configuration:**
- Model: `eleven_multilingual_v2`
- Voice: `Aria` (ID: 9BWtsMINqrJLrRacOk9x)
- Format: MP3 at 22050 Hz, 32 kbps
- Settings: Max stability and similarity boost

**Trade-offs:**
- ✅ Best voice quality
- ✅ Natural conversation flow
- ⚠️ Requires API key management
- ⚠️ Per-character pricing
- ⚠️ External dependency

**Alternative Considered:**
OpenAI TTS was considered for integration with existing OpenAI infrastructure, but ElevenLabs quality was superior for conversational medical content.

---

### Decision 3: Browser Autoplay Policy Handling
**Date:** Commit `0004f13` (Nov 1, 2025)
**Status:** ✅ Implemented

**Context:**
Audio works locally but fails in production due to browser autoplay policies.

**Problem:**
- Modern browsers block autoplay on HTTPS sites
- Audio must be triggered by user interaction
- Silent failure confuses users

**Decision:** Unlock audio on first user interaction

**Implementation:**
```typescript
// Play silent audio on first message send or call start
const enableAudio = useCallback(() => {
  if (!audioEnabled && audioRef.current) {
    audioRef.current.src = 'data:audio/mp3;base64,...'; // Silent MP3
    audioRef.current.play().then(() => {
      setAudioEnabled(true);
    });
  }
}, [audioEnabled]);
```

**Called on:**
- First message send ([ChatInterface.tsx:190](vera-frontend/components/ChatInterface.tsx#L190))
- Voice call start ([ChatInterface.tsx:286](vera-frontend/components/ChatInterface.tsx#L286))

**Rationale:**
- Complies with browser security policies
- Transparent to user
- One-time unlock lasts for session
- No user prompt needed

**Trade-offs:**
- ✅ Works across all major browsers
- ✅ No user prompts needed
- ✅ Permanent unlock for session
- ⚠️ First interaction required (expected behavior)

**References:**
- [Chrome Autoplay Policy](https://developer.chrome.com/blog/autoplay/)
- [Safari Autoplay Policy](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)

---

### Decision 4: Audio Storage Strategy
**Date:** Initial implementation
**Status:** ✅ Implemented

**Context:**
Generated audio files need temporary storage for backend processing.

**Decision:** Ephemeral storage with environment-aware paths

**Implementation:**
```python
# Use /tmp for cloud deployments, local dir otherwise
if os.environ.get("RAILWAY_ENVIRONMENT"):
    self.audio_dir = Path("/tmp/audio_files")
else:
    self.audio_dir = Path("audio_files")
```

**Rationale:**
- Railway provides `/tmp` as ephemeral storage
- No persistent storage needed (audio sent via WebSocket)
- Auto-cleanup on dyno restart
- Optional manual cleanup after 24 hours

**Trade-offs:**
- ✅ Works on cloud platforms
- ✅ No storage costs
- ✅ Auto-cleanup
- ⚠️ Cannot serve static URLs
- ⚠️ Files lost on restart (acceptable - not needed)

---

### Decision 5: WebSocket Architecture
**Date:** Initial implementation
**Status:** ✅ Implemented

**Context:**
Need real-time bidirectional communication for chat and audio.

**Decision:** Single WebSocket connection for all message types

**Message Types:**
1. `user_message_saved` - Confirmation
2. `chunk` - Streaming LLM response
3. `complete` - Final response
4. `audio` - Base64 audio data
5. `error` - Error handling

**Rationale:**
- Single connection simplifies client
- Sequential delivery ensures sync
- Easy to extend with new message types
- Stateful connection for conversation

**Trade-offs:**
- ✅ Simple client implementation
- ✅ Guaranteed message ordering
- ✅ Easy to extend
- ⚠️ Connection loss requires reconnect
- ⚠️ Head-of-line blocking (acceptable for chat)

**Implementation:**
- Backend: [chat.py:88-276](vera-api/app/api/endpoints/chat.py#L88-L276)
- Frontend: [useWebSocket.ts](vera-frontend/hooks/useWebSocket.ts)

---

### Decision 6: Audio Playback Strategy
**Date:** Initial implementation
**Status:** ✅ Implemented

**Context:**
Need to play audio in browser from base64 data.

**Decision:** HTML5 Audio element with data URLs

**Implementation:**
```typescript
audioRef.current.src = `data:audio/mp3;base64,${base64Audio}`;
audioRef.current.play();
```

**Rationale:**
- Built-in browser API
- Wide browser support
- Simple implementation
- Automatic codec handling
- No library dependencies

**Alternatives Considered:**
- **Web Audio API:** Too complex for simple playback
- **Audio libraries (Howler.js):** Unnecessary dependency
- **Video element:** Works but audio-specific element better

**Trade-offs:**
- ✅ Zero dependencies
- ✅ Works in all browsers
- ✅ Simple implementation
- ⚠️ Limited control (vs Web Audio API)
- ⚠️ No advanced features (visualization, effects)

---

### Decision 7: Environment Configuration Strategy
**Date:** Current
**Status:** ⚠️ NEEDS UPDATE

**Context:**
Need different configurations for local development vs production.

**Current State:**
- Local: `.env` with localhost URLs
- Frontend: `.env.local` (not committed)
- Production: Environment variables in Vercel/Railway

**Decision:** Platform-native environment variables

**Configuration Pattern:**
```
Development:  .env.local → http://localhost:8000
Production:   Vercel/Railway env vars → actual URLs
```

**Rationale:**
- Follows platform best practices
- Prevents accidental credential commits
- Easy to update without code changes
- Different configs per environment

**Current Issues:**
- ⚠️ Production URLs not configured yet
- ⚠️ Need to update Vercel environment variables
- ⚠️ Need to update Railway environment variables

**Required Actions:**
1. Set `NEXT_PUBLIC_API_URL` in Vercel
2. Set `NEXT_PUBLIC_WS_URL` in Vercel (use `wss://`)
3. Set `CORS_ORIGINS` in Railway (include Vercel URL)
4. Redeploy both platforms

---

## Future Decisions Needed

### Audio Caching
**Question:** Should we cache generated audio to reduce API costs?

**Options:**
1. No caching (current)
2. In-memory cache (limited, session-only)
3. Database storage (persistent)
4. CDN storage (S3/CloudFront)

**Considerations:**
- Same question often asked multiple times
- ElevenLabs charges per character
- Storage vs API cost trade-off
- Cache invalidation strategy
- Privacy concerns (medical content)

**Recommendation:** Consider in-memory cache keyed by text hash for session duration.

---

### Voice Customization
**Question:** Should users be able to select different voices?

**Options:**
1. Single voice (current - Aria)
2. User preference (stored in profile)
3. Context-aware (formal vs casual)
4. Accessibility options (speed, pitch)

**Considerations:**
- User preference and comfort
- Accessibility requirements
- Additional API costs
- UI complexity

**Recommendation:** Add user preference after initial deployment validation.

---

### Audio Quality vs Bandwidth
**Question:** Is current audio quality (22050 Hz, 32 kbps) optimal?

**Current Settings:**
- Sample rate: 22050 Hz
- Bitrate: 32 kbps
- Format: MP3

**Considerations:**
- Mobile data usage
- Voice quality vs file size
- Page load performance
- User perception

**Recommendation:** Current settings appropriate for voice. Consider A/B testing if users report quality issues.

---

### Offline Support
**Question:** Should app work offline after initial load?

**Options:**
1. Require connection (current)
2. Cache responses for offline review
3. Service worker for offline functionality
4. Progressive Web App (PWA)

**Considerations:**
- Medical content accuracy (needs to be current)
- User expectations
- Development complexity
- Storage requirements

**Recommendation:** Low priority - medical content should be live for accuracy.

---

## Lessons Learned

### 1. Browser Policies Are Strict
**Learning:** Always test on production HTTPS with realistic security policies.
- Local development (HTTP) has relaxed autoplay rules
- Production (HTTPS) enforces strict policies
- User interaction required for audio

**Action:** Add production-like testing to CI/CD.

### 2. Environment Variables Are Critical
**Learning:** Missing or incorrect environment variables cause silent failures.
- WebSocket URL protocol matters (`ws://` vs `wss://`)
- CORS origins must match exactly
- API keys must be present in production environment

**Action:** Document all required environment variables with examples.

### 3. Logging Is Essential
**Learning:** Good logging saves debugging time.
- Backend logs show TTS generation status
- Frontend console logs show audio receipt
- Network tab shows WebSocket messages

**Action:** Keep comprehensive logging in production (with appropriate log levels).

---

## References

- [ElevenLabs API Documentation](https://elevenlabs.io/docs)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [HTML5 Audio Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio)
- [Browser Autoplay Policies](https://developer.chrome.com/blog/autoplay/)
- [Next.js Environment Variables](https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables)
- [Railway Documentation](https://docs.railway.app/)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
