"""
Security utilities for JWT tokens and password hashing
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.base import get_db
from app.models.database import ResearchID, UserSession
from app.schemas.auth import TokenData

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> TokenData:
    """Verify and decode JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        research_id: str = payload.get("research_id")
        session_id: int = payload.get("session_id")

        if research_id is None or session_id is None:
            raise credentials_exception

        return TokenData(research_id=research_id, session_id=session_id)
    except JWTError:
        raise credentials_exception


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> ResearchID:
    """Get current authenticated user from JWT token"""
    token = credentials.credentials
    token_data = verify_token(token)

    # Verify research ID exists and is active
    research_user = db.query(ResearchID).filter(
        ResearchID.research_id == token_data.research_id,
        ResearchID.is_active == True
    ).first()

    if research_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Research ID not found or inactive"
        )

    # Update session last_active time
    session = db.query(UserSession).filter(
        UserSession.id == token_data.session_id
    ).first()

    if session:
        session.last_active = datetime.utcnow()
        db.commit()

    return research_user


def verify_admin_password(password: str) -> bool:
    """Verify admin password"""
    if not settings.ADMIN_PASSWORD:
        return False
    return password == settings.ADMIN_PASSWORD
