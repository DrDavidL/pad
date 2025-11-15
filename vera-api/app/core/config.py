"""
Application configuration settings
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
from typing import List, Union


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # API Settings
    PROJECT_NAME: str = "Vera API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database
    DATABASE_URL: str

    # LLM API Keys
    OPENAI_API_KEY: str
    GROQ_API_KEY: str
    OPENROUTER_API_KEY: str = ""

    # ElevenLabs
    ELEVENLABS_API_KEY: str
    ELEVENLABS_VOICE_ID: str = "9BWtsMINqrJLrRacOk9x"  # Aria voice
    ELEVENLABS_MODEL_ID: str = "eleven_multilingual_v2"

    # CORS - accepts comma-separated string or list
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://localhost:5173,https://vera-pad.vercel.app"

    # Admin
    ADMIN_PASSWORD: str = ""

    # Research IDs (used by seed script only)
    RESEARCH_IDS: str = ""

    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS_ORIGINS from comma-separated string to list"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance"""
    return Settings()
