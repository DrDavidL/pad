"""
Pydantic schemas for admin functionality
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class ResearchIDCreate(BaseModel):
    """Create new research ID"""
    research_id: str = Field(..., min_length=3, max_length=50)
    notes: Optional[str] = None
    is_active: bool = True


class ResearchIDUpdate(BaseModel):
    """Update existing research ID"""
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class ResearchIDDetail(BaseModel):
    """Detailed research ID information"""
    id: int
    research_id: str
    created_at: datetime
    is_active: bool
    notes: Optional[str]
    total_sessions: int = 0
    total_messages: int = 0
    last_activity: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminAuth(BaseModel):
    """Admin authentication"""
    password: str


class AdminStatsResponse(BaseModel):
    """Overall system statistics"""
    total_research_ids: int
    active_research_ids: int
    total_sessions: int
    active_sessions_24h: int
    total_conversations: int
    total_messages: int
    messages_last_24h: int
