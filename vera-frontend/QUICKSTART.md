# VERA Frontend - Quick Start Guide

## Overview

The VERA frontend is now running and ready to use! This guide will help you test the complete application flow.

## What's Running

✅ **Backend API**: http://localhost:8000
   - FastAPI server with WebSocket support
   - Swagger docs: http://localhost:8000/docs

✅ **Frontend App**: http://localhost:3000
   - Next.js React application
   - iPhone Messages-style interface

## Testing the Application

### 1. Open the Application

Open your browser and navigate to:
```
http://localhost:3000
```

You should see an iPhone device frame with the Research ID entry screen.

### 2. Complete the Three-Screen Flow

#### Screen 1: Enter Research ID
- Type a test research ID: `RID001` (or RID002-RID010)
- Click "Continue"
- The backend will validate your ID

#### Screen 2: Acknowledge Disclaimer
- Read the disclaimer
- Check the acknowledgment box
- Click "I Agree - Continue to VERA"
- You'll receive a JWT token and proceed to chat

#### Screen 3: Chat with VERA
- Type a message like "What is PAD?" and press Enter
- Watch as VERA responds with streaming text (character by character)
- Listen to the automatic text-to-speech audio playback

### 3. Test Voice Input

Click the microphone button in the chat header:
- Grant microphone permissions if prompted
- Speak your question (e.g., "What causes peripheral artery disease?")
- The message will be transcribed and sent automatically
- VERA will respond with streaming text and audio

**Note**: Voice input requires Chrome or Edge browser

## Features to Try

### Text Chat
- Ask questions about P.A.D.
- See real-time streaming responses
- View message timestamps
- Scroll through conversation history

### Voice Interaction
- Click microphone button to record
- Speak naturally
- See automatic transcription
- Receive audio responses

### Session Persistence
- Close the browser tab
- Reopen http://localhost:3000
- Your session should resume automatically (token stored in localStorage)

## Troubleshooting

### Frontend Won't Load

Check if Next.js is running:
```bash
cd /Users/david/GitHub/pad/vera-frontend
npm run dev
```

### API Connection Errors

Check if backend is running:
```bash
cd /Users/david/GitHub/pad/vera-api
source ../.venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### WebSocket Connection Failed

1. Verify backend WebSocket endpoint is accessible
2. Check browser console for errors
3. Ensure CORS settings allow localhost:3000

### Voice Input Not Working

1. Use Chrome or Edge browser
2. Grant microphone permissions when prompted
3. Check browser console for errors
4. Try typing instead if voice fails

### Research ID Not Validating

Make sure you're using one of the seeded test IDs:
- RID001 through RID010

## Architecture Summary

```
┌─────────────────────────────────────────┐
│         Browser (localhost:3000)        │
│  ┌───────────────────────────────────┐  │
│  │      iPhone Device Frame          │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  Research ID Entry Screen   │  │  │
│  │  │          ↓                   │  │  │
│  │  │  Disclaimer Screen          │  │  │
│  │  │          ↓                   │  │  │
│  │  │  Chat Interface             │  │  │
│  │  │  - Messages UI              │  │  │
│  │  │  - Voice button             │  │  │
│  │  │  - WebSocket streaming      │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                  │
                  │ HTTP/WS
                  ↓
┌─────────────────────────────────────────┐
│     FastAPI Backend (localhost:8000)    │
│  ┌───────────────────────────────────┐  │
│  │ REST API Endpoints                │  │
│  │ - /auth/validate-research-id      │  │
│  │ - /auth/acknowledge-disclaimer    │  │
│  │ - /auth/login                     │  │
│  │ - /chat/history                   │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ WebSocket Endpoint                │  │
│  │ - /chat/ws/chat (streaming)       │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ Services                          │  │
│  │ - LLM (OpenAI/Groq)               │  │
│  │ - TTS (ElevenLabs)                │  │
│  │ - Database (PostgreSQL)           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## API Endpoints Being Used

### Authentication Flow
1. `POST /api/v1/auth/validate-research-id`
   - Validates research ID exists and is active

2. `POST /api/v1/auth/acknowledge-disclaimer`
   - Records disclaimer acceptance with timestamp

3. `POST /api/v1/auth/login`
   - Returns JWT token valid for 24 hours

### Chat Flow
4. `WebSocket ws://localhost:8000/api/v1/chat/ws/chat`
   - Sends: User message + token + research_id
   - Receives:
     - `user_message_saved` - Confirmation
     - `chunk` - Text chunks as LLM generates
     - `complete` - Full response
     - `audio` - Base64 MP3 audio

5. `POST /api/v1/chat/history`
   - Loads previous conversation messages

## Technology Stack

### Frontend
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Web Speech API** - Voice input
- **WebSocket** - Real-time streaming

### Backend
- **FastAPI** - Python web framework
- **PostgreSQL** - Database
- **OpenAI GPT-4o** - LLM
- **ElevenLabs** - TTS
- **JWT** - Authentication

## Next Steps

Now that everything is working:

1. **Customize the UI**: Edit components in `vera-frontend/components/`
2. **Adjust Colors**: Modify `tailwind.config.ts` colors
3. **Add Features**: Implement conversation history, user settings, etc.
4. **Deploy**:
   - Frontend → Vercel
   - Backend → Railway/Render
   - Update environment variables

## Support

If you encounter issues:

1. Check browser console for errors
2. Check backend logs in terminal
3. Verify both servers are running
4. Test API directly: http://localhost:8000/docs
5. Try a different research ID

## Test Credentials

Valid Research IDs:
- RID001, RID002, RID003, RID004, RID005
- RID006, RID007, RID008, RID009, RID010

All IDs are pre-seeded and active.

---

**You're all set!** 🚀

The VERA frontend is now fully functional with iPhone Messages-style UI, voice input, and real-time streaming chat.
