# Vera API - Quick Start Guide

## Prerequisites

- Python 3.11+
- PostgreSQL database (already configured with Neon)
- API keys (already in `.env`)

## Installation & Setup

### 1. Activate Virtual Environment

```bash
cd /Users/david/GitHub/pad
source .venv/bin/activate
```

### 2. Navigate to API Directory

```bash
cd vera-api
```

### 3. Verify Dependencies

All dependencies should already be installed. If needed:

```bash
pip install -r requirements.txt
```

### 4. Database is Ready

✅ Migrations applied
✅ Tables created: `vera_research_ids`, `vera_user_sessions`, `vera_disclaimer_acknowledgments`, `vera_conversations`
✅ 10 test research IDs seeded (RID001-RID010)

## Running the Server

### Start the API Server

```bash
cd /Users/david/GitHub/pad/vera-api
source ../venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Server will be available at:
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Testing the API

### Option 1: Run Test Script

```bash
python test_api.py
```

This tests the complete user flow:
1. Validate research ID
2. Acknowledge disclaimer
3. Login and get JWT token
4. Send message to Vera
5. Retrieve conversation history
6. View admin statistics

### Option 2: Interactive API Docs

1. Open http://localhost:8000/docs in your browser
2. Try the endpoints interactively:
   - Start with `/api/v1/auth/validate-research-id`
   - Use research ID: `RID001`
   - Follow the flow: validate → disclaimer → login → chat

### Option 3: cURL Examples

```bash
# 1. Validate Research ID
curl -X POST http://localhost:8000/api/v1/auth/validate-research-id \
  -H "Content-Type: application/json" \
  -d '{"research_id": "RID001"}'

# 2. Acknowledge Disclaimer
curl -X POST http://localhost:8000/api/v1/auth/acknowledge-disclaimer \
  -H "Content-Type: application/json" \
  -d '{"research_id": "RID001", "acknowledged": true}'

# 3. Login (Get JWT Token)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"research_id": "RID001"}'

# Save the access_token from response, then:

# 4. Send Message
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "research_id": "RID001",
    "conversation_id": "conv_test_001",
    "content": "What is PAD?",
    "model": "gpt-4o"
  }'
```

## Available Research IDs

Pre-seeded test IDs (all active):
- **RID001** - Test research ID 001
- **RID002** - Test research ID 002
- **RID003** - Test research ID 003
- **RID004** - Test research ID 004
- **RID005** - Test research ID 005
- **RID006** - Test research ID 006
- **RID007** - Test research ID 007
- **RID008** - Test research ID 008
- **RID009** - Test research ID 009
- **RID010** - Test research ID 010

## API Endpoints Summary

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/validate-research-id` | Check if research ID is valid |
| POST | `/acknowledge-disclaimer` | Record disclaimer acknowledgment |
| POST | `/login` | Get JWT token |
| GET | `/me` | Get current user info |

### Chat (`/api/v1/chat`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/message` | Send message (non-streaming) |
| POST | `/history` | Get conversation history |
| GET | `/conversations` | List recent conversations |
| WebSocket | `/ws/chat` | Real-time streaming chat |

### Admin (`/api/v1/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/research-ids` | Create new research ID |
| GET | `/research-ids` | List all research IDs |
| PATCH | `/research-ids/{id}` | Update research ID |
| DELETE | `/research-ids/{id}` | Deactivate research ID |
| POST | `/stats` | Get system statistics |

**Admin Password**: `phPH3sA!` (from `.env`)

## Environment Variables

Already configured in `.env`:

```env
DATABASE_URL=postgresql://...          # Neon PostgreSQL
SECRET_KEY=vera-secret-key...          # JWT signing key
OPENAI_API_KEY=sk-...                  # GPT-4o, o3-mini
GROQ_API_KEY=gsk_...                   # Llama, Gemma
ELEVENLABS_API_KEY=sk_...              # Text-to-speech
ADMIN_PASSWORD=phPH3sA!                # Admin endpoints
```

## Troubleshooting

### Server won't start

**Error**: `ModuleNotFoundError`
```bash
# Make sure you're in the right directory
cd /Users/david/GitHub/pad/vera-api

# Activate venv
source ../venv/bin/activate

# Try starting again
uvicorn app.main:app --reload --port 8000
```

### Database connection error

**Error**: `could not connect to server`
- Check DATABASE_URL in `.env`
- Verify Neon database is accessible
- Test connection: `psql $DATABASE_URL`

### Port already in use

**Error**: `Address already in use`
```bash
# Kill existing process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use a different port
uvicorn app.main:app --reload --port 8001
```

### Import errors

**Error**: `cannot import name 'master_prompt'`
```bash
# Verify prompts file exists
ls -la app/prompts.py

# If missing, copy from original
cp ../new_prompt.py app/prompts.py
```

## Next Steps

### For Testing
1. ✅ Server is running at http://localhost:8000
2. ✅ Use Swagger UI at http://localhost:8000/docs
3. ✅ Run `python test_api.py` for automated testing
4. ✅ Try different research IDs (RID001-RID010)

### For Development
1. **Frontend Integration**
   - Connect React/Next.js app
   - Implement iPhone Messages UI
   - Add WebSocket for real-time chat
   - Integrate Web Speech API for voice input

2. **Additional Features**
   - Session persistence
   - Conversation export
   - Analytics dashboard
   - Rate limiting

3. **Deployment**
   - Deploy backend to Railway/Render
   - Deploy frontend to Vercel
   - Configure production environment variables
   - Set up monitoring

## Support

- **Documentation**: See `README.md` and `IMPLEMENTATION_SUMMARY.md`
- **API Docs**: http://localhost:8000/docs
- **Database Schema**: See `app/models/database.py`
- **Test Examples**: See `test_api.py`

## Quick Reference

```bash
# Start server
cd /Users/david/GitHub/pad/vera-api
source ../.venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Run tests
python test_api.py

# Check server status
curl http://localhost:8000/health

# View logs
# Server outputs to terminal in real-time

# Stop server
# Press Ctrl+C in terminal
```

## File Structure Quick Reference

```
vera-api/
├── app/
│   ├── main.py              # ← Start here for FastAPI app
│   ├── prompts.py           # ← Vera's personality & prompts
│   ├── api/endpoints/       # ← API routes
│   ├── services/            # ← LLM, TTS, conversation logic
│   └── models/database.py   # ← Database schema
├── .env                     # ← Environment variables
├── test_api.py              # ← Run this to test
└── README.md                # ← Full documentation
```

---

**You're all set!** 🚀

The Vera API is running and ready for frontend development or further testing.
