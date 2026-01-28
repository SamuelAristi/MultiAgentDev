"""
Application Configuration
Uses Pydantic Settings for type-safe environment variable management.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Project
    PROJECT_NAME: str = "MultiAgent Marketing Platform"
    DEBUG: bool = False

    # API
    API_V1_PREFIX: str = "/api/v1"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # JWT - Use Supabase JWT Secret for local validation
    # Find in: Supabase Dashboard > Project Settings > API > JWT Secret
    SUPABASE_JWT_SECRET: str = ""

    # OpenAI / Anthropic
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # Tavily (for web search)
    TAVILY_API_KEY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()


settings = get_settings()
