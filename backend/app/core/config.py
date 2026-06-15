"""
Application configuration management using Pydantic Settings.
All environment variables are validated and typed here.
Supports .env file loading. No secrets are hardcoded.
"""
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central configuration for CarbonWise AI backend.
    Values are read from environment variables or .env file.
    All AI features require GEMINI_API_KEY to be set.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────────────────
    APP_NAME: str = "CarbonWise AI"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "AI-powered carbon footprint awareness platform"
    DEBUG: bool = Field(default=False)
    ENVIRONMENT: Literal["development", "staging", "production"] = "production"

    # ── Server ─────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1
    RELOAD: bool = False

    # ── CORS ───────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:3001",
            "https://*.carbonwise.ai",
        ]
    )

    # ── AI / Gemini 2.5 Flash ──────────────────────────────────────────────
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini 2.5 Flash API Key")
    GEMINI_MODEL: str = "gemini-2.5-flash-preview-05-20"
    GEMINI_MAX_TOKENS: int = 2048
    GEMINI_TEMPERATURE: float = Field(default=0.7, ge=0.0, le=2.0)
    GEMINI_TIMEOUT_SECONDS: int = 60

    # ── Rate Limiting ──────────────────────────────────────────────────────
    RATE_LIMIT_COPILOT: str = "20/minute"
    RATE_LIMIT_ANALYSIS: str = "30/minute"
    RATE_LIMIT_DOCUMENT: str = "10/minute"
    RATE_LIMIT_DEFAULT: str = "60/minute"

    # ── File Upload ────────────────────────────────────────────────────────
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_MIME_TYPES: list[str] = Field(
        default=[
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/gif",
        ]
    )

    # ── Data Paths ─────────────────────────────────────────────────────────
    DATA_DIR: Path = Path("data")
    EMISSION_FACTORS_FILE: str = "emission_factors.json"
    KNOWLEDGE_BASE_FILE: str = "sustainability_knowledge.json"

    # ── Logging ────────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: Literal["json", "console"] = "json"
    LOG_REQUEST_BODY: bool = False  # Never log bodies in production

    # ── Security ───────────────────────────────────────────────────────────
    MAX_PROMPT_LENGTH: int = 2000
    ENABLE_PROMPT_INJECTION_PROTECTION: bool = True

    @field_validator("GEMINI_API_KEY")
    @classmethod
    def validate_api_key(cls, v: str) -> str:
        """Warn if API key is missing but don't fail startup."""
        if not v:
            import warnings
            warnings.warn(
                "GEMINI_API_KEY is not set. AI features will be unavailable.",
                stacklevel=2,
            )
        return v

    @property
    def max_file_size_bytes(self) -> int:
        """Return max file size in bytes."""
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    @property
    def emission_factors_path(self) -> Path:
        """Full path to emission factors file."""
        return self.DATA_DIR / self.EMISSION_FACTORS_FILE

    @property
    def knowledge_base_path(self) -> Path:
        """Full path to knowledge base file."""
        return self.DATA_DIR / self.KNOWLEDGE_BASE_FILE

    @property
    def is_production(self) -> bool:
        """True if running in production environment."""
        return self.ENVIRONMENT == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Return cached Settings instance.
    Use this as a FastAPI dependency for performance.
    """
    return Settings()
