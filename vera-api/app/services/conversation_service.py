"""
Conversation management service
"""
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.database import Conversation, ResearchID
from app.schemas.conversation import MessageResponse


class ConversationService:
    """Service for managing conversations and messages"""

    @staticmethod
    def create_conversation_id(research_id: str) -> str:
        """Generate unique conversation ID"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        return f"conv_{timestamp}_{research_id}"

    @staticmethod
    def save_message(
        db: Session,
        research_id: str,
        conversation_id: str,
        role: str,
        content: str,
        model_used: Optional[str] = None,
        audio_url: Optional[str] = None
    ) -> Conversation:
        """Save a message to the database"""
        # Get research ID foreign key
        research_user = db.query(ResearchID).filter(
            ResearchID.research_id == research_id
        ).first()

        if not research_user:
            raise ValueError(f"Research ID {research_id} not found")

        message = Conversation(
            research_id_fk=research_user.id,
            conversation_id=conversation_id,
            role=role,
            content=content,
            model_used=model_used,
            audio_url=audio_url
        )

        db.add(message)
        db.commit()
        db.refresh(message)
        return message

    @staticmethod
    def get_conversation_history(
        db: Session,
        research_id: str,
        conversation_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[List[Conversation], int]:
        """
        Get conversation history for a research ID
        Returns (messages, total_count)
        """
        # Get research ID foreign key
        research_user = db.query(ResearchID).filter(
            ResearchID.research_id == research_id
        ).first()

        if not research_user:
            return [], 0

        query = db.query(Conversation).filter(
            Conversation.research_id_fk == research_user.id
        )

        if conversation_id:
            query = query.filter(Conversation.conversation_id == conversation_id)

        total = query.count()

        messages = query.order_by(
            Conversation.timestamp.asc()
        ).offset(offset).limit(limit).all()

        return messages, total

    @staticmethod
    def get_recent_conversations(
        db: Session,
        research_id: str,
        limit: int = 10
    ) -> List[str]:
        """Get list of recent conversation IDs for a research ID"""
        research_user = db.query(ResearchID).filter(
            ResearchID.research_id == research_id
        ).first()

        if not research_user:
            return []

        conversations = db.query(Conversation.conversation_id).filter(
            Conversation.research_id_fk == research_user.id
        ).distinct().order_by(
            desc(Conversation.timestamp)
        ).limit(limit).all()

        return [conv[0] for conv in conversations]

    def get_existing_elevenlabs_conversations(
        db: Session,
        research_id: str
    ) -> List[str]:
        """Get list of existing ElevenLabs conversation IDs for a research ID"""
        research_user = db.query(ResearchID).filter(
            ResearchID.research_id == research_id
        ).first()

        if not research_user:
            return []

        # Get distinct elevenlabs_conversation_id values that are not null
        conversations = db.query(Conversation.elevenlabs_conversation_id).filter(
            Conversation.research_id_fk == research_user.id,
            Conversation.elevenlabs_conversation_id.isnot(None)
        ).distinct().all()

        return [conv[0] for conv in conversations if conv[0]]


# Singleton instance
conversation_service = ConversationService()
