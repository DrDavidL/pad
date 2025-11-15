"""
Pydantic schemas for conversation/chat functionality
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Literal


class MessageCreate(BaseModel):
    """Request to send a chat message"""
    research_id: str
    conversation_id: str
    content: str = Field(..., min_length=1, max_length=10000)
    model: str = "gpt-4o"


class MessageResponse(BaseModel):
    """Response with assistant message"""
    id: int
    conversation_id: str
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime
    model_used: Optional[str] = None
    audio_url: Optional[str] = None

    class Config:
        from_attributes = True


class ConversationHistoryRequest(BaseModel):
    """Request conversation history"""
    research_id: str
    conversation_id: Optional[str] = None
    limit: int = Field(default=50, le=500)
    offset: int = Field(default=0, ge=0)


class ConversationHistoryResponse(BaseModel):
    """List of messages in conversation"""
    messages: List[MessageResponse]
    total: int
    research_id: str


class StreamChatRequest(BaseModel):
    """WebSocket chat streaming request"""
    research_id: str
    conversation_id: str
    message: str
    model: str = "gpt-4o"


class TTSRequest(BaseModel):
    """Request text-to-speech generation"""
    text: str = Field(..., min_length=1, max_length=5000)
    voice_id: Optional[str] = None
    model_id: Optional[str] = None


class TTSResponse(BaseModel):
    """TTS audio response"""
    audio_url: str
    duration_seconds: Optional[float] = None
    text_length: int


class MessageSaveRequest(BaseModel):
    """Request to save a message from frontend (ElevenLabs or OpenAI)"""
    research_id: str
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=10000)
    timestamp: str  # ISO format datetime string
    provider: Literal["elevenlabs", "openai"] = "openai"
    elevenlabs_conversation_id: Optional[str] = None
    elevenlabs_message_id: Optional[str] = None


class MessageSaveResponse(BaseModel):
    """Response after saving a message"""
    success: bool
    message_id: int
    timestamp: datetime


class ElevenLabsConversationSyncRequest(BaseModel):
    """Request to sync an ElevenLabs conversation"""
    research_id: str
    elevenlabs_conversation_id: str


class ElevenLabsConversationSyncResponse(BaseModel):
    """Response after syncing ElevenLabs conversation"""
    success: bool
    messages_synced: int
    conversation_id: str
