# VERA System Architecture

## High-Level Overview

VERA is a conversational AI education assistant for Peripheral Artery Disease (P.A.D.), deployed as a distributed web application with real-time audio capabilities.

```
┌─────────────────────────────────────────────────────────────────┐
│                          User Browser                            │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  React/Next.js │  │  WebSocket   │  │  HTML5 Audio     │   │
│  │  Frontend      │←→│  Connection  │←→│  Playback        │   │
│  └────────────────┘  └──────────────┘  └──────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS/WSS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Railway (Backend Server)                      │
│  ┌────────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │  FastAPI   │→│  LLM     │→│   TTS    │→│  WebSocket  │  │
│  │  REST API  │  │  Service │  │  Service │  │  Server     │  │
│  └────────────┘  └──────────┘  └──────────┘  └─────────────┘  │
└──────┬────────────────┬─────────────┬──────────────────────────┘
       │                │             │
       │ HTTPS          │ HTTPS       │ HTTPS
       ▼                ▼             ▼
┌──────────────┐  ┌──────────┐  ┌──────────────┐
│  Neon DB     │  │ OpenAI   │  │ ElevenLabs   │
│  PostgreSQL  │  │ GPT-4o   │  │ TTS API      │
└──────────────┘  └──────────┘  └──────────────┘
```

---

## Component Architecture

### Frontend (vera-frontend)

**Technology Stack:**
- **Framework:** Next.js 15 (React 18)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Build:** Vercel
- **Deployment:** Vercel Edge Network

**Key Components:**

1. **Authentication Flow:**
   - [ResearchIDScreen.tsx](vera-frontend/components/ResearchIDScreen.tsx) - Research ID validation
   - [DisclaimerScreen.tsx](vera-frontend/components/DisclaimerScreen.tsx) - Disclaimer acceptance
   - JWT token management

2. **Chat Interface:**
   - [ChatInterface.tsx](vera-frontend/components/ChatInterface.tsx) - Main chat UI
   - [IPhoneFrame.tsx](vera-frontend/components/IPhoneFrame.tsx) - Device frame wrapper
   - Message display and input handling

3. **Real-time Communication:**
   - [useWebSocket.ts](vera-frontend/hooks/useWebSocket.ts) - WebSocket hook
   - Auto-reconnection logic
   - Message queueing

4. **Audio System:**
   - HTML5 Audio element
   - Base64 data URL playback
   - Autoplay policy compliance
   - Web Speech API (voice input)

**File Structure:**
```
vera-frontend/
├── app/
│   ├── page.tsx              # Main app entry
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── ChatInterface.tsx     # 489 lines - Main chat
│   ├── IPhoneFrame.tsx       # Device wrapper
│   ├── ResearchIDScreen.tsx  # Auth step 1
│   └── DisclaimerScreen.tsx  # Auth step 2
├── hooks/
│   └── useWebSocket.ts       # 130 lines - WS management
├── lib/
│   └── api.ts                # REST API client
└── types/
    └── index.ts              # TypeScript definitions
```

---

### Backend (vera-api)

**Technology Stack:**
- **Framework:** FastAPI (Python 3.11)
- **ORM:** SQLAlchemy
- **Database:** PostgreSQL (Neon)
- **Migrations:** Alembic
- **Deployment:** Railway

**Key Modules:**

1. **API Layer:**
   - [app/main.py](vera-api/app/main.py) - Application entry point
   - [app/api/endpoints/auth.py](vera-api/app/api/endpoints/auth.py) - Authentication endpoints
   - [app/api/endpoints/chat.py](vera-api/app/api/endpoints/chat.py) - Chat WebSocket endpoint

2. **Services:**
   - [app/services/conversation_service.py](vera-api/app/services/conversation_service.py) - Message persistence
   - [app/services/tts_service.py](vera-api/app/services/tts_service.py) - Text-to-speech generation

3. **Data Layer:**
   - [app/models/database.py](vera-api/app/models/database.py) - SQLAlchemy models
   - [app/schemas/](vera-api/app/schemas/) - Pydantic schemas
   - [app/core/database.py](vera-api/app/core/database.py) - Database connection

4. **Configuration:**
   - [app/core/config.py](vera-api/app/core/config.py) - Settings management
   - Environment-based configuration
   - API key management

**File Structure:**
```
vera-api/
├── app/
│   ├── main.py                    # FastAPI app
│   ├── api/
│   │   └── endpoints/
│   │       ├── auth.py            # Authentication
│   │       └── chat.py            # WebSocket chat
│   ├── services/
│   │   ├── conversation_service.py
│   │   └── tts_service.py
│   ├── models/
│   │   └── database.py            # ORM models
│   ├── schemas/
│   │   ├── auth.py
│   │   ├── conversation.py
│   │   └── research.py
│   └── core/
│       ├── config.py              # Configuration
│       ├── database.py            # DB connection
│       └── security.py            # JWT handling
├── alembic/
│   └── versions/                  # Database migrations
├── requirements.txt
└── railway.toml                   # Railway config
```

---

## Data Flow

### 1. Authentication Flow

```
User Browser
    │
    │ 1. Enter Research ID
    ▼
POST /api/v1/auth/validate-research-id
    │
    │ 2. Validate in DB
    ▼
ResearchID Model (PostgreSQL)
    │
    │ 3. Return validation
    ▼
POST /api/v1/auth/acknowledge-disclaimer
    │
    │ 4. Record acknowledgment
    ▼
POST /api/v1/auth/login
    │
    │ 5. Generate JWT token
    ▼
User Browser (store in localStorage)
```

### 2. Chat Message Flow

```
User Types Message
    │
    │ 1. Send via WebSocket
    ▼
WS: /api/v1/chat/ws/chat
    │
    │ 2. Authenticate JWT
    ▼
ConversationService.save_message()
    │
    │ 3. Save to DB
    ▼
OpenAI GPT-4o API
    │
    │ 4. Stream LLM response
    ▼
WebSocket chunks (type: "chunk")
    │
    │ 5. Stream to frontend
    ▼
Browser Display (real-time)
    │
    │ 6. Complete response
    ▼
WebSocket (type: "complete")
    │
    │ 7. Generate TTS
    ▼
ElevenLabs API
    │
    │ 8. MP3 audio bytes
    ▼
Base64 Encode
    │
    │ 9. Send via WebSocket
    ▼
WebSocket (type: "audio")
    │
    │ 10. Play audio
    ▼
HTML5 Audio Element
```

### 3. Audio Generation Pipeline

```
Complete LLM Response
    │
    │ Text content
    ▼
TTSService.generate_speech()
    │
    │ POST to ElevenLabs
    ▼
ElevenLabs API
    │ Parameters:
    │ - Voice: Aria (9BWtsMINqrJLrRacOk9x)
    │ - Model: eleven_multilingual_v2
    │ - Format: mp3_22050_32
    │ - Settings: High stability & similarity
    ▼
MP3 Audio Stream
    │
    │ Chunks received
    ▼
Save to /tmp/audio_files/tts_*.mp3
    │
    │ Read file
    ▼
Base64 Encode (audio_bytes)
    │
    │ ~33% size increase
    ▼
WebSocket JSON Message
    │ {
    │   "type": "audio",
    │   "audio_base64": "SUQzBAAAAAAAI...",
    │   "audio_url": "/tmp/audio_files/tts_abc123.mp3"
    │ }
    ▼
Frontend WebSocket Handler
    │
    │ Parse JSON
    ▼
playAudio(base64Audio)
    │
    │ Create data URL
    ▼
audioRef.src = "data:audio/mp3;base64,..."
    │
    │ HTML5 Audio API
    ▼
audioRef.play()
    │
    │ Browser codec
    ▼
Audio Output (speakers)
```

---

## Database Schema

### Core Tables

**research_ids**
```sql
CREATE TABLE research_ids (
    id SERIAL PRIMARY KEY,
    research_id VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    disclaimer_acknowledged BOOLEAN DEFAULT FALSE,
    disclaimer_acknowledged_at TIMESTAMP
);
```

**conversations**
```sql
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    research_id VARCHAR(50) NOT NULL,
    conversation_id VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (research_id) REFERENCES research_ids(research_id)
);
```

**messages**
```sql
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,  -- 'user' or 'assistant'
    content TEXT NOT NULL,
    audio_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id)
);
```

---

## API Endpoints

### REST Endpoints

**Authentication:**
```
POST /api/v1/auth/validate-research-id
  Body: { "research_id": "RID001" }
  Returns: { "valid": true, "disclaimer_required": true }

POST /api/v1/auth/acknowledge-disclaimer
  Body: { "research_id": "RID001" }
  Returns: { "acknowledged": true }

POST /api/v1/auth/login
  Body: { "research_id": "RID001" }
  Returns: { "access_token": "eyJ...", "token_type": "bearer" }
```

**Chat History:**
```
POST /api/v1/chat/history
  Headers: { "Authorization": "Bearer eyJ..." }
  Body: {
    "research_id": "RID001",
    "conversation_id": "RID001_20250101_123456",
    "limit": 50
  }
  Returns: {
    "messages": [
      {
        "role": "user",
        "content": "What is P.A.D.?",
        "timestamp": "2025-01-01T12:34:56Z"
      },
      ...
    ]
  }
```

**Health Check:**
```
GET /health
  Returns: { "status": "healthy" }
```

### WebSocket Endpoint

**Chat Connection:**
```
WS /api/v1/chat/ws/chat

Client → Server:
{
  "token": "eyJ...",
  "research_id": "RID001",
  "conversation_id": "RID001_20250101_123456",
  "message": "What is P.A.D.?",
  "model": "gpt-4o"
}

Server → Client (streaming):
{
  "type": "user_message_saved",
  "message_id": 123
}

{
  "type": "chunk",
  "content": "Peripheral Artery Disease"
}

{
  "type": "chunk",
  "content": " (P.A.D.) is..."
}

{
  "type": "complete",
  "full_response": "Peripheral Artery Disease (P.A.D.) is..."
}

{
  "type": "audio",
  "audio_base64": "SUQzBAAAAAAAI...",
  "audio_url": "/tmp/audio_files/tts_abc123.mp3"
}
```

---

## Security Architecture

### Authentication
- **JWT Tokens:** HS256 algorithm, 24-hour expiration
- **Token Storage:** Browser localStorage
- **Token Validation:** Every WebSocket message
- **Research ID:** Unique identifier, pre-seeded in database

### API Security
- **CORS:** Configured origins only
- **Rate Limiting:** (TODO: Not yet implemented)
- **HTTPS Only:** Production enforces TLS
- **WebSocket Security:** WSS (WebSocket Secure) in production

### Data Protection
- **Database:** PostgreSQL with SSL (Neon)
- **API Keys:** Environment variables, never committed
- **Secrets Rotation:** Manual process (should be automated)
- **PII Handling:** Research IDs anonymized, no personal data

### Network Security
```
Browser (HTTPS) → Vercel CDN (TLS) → Railway (TLS) → Neon (SSL)
                                   ↓
                              ElevenLabs (HTTPS)
                              OpenAI (HTTPS)
```

---

## Deployment Architecture

### Production Environment

**Frontend (Vercel):**
- **Region:** Global Edge Network
- **Build:** Next.js production build
- **Caching:** Automatic CDN caching
- **SSL:** Automatic TLS certificates
- **Environment:** Serverless functions

**Backend (Railway):**
- **Region:** US East
- **Runtime:** Python 3.11 container
- **Storage:** Ephemeral filesystem (/tmp)
- **Scaling:** Vertical scaling (no horizontal yet)
- **Health Checks:** /health endpoint every 30s

**Database (Neon):**
- **Region:** US East 2 (AWS)
- **Type:** Serverless PostgreSQL
- **Backups:** Automatic daily backups
- **Scaling:** Auto-scaling storage and compute

### CI/CD Pipeline

```
Git Push to main
    │
    ├─→ Vercel Build
    │   ├── npm install
    │   ├── npm run build
    │   ├── Deploy to Edge
    │   └── Update deployment URL
    │
    └─→ Railway Build
        ├── pip install -r requirements.txt
        ├── alembic upgrade head (migrations)
        ├── uvicorn app.main:app
        └── Health check validation
```

**Build Times:**
- Frontend: ~2-3 minutes
- Backend: ~3-5 minutes

---

## Performance Characteristics

### Frontend
- **Initial Load:** ~1-2s (Next.js SSR)
- **WebSocket Connect:** ~200-500ms
- **Message Send:** ~50-100ms
- **LLM Response:** 2-5s (streaming)
- **Audio Generation:** 1-3s
- **Audio Playback:** Immediate

### Backend
- **API Response:** ~50-200ms (REST)
- **WebSocket Latency:** ~50-100ms
- **Database Query:** ~50-100ms
- **LLM API:** 2-5s (OpenAI)
- **TTS API:** 1-3s (ElevenLabs)

### Bottlenecks
1. **LLM Generation:** 2-5s (external API)
2. **TTS Generation:** 1-3s (external API)
3. **Database Writes:** ~50ms (acceptable)
4. **WebSocket Overhead:** Minimal (~10ms)

### Optimization Opportunities
- [ ] Cache frequent questions/responses
- [ ] Parallel LLM and TTS generation
- [ ] Audio file caching by text hash
- [ ] Database connection pooling
- [ ] CDN for static audio files

---

## Scalability Considerations

### Current Limits
- **Concurrent Users:** ~100 (Railway container limits)
- **Database Connections:** 20 (Neon free tier)
- **WebSocket Connections:** ~1000 per instance
- **Storage:** Ephemeral (cleared on restart)

### Scaling Strategy

**Horizontal Scaling (Future):**
```
Load Balancer
    │
    ├─→ Railway Instance 1
    ├─→ Railway Instance 2
    └─→ Railway Instance 3
         ↓
    Redis (Session Store)
         ↓
    PostgreSQL (Shared DB)
```

**Vertical Scaling (Current):**
- Increase Railway container resources
- Upgrade Neon database tier
- Enable Vercel Pro features

**Cost Estimates:**
- **Vercel:** Free tier → $20/mo Pro
- **Railway:** $5/mo → $20/mo for more resources
- **Neon:** Free tier → $19/mo for higher limits
- **ElevenLabs:** ~$0.20 per 1000 characters
- **OpenAI:** ~$0.01 per 1000 tokens

---

## Monitoring and Observability

### Logs
- **Frontend:** Vercel Function Logs
- **Backend:** Railway Deployment Logs
- **Database:** Neon Query Logs

### Metrics (Future)
- [ ] Response time per endpoint
- [ ] WebSocket connection count
- [ ] Audio generation success rate
- [ ] Error rates and types
- [ ] User session duration

### Alerts (Future)
- [ ] Backend health check failures
- [ ] Database connection errors
- [ ] API quota exceeded
- [ ] High error rates

---

## Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** |
| Framework | Next.js | 15 | React framework |
| Language | TypeScript | 5.x | Type safety |
| Styling | Tailwind CSS | 4.x | Utility CSS |
| Deployment | Vercel | - | Edge hosting |
| **Backend** |
| Framework | FastAPI | 0.115+ | Python API framework |
| Language | Python | 3.11 | Server logic |
| ORM | SQLAlchemy | 2.0+ | Database ORM |
| Migrations | Alembic | 1.13+ | DB versioning |
| Deployment | Railway | - | Container hosting |
| **Database** |
| Database | PostgreSQL | 15+ | Relational DB |
| Provider | Neon | - | Serverless Postgres |
| **External APIs** |
| LLM | OpenAI GPT-4o | - | Conversational AI |
| TTS | ElevenLabs | v2 | Text-to-speech |
| Alt LLM | Groq | - | Fast inference |
| **Communication** |
| Protocol | WebSocket | - | Real-time bidirectional |
| Protocol | REST/HTTP | - | Request-response |
| Audio | HTML5 Audio | - | Browser playback |
| Voice Input | Web Speech API | - | Speech recognition |

---

## Future Architecture Improvements

### Short-term (1-3 months)
- [ ] Add Redis for session management
- [ ] Implement response caching
- [ ] Add structured logging
- [ ] Set up monitoring/alerts
- [ ] Implement rate limiting

### Medium-term (3-6 months)
- [ ] Horizontal scaling with load balancer
- [ ] Audio file CDN storage
- [ ] Advanced analytics dashboard
- [ ] A/B testing framework
- [ ] Mobile app (React Native)

### Long-term (6-12 months)
- [ ] Multi-region deployment
- [ ] Real-time collaboration features
- [ ] Voice-only mode (phone call)
- [ ] Offline-first PWA
- [ ] Advanced personalization
- [ ] Multi-language support

---

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [WebSocket RFC 6455](https://tools.ietf.org/html/rfc6455)
- [HTML5 Audio API](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement)
- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
- [ElevenLabs API Docs](https://elevenlabs.io/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
