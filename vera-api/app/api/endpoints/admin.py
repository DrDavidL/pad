"""
Admin endpoints for managing research IDs and viewing statistics
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List
import os

from app.db.base import get_db
from app.models.database import ResearchID, UserSession, Conversation, DisclaimerAcknowledgment
from app.schemas.admin import (
    AdminAuth,
    ResearchIDCreate,
    ResearchIDUpdate,
    ResearchIDDetail,
    AdminStatsResponse
)
from app.core.security import verify_admin_password
from app.core.config import get_settings

router = APIRouter()


def verify_admin(auth: AdminAuth):
    """Dependency to verify admin authentication"""
    if not verify_admin_password(auth.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin password"
        )
    return True


@router.post("/research-ids", response_model=ResearchIDDetail)
async def create_research_id(
    data: ResearchIDCreate,
    auth: AdminAuth,
    db: Session = Depends(get_db)
):
    """Create a new research ID (admin only)"""
    verify_admin(auth)

    # Check if research ID already exists
    existing = db.query(ResearchID).filter(
        ResearchID.research_id == data.research_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Research ID already exists"
        )

    # Create new research ID
    research_id = ResearchID(
        research_id=data.research_id,
        notes=data.notes,
        is_active=data.is_active
    )

    db.add(research_id)
    db.commit()
    db.refresh(research_id)

    return ResearchIDDetail(
        id=research_id.id,
        research_id=research_id.research_id,
        created_at=research_id.created_at,
        is_active=research_id.is_active,
        notes=research_id.notes,
        total_sessions=0,
        total_messages=0,
        last_activity=None
    )


@router.get("/research-ids", response_model=List[ResearchIDDetail])
async def list_research_ids(
    auth: AdminAuth,
    db: Session = Depends(get_db),
    include_inactive: bool = False
):
    """List all research IDs (admin only)"""
    verify_admin(auth)

    query = db.query(ResearchID)
    if not include_inactive:
        query = query.filter(ResearchID.is_active == True)

    research_ids = query.all()

    result = []
    for rid in research_ids:
        # Get statistics
        total_sessions = db.query(UserSession).filter(
            UserSession.research_id_fk == rid.id
        ).count()

        total_messages = db.query(Conversation).filter(
            Conversation.research_id_fk == rid.id
        ).count()

        last_activity = db.query(func.max(Conversation.timestamp)).filter(
            Conversation.research_id_fk == rid.id
        ).scalar()

        result.append(ResearchIDDetail(
            id=rid.id,
            research_id=rid.research_id,
            created_at=rid.created_at,
            is_active=rid.is_active,
            notes=rid.notes,
            total_sessions=total_sessions,
            total_messages=total_messages,
            last_activity=last_activity
        ))

    return result


@router.patch("/research-ids/{research_id_str}", response_model=ResearchIDDetail)
async def update_research_id(
    research_id_str: str,
    data: ResearchIDUpdate,
    auth: AdminAuth,
    db: Session = Depends(get_db)
):
    """Update a research ID (admin only)"""
    verify_admin(auth)

    research_id = db.query(ResearchID).filter(
        ResearchID.research_id == research_id_str
    ).first()

    if not research_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research ID not found"
        )

    if data.is_active is not None:
        research_id.is_active = data.is_active
    if data.notes is not None:
        research_id.notes = data.notes

    db.commit()
    db.refresh(research_id)

    # Get statistics
    total_sessions = db.query(UserSession).filter(
        UserSession.research_id_fk == research_id.id
    ).count()

    total_messages = db.query(Conversation).filter(
        Conversation.research_id_fk == research_id.id
    ).count()

    last_activity = db.query(func.max(Conversation.timestamp)).filter(
        Conversation.research_id_fk == research_id.id
    ).scalar()

    return ResearchIDDetail(
        id=research_id.id,
        research_id=research_id.research_id,
        created_at=research_id.created_at,
        is_active=research_id.is_active,
        notes=research_id.notes,
        total_sessions=total_sessions,
        total_messages=total_messages,
        last_activity=last_activity
    )


@router.delete("/research-ids/{research_id_str}")
async def delete_research_id(
    research_id_str: str,
    auth: AdminAuth,
    db: Session = Depends(get_db)
):
    """Delete a research ID (admin only) - sets to inactive instead of deleting"""
    verify_admin(auth)

    research_id = db.query(ResearchID).filter(
        ResearchID.research_id == research_id_str
    ).first()

    if not research_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research ID not found"
        )

    # Set to inactive instead of deleting
    research_id.is_active = False
    db.commit()

    return {"message": f"Research ID {research_id_str} deactivated"}


@router.post("/stats", response_model=AdminStatsResponse)
async def get_system_stats(
    auth: AdminAuth,
    db: Session = Depends(get_db)
):
    """Get overall system statistics (admin only)"""
    verify_admin(auth)

    now = datetime.utcnow()
    twenty_four_hours_ago = now - timedelta(hours=24)

    stats = AdminStatsResponse(
        total_research_ids=db.query(ResearchID).count(),
        active_research_ids=db.query(ResearchID).filter(ResearchID.is_active == True).count(),
        total_sessions=db.query(UserSession).count(),
        active_sessions_24h=db.query(UserSession).filter(
            UserSession.last_active >= twenty_four_hours_ago
        ).count(),
        total_conversations=db.query(Conversation.conversation_id).distinct().count(),
        total_messages=db.query(Conversation).count(),
        messages_last_24h=db.query(Conversation).filter(
            Conversation.timestamp >= twenty_four_hours_ago
        ).count()
    )

    return stats


@router.post("/seed-research-ids")
async def seed_research_ids(
    auth: AdminAuth,
    db: Session = Depends(get_db)
):
    """Seed research IDs from RESEARCH_IDS environment variable (admin only)"""
    verify_admin(auth)

    settings = get_settings()
    research_ids_env = settings.RESEARCH_IDS

    if not research_ids_env:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="RESEARCH_IDS environment variable is empty"
        )

    # Parse comma-separated IDs
    ids_to_add = []
    for rid in research_ids_env.split(","):
        rid = rid.strip()
        if rid:
            ids_to_add.append(rid)

    if not ids_to_add:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid research IDs found in RESEARCH_IDS"
        )

    created = []
    skipped = []

    for research_id in ids_to_add:
        # Check if already exists
        existing = db.query(ResearchID).filter(
            ResearchID.research_id == research_id
        ).first()

        if existing:
            skipped.append(research_id)
            continue

        # Create new research ID
        new_rid = ResearchID(
            research_id=research_id,
            notes=f"Seeded from environment variable",
            is_active=True
        )
        db.add(new_rid)
        created.append(research_id)

    db.commit()

    return {
        "message": "Research IDs seeded successfully",
        "created": created,
        "skipped": skipped,
        "total_created": len(created),
        "total_skipped": len(skipped),
        "total_processed": len(created) + len(skipped)
    }
