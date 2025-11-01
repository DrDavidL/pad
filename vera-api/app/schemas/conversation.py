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
