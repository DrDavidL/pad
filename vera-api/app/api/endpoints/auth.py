"""
Authentication and authorization endpoints
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.models.database import ResearchID, UserSession, DisclaimerAcknowledgment
from app.schemas.auth import (
    ResearchIDValidate,
    ResearchIDResponse,
    DisclaimerAcknowledge,
    DisclaimerResponse,
    Token,
    SessionCreate
)
from app.core.security import create_access_token, get_current_user
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


@router.post("/validate-research-id", response_model=ResearchIDResponse)
async def validate_research_id(
    data: ResearchIDValidate,
    db: Session = Depends(get_db)
):
    """Validate if a research ID exists and is active"""
    research_user = db.query(ResearchID).filter(
        ResearchID.research_id == data.research_id,
        ResearchID.is_active == True
    ).first()

    if research_user:
        return ResearchIDResponse(
            valid=True,
            research_id=data.research_id,
            message="Research ID is valid"
        )
    else:
        return ResearchIDResponse(
            valid=False,
            research_id=data.research_id,
            message="Research ID not found or inactive"
        )


@router.post("/acknowledge-disclaimer", response_model=DisclaimerResponse)
async def acknowledge_disclaimer(
    data: DisclaimerAcknowledge,
    request: Request,
    db: Session = Depends(get_db)
):
    """Record that user has acknowledged the disclaimer"""
    # Verify research ID exists
    research_user = db.query(ResearchID).filter(
        ResearchID.research_id == data.research_id,
        ResearchID.is_active == True
    ).first()

    if not research_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research ID not found or inactive"
        )

    # Get client IP
    client_ip = data.ip_address or request.client.host

    # Create disclaimer acknowledgment record
    disclaimer = DisclaimerAcknowledgment(
        research_id_fk=research_user.id,
        ip_address=client_ip
    )

    db.add(disclaimer)
    db.commit()
    db.refresh(disclaimer)

    return DisclaimerResponse(
        success=True,
        acknowledged_at=disclaimer.acknowledged_at,
        message="Disclaimer acknowledged successfully"
    )


@router.post("/login", response_model=Token)
async def login(
    data: SessionCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Create session and return JWT token
    Should be called after research ID validation and disclaimer acknowledgment
    """
    # Verify research ID exists and is active
    research_user = db.query(ResearchID).filter(
        ResearchID.research_id == data.research_id,
        ResearchID.is_active == True
    ).first()

    if not research_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research ID not found or inactive"
        )

    # Check if disclaimer has been acknowledged
    disclaimer = db.query(DisclaimerAcknowledgment).filter(
        DisclaimerAcknowledgment.research_id_fk == research_user.id
    ).first()

    if not disclaimer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Must acknowledge disclaimer before logging in"
        )

    # Create user session
    client_ip = data.ip_address or request.client.host
    user_agent = data.user_agent or request.headers.get("user-agent", "")

    session = UserSession(
        research_id_fk=research_user.id,
        session_token="",  # Will be updated after token creation
        ip_address=client_ip,
        user_agent=user_agent
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    # Create JWT token
    token_data = {
        "research_id": data.research_id,
        "session_id": session.id
    }

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data=token_data,
        expires_delta=access_token_expires
    )

    # Update session with token
    session.session_token = access_token
    db.commit()

    expires_at = datetime.utcnow() + access_token_expires

    return Token(
        access_token=access_token,
        token_type="bearer",
        research_id=data.research_id,
        expires_at=expires_at
    )


@router.get("/me")
async def get_current_user_info(
    current_user: ResearchID = Depends(get_current_user)
):
    """Get information about currently authenticated user"""
    return {
        "research_id": current_user.research_id,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }
