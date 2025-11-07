# ElevenLabs Integration Guide

## Overview

VERA now supports two AI provider modes:
- **⚡ ElevenLabs** (Default) - Ultra-low latency conversational AI
- **🤖 OpenAI** (Alternative) - Traditional WebSocket streaming

Users can toggle between modes with a button in the top-right corner of the chat interface.

## What Was Added

### 1. New Dependencies
```bash
npm install @elevenlabs/react lucide-react
```

### 2. New Component
- **`components/ElevenLabsChatInterface.tsx`** - Full chat interface using ElevenLabs SDK
  - Supports both text and voice modes
  - Automatic message syncing to backend API
  - Fixed layout for mobile (matching OpenAI version)
  - Microphone permission handling

### 3. Modified Files
- **`app/page.tsx`** - Added mode toggle and conditional rendering
- **`README.md`** - Updated documentation
- **`.env.local`** - Added `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`
- **`.env.example`** - Template for environment variables

## Configuration

### Environment Variables

Add to `.env.local`:
```env
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id_here
```

**Security Note**: This ID is already in `.gitignore` and will not be committed to git.
Get your Agent ID from https://elevenlabs.io/app/conversational-ai

### For Production

Update your deployment environment variables (Railway, Vercel, etc.):
```
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id_here
```

## How It Works

### ElevenLabs Mode (⚡)

**Voice Mode:**
1. User clicks green phone button
2. Microphone permission requested (first time only)
3. Connection established via WebRTC
4. User speaks, ElevenLabs transcribes + responds
5. Response plays via built-in TTS
6. Messages synced to backend API for data collection

**Text Mode:**
1. User types message and sends
2. Connection established via WebSocket (first message only)
3. ElevenLabs processes text and responds
4. No audio playback in text-only mode
5. Messages synced to backend API

### OpenAI Mode (🤖)

**Voice Mode:**
1. User clicks green phone button
2. Web Speech API starts listening
3. Speech transcribed locally
4. Sent to OpenAI via WebSocket
5. Streaming response + TTS audio playback
6. Speech recognition paused during audio playback (prevents feedback loop)

**Text Mode:**
1. User types and sends
2. Sent to OpenAI via WebSocket
3. Streaming response with chunked TTS

## Key Differences

| Feature | ElevenLabs ⚡ | OpenAI 🤖 |
|---------|--------------|-----------|
| Voice Latency | ~300-500ms | ~1-2s |
| Text Latency | ~500ms | ~1s |
| Voice Quality | Very natural | Good |
| Feedback Loop | Handled by SDK | Manual management |
| Turn-taking | Automatic | Manual (button-based) |
| Speaker Mode | Built-in | Manual volume control |
| Browser Support | Chrome, Edge (WebRTC) | All modern browsers |
| Cost | Per-conversation | Per-token |

## Message Syncing

Both modes sync messages to your backend API via:
```typescript
POST ${NEXT_PUBLIC_API_URL}/chat/message
{
  research_id: string,
  role: 'user' | 'assistant',
  content: string,
  timestamp: string,
  provider: 'elevenlabs' | 'openai'
}
```

**Note**: This endpoint may need to be created in your backend if it doesn't exist yet.

## Backend API Update Needed

You may need to add this endpoint to `vera-api`:

```python
@router.post("/message")
async def save_message(
    message: MessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Save a single message to conversation history"""
    # Save to database
    # Return success
    pass
```

## Testing Both Modes

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Navigate to the chat screen

3. **Test ElevenLabs (⚡)**:
   - Click green phone button
   - Allow microphone permissions
   - Speak: "What is peripheral artery disease?"
   - Listen to response
   - Try typing a message
   - Watch for lower latency

4. **Toggle to OpenAI (🤖)**:
   - Click "⚡ ElevenLabs" button (top-right)
   - Now shows "🤖 OpenAI"
   - Test voice and text modes
   - Compare latency and voice quality

## Troubleshooting

### ElevenLabs Mode

**Error: "ElevenLabs Agent ID not configured"**
- Check `.env.local` file exists
- Verify `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` is set
- Restart dev server (`npm run dev`)

**Error: "Please enable microphone permissions"**
- Grant mic access in browser settings
- Chrome: Settings → Privacy → Site Settings → Microphone
- Works best in Chrome/Edge (WebRTC required)

**Voice call doesn't start**
- Check browser console for errors
- Ensure HTTPS in production (WebRTC requirement)
- Try text mode first to verify agent ID

### OpenAI Mode

**Messages not sending**
- Check WebSocket connection in Network tab
- Verify backend is running
- Check `NEXT_PUBLIC_WS_URL` in `.env.local`

**Audio feedback loop**
- Ensure latest code (auto-mutes mic during playback)
- Check browser console for speech recognition errors

## Performance Comparison

Based on the sample code and SDK documentation:

**ElevenLabs Advantages:**
- ✅ Lower latency (300-500ms vs 1-2s)
- ✅ No feedback loop issues
- ✅ Automatic turn-taking
- ✅ Better voice quality
- ✅ Simpler implementation

**OpenAI Advantages:**
- ✅ More control over LLM parameters
- ✅ Works with existing backend
- ✅ Streaming visible in UI
- ✅ Broader browser support

## Recommendation

Start with **ElevenLabs mode** for testing voice conversations. The lower latency and automatic turn-taking provide a much better user experience. Use the toggle to compare both modes side-by-side.

## Future Improvements

- [ ] Add conversation history loading for ElevenLabs mode
- [ ] Sync ElevenLabs agent configuration with backend
- [ ] Add voice activity indicator
- [ ] Persist mode preference in localStorage
- [ ] Add analytics to compare usage between modes
- [ ] Create unified message format for both providers

## Support

For ElevenLabs-specific issues, refer to:
- [ElevenLabs React SDK Docs](https://elevenlabs.io/docs/conversational-ai/client-sdks/react)
- [ElevenLabs Dashboard](https://elevenlabs.io/app/conversational-ai)
