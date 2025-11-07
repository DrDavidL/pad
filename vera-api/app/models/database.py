"""
SQLAlchemy models for database tables
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class ResearchID(Base):
    """Authorized research IDs for user access"""
    __tablename__ = "vera_research_ids"

    id = Column(Integer, primary_key=True, index=True)
    research_id = Column(String(50), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    sessions = relationship("UserSession", back_populates="research_user")
    disclaimers = relationship("DisclaimerAcknowledgment", back_populates="research_user")
    conversations = relationship("Conversation", back_populates="research_user")


class UserSession(Base):
    """Active user sessions with JWT tokens"""
    __tablename__ = "vera_user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    research_id_fk = Column(Integer, ForeignKey("vera_research_ids.id"), nullable=False)
    session_token = Column(String(500), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_active = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)

    # Relationships
    research_user = relationship("ResearchID", back_populates="sessions")


class DisclaimerAcknowledgment(Base):
    """Track when users acknowledge the research disclaimer"""
    __tablename__ = "vera_disclaimer_acknowledgments"

    id = Column(Integer, primary_key=True, index=True)
    research_id_fk = Column(Integer, ForeignKey("vera_research_ids.id"), nullable=False)
    acknowledged_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String(50), nullable=True)
    disclaimer_version = Column(String(10), default="1.0")

    # Relationships
    research_user = relationship("ResearchID", back_populates="disclaimers")


class Conversation(Base):
    """Chat messages for all users"""
    __tablename__ = "vera_conversations"

    id = Column(Integer, primary_key=True, index=True)
    research_id_fk = Column(Integer, ForeignKey("vera_research_ids.id"), nullable=False)
    conversation_id = Column(String(255), nullable=False, index=True)  # Format: conv_YYYYMMDDHHMMSS_RESEARCHID
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    role = Column(String(20), nullable=False)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    model_used = Column(String(100), nullable=True)  # Track which LLM was used
    audio_url = Column(String(500), nullable=True)  # Path to TTS audio file if generated

    # Provider tracking
    provider = Column(String(20), default="openai", nullable=True)  # 'elevenlabs' or 'openai'

    # ElevenLabs-specific fields
    elevenlabs_conversation_id = Column(String(255), nullable=True)
    elevenlabs_message_id = Column(String(255), nullable=True)

    # Relationships
    research_user = relationship("ResearchID", back_populates="conversations")

    # Indexes for efficient queries
    __table_args__ = (
        Index('ix_conversation_research_timestamp', 'conversation_id', 'timestamp'),
        Index('ix_research_timestamp', 'research_id_fk', 'timestamp'),
    )
