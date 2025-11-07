# ElevenLabs Message Endpoint

Add this endpoint to your vera-api to handle message syncing from the ElevenLabs frontend.

## File: `app/api/routes/chat.py`

Add this endpoint to your existing chat router:

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MessageSaveRequest(BaseModel):
    research_id: str
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: str  # ISO format
    provider: str  # 'elevenlabs' or 'openai'
    elevenlabs_conversation_id: Optional[str] = None
    elevenlabs_message_id: Optional[str] = None

@router.post("/message")
async def save_message(
    request: MessageSaveRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Save a single message to conversation history from ElevenLabs or OpenAI.

    This endpoint is called by the frontend to sync messages to the database
    for research data collection purposes.
    """
    try:
        # Verify the research_id matches the authenticated user
        if current_user.get("research_id") != request.research_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

        # Parse timestamp
        timestamp = datetime.fromisoformat(request.timestamp.replace('Z', '+00:00'))

        # Save to database (adjust based on your database schema)
        # Example using SQLAlchemy:
        message = ConversationMessage(
            research_id=request.research_id,
            role=request.role,
            content=request.content,
            timestamp=timestamp,
            provider=request.provider,
            elevenlabs_conversation_id=request.elevenlabs_conversation_id,
            elevenlabs_message_id=request.elevenlabs_message_id,
        )

        db.add(message)
        db.commit()
        db.refresh(message)

        return {
            "success": True,
            "message_id": message.id,
            "timestamp": message.timestamp.isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to save message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save message: {str(e)}")
```

## Database Schema Update

You may need to add these fields to your conversation messages table:

```python
# In your database models file (e.g., app/models/conversation.py)

class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, index=True)
    research_id = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Provider tracking
    provider = Column(String, default='openai')  # 'elevenlabs' or 'openai'

    # ElevenLabs-specific fields
    elevenlabs_conversation_id = Column(String, nullable=True)
    elevenlabs_message_id = Column(String, nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
```

## Alembic Migration

Create a migration to add the new fields:

```bash
cd vera-api
alembic revision -m "Add ElevenLabs tracking fields"
```

Then edit the migration file:

```python
def upgrade():
    op.add_column('conversation_messages', sa.Column('provider', sa.String(), nullable=True))
    op.add_column('conversation_messages', sa.Column('elevenlabs_conversation_id', sa.String(), nullable=True))
    op.add_column('conversation_messages', sa.Column('elevenlabs_message_id', sa.String(), nullable=True))

    # Set default provider for existing messages
    op.execute("UPDATE conversation_messages SET provider = 'openai' WHERE provider IS NULL")

def downgrade():
    op.drop_column('conversation_messages', 'elevenlabs_message_id')
    op.drop_column('conversation_messages', 'elevenlabs_conversation_id')
    op.drop_column('conversation_messages', 'provider')
```

Run the migration:
```bash
alembic upgrade head
```

## Testing

Test the endpoint with curl:

```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "research_id": "RID001",
    "role": "user",
    "content": "What is peripheral artery disease?",
    "timestamp": "2025-01-08T12:00:00Z",
    "provider": "elevenlabs",
    "elevenlabs_conversation_id": "conv_abc123",
    "elevenlabs_message_id": "msg_xyz789"
  }'
```

Expected response:
```json
{
  "success": true,
  "message_id": 123,
  "timestamp": "2025-01-08T12:00:00+00:00"
}
```

## Notes

- The frontend will call this endpoint for both text and voice messages
- Messages are synced in real-time as the conversation progresses
- ElevenLabs provides conversation_id and message_id for tracking
- These IDs can be used to retrieve full conversation transcripts from ElevenLabs API if needed
