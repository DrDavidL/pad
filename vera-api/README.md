# Vera API - Multi-User FastAPI Backend

A FastAPI-based backend for the Vera P.A.D. educational chatbot, supporting multiple simultaneous users with research ID authentication.

## Features

- **Multi-user support** with research ID-based authentication
- **JWT token-based sessions**
- **WebSocket streaming** for real-time chat responses
- **Multiple LLM providers** (OpenAI GPT-4o/o3-mini, Groq Llama/Gemma)
- **Text-to-speech** via ElevenLabs (same voice as original Vera)
- **Disclaimer acknowledgment flow**
- **PostgreSQL** for conversation persistence
- **Admin dashboard** for managing research IDs

## Architecture

```
Frontend (React/Next.js - iPhone Messages UI)
    ↓ WebSocket / REST API
FastAPI Backend
    ├─ JWT Authentication
    ├─ Research ID Validation
    ├─ LLM Streaming (OpenAI, Groq)
    ├─ Text-to-Speech (ElevenLabs)
    └─ PostgreSQL Database
```

## Setup

### 1. Clone and Install

```bash
cd vera-api
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
# Edit .env with your actual API keys and database URL
```

### 3. Database Setup

```bash
# Run migrations to create tables
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

### 4. Seed Test Research IDs

```python
python -c "
from app.db.base import SessionLocal
from app.models.database import ResearchID

db = SessionLocal()
test_ids = ['RID001', 'RID002', 'RID003', 'RID004', 'RID005']
for rid in test_ids:
    if not db.query(ResearchID).filter(ResearchID.research_id == rid).first():
        db.add(ResearchID(research_id=rid, notes='Test ID', is_active=True))
db.commit()
print('Test research IDs created!')
"
```

### 5. Run Server

```bash
uvicorn app.main:app --reload --port 8000
```

API will be available at: `http://localhost:8000`
Interactive docs at: `http://localhost:8000/docs`

## API Endpoints

### Authentication

- `POST /api/v1/auth/validate-research-id` - Check if research ID is valid
- `POST /api/v1/auth/acknowledge-disclaimer` - Record disclaimer acknowledgment
- `POST /api/v1/auth/login` - Get JWT token (after validation + disclaimer)
- `GET /api/v1/auth/me` - Get current user info

### Chat

- `POST /api/v1/chat/message` - Send message (non-streaming)
- `POST /api/v1/chat/history` - Get conversation history
- `GET /api/v1/chat/conversations` - List recent conversations
- `WebSocket /api/v1/chat/ws/chat` - Real-time streaming chat

### Admin (requires admin password)

- `POST /api/v1/admin/research-ids` - Create research ID
- `GET /api/v1/admin/research-ids` - List all research IDs
- `PATCH /api/v1/admin/research-ids/{id}` - Update research ID
- `DELETE /api/v1/admin/research-ids/{id}` - Deactivate research ID
- `POST /api/v1/admin/stats` - Get system statistics

## User Flow

1. **Enter Research ID** → Validated against database
2. **Acknowledge Disclaimer** → "This is research only, not medical advice"
3. **Login** → Receive JWT token
4. **Chat Session** → Real-time streaming with Vera
5. **Voice Input** → Web Speech API → Text sent to backend
6. **TTS Response** → Audio generated and played

## Database Schema

### research_ids
- Research ID registry (authorized users)
- Tracks active/inactive status

### user_sessions
- Active JWT sessions
- Links research ID to token

### disclaimer_acknowledgments
- Audit trail of disclaimer acceptances

### conversations
- All chat messages
- Includes model used, audio URL, timestamps

## Development

### Running Tests

```bash
pytest tests/
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

## Deployment

### Docker (recommended)

```dockerfile
# Coming soon
```

### Manual Deployment

1. Set environment variables in production
2. Use PostgreSQL (not SQLite)
3. Set strong `SECRET_KEY`
4. Configure CORS_ORIGINS for your frontend domain
5. Use gunicorn/uvicorn with workers
6. Set up HTTPS (nginx/Caddy reverse proxy)

## License

Same as original Vera project
