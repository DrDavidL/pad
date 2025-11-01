"""
Pydantic schemas for authentication and authorization
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ResearchIDValidate(BaseModel):
    """Request to validate a research ID"""
    research_id: str = Field(..., min_length=3, max_length=50)


class ResearchIDResponse(BaseModel):
    """Response with research ID validation status"""
    valid: bool
    research_id: str
    message: str


class DisclaimerAcknowledge(BaseModel):
    """Request to acknowledge disclaimer"""
    research_id: str
    acknowledged: bool = True
    ip_address: Optional[str] = None


class DisclaimerResponse(BaseModel):
    """Response after disclaimer acknowledgment"""
    success: bool
    acknowledged_at: datetime
    message: str


class Token(BaseModel):
    """JWT access token response"""
    access_token: str
    token_type: str = "bearer"
    research_id: str
    expires_at: datetime


class TokenData(BaseModel):
    """Data encoded in JWT token"""
    research_id: str
    session_id: int
    exp: Optional[datetime] = None


class SessionCreate(BaseModel):
    """Create new user session"""
    research_id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class SessionResponse(BaseModel):
    """Session information"""
    session_id: int
    research_id: str
    created_at: datetime
    last_active: datetime

    class Config:
        from_attributes = True
