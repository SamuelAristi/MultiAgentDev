"""
JWT Authentication Module
High-performance local JWT validation without external API calls.
"""

from datetime import datetime, timezone
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.config import settings
from app.core.supabase import supabase


# Security scheme
security = HTTPBearer(auto_error=False)


class TokenPayload(BaseModel):
    """Decoded JWT payload from Supabase."""

    sub: str  # User ID
    email: str | None = None
    role: str | None = None  # Supabase role (anon, authenticated, service_role)
    exp: int
    iat: int
    aud: str | None = None


class CurrentUser(BaseModel):
    """Authenticated user context."""

    id: str
    email: str | None = None
    role: str  # App role from profiles table (admin, user)
    organization_id: str | None = None


def decode_jwt(token: str) -> TokenPayload:
    """
    Decode and validate JWT locally without API call.

    Args:
        token: Raw JWT token string

    Returns:
        Decoded token payload

    Raises:
        HTTPException: If token is invalid or expired
    """
    if not settings.SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT secret not configured",
        )

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return TokenPayload(**payload)

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> CurrentUser:
    """
    FastAPI dependency to get the current authenticated user.

    Validates JWT locally, then fetches user profile from database.
    Profile is cached in memory for the request duration.

    Args:
        credentials: Bearer token from Authorization header

    Returns:
        CurrentUser with id, email, role, and organization_id

    Raises:
        HTTPException: 401 if not authenticated, 403 if profile not found
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Decode JWT locally (no API call)
    token_payload = decode_jwt(credentials.credentials)

    # Validate expiration
    now = datetime.now(timezone.utc).timestamp()
    if token_payload.exp < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user profile from database
    try:
        response = (
            supabase.table("profiles")
            .select("id, email, role, organization_id, deleted_at")
            .eq("id", token_payload.sub)
            .is_("deleted_at", "null")  # Respect soft delete
            .single()
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User profile not found or deactivated",
            )

        profile = response.data

        return CurrentUser(
            id=profile["id"],
            email=profile.get("email"),
            role=profile.get("role", "user"),
            organization_id=profile.get("organization_id"),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user profile: {str(e)}",
        )


async def get_current_admin(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> CurrentUser:
    """
    FastAPI dependency to require admin role.

    Args:
        current_user: Authenticated user from get_current_user

    Returns:
        CurrentUser if they are an admin

    Raises:
        HTTPException: 403 if user is not an admin
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# Type aliases for cleaner dependency injection
AuthenticatedUser = Annotated[CurrentUser, Depends(get_current_user)]
AdminUser = Annotated[CurrentUser, Depends(get_current_admin)]
