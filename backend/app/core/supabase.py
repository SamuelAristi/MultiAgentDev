"""
Supabase Client Configuration
Provides authenticated client for database operations.
"""

from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings


@lru_cache
def get_supabase_client() -> Client:
    """
    Creates and caches a Supabase client instance.

    Returns:
        Authenticated Supabase client
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,  # Service role for backend operations
    )


# Singleton instance
supabase = get_supabase_client()
