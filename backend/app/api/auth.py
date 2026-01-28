"""
Auth API Endpoints
User-facing authentication endpoints.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from supabase import create_client

from app.core.auth import AuthenticatedUser
from app.core.config import settings
from app.models.user import UserProfile

router = APIRouter(prefix="/auth", tags=["Auth"])

# Default organization for new users
DEFAULT_ORGANIZATION_ID = "11111111-1111-1111-1111-111111111111"


class RegisterRequest(BaseModel):
    """Public registration request."""
    email: EmailStr
    password: str
    full_name: str


class RegisterResponse(BaseModel):
    """Registration response."""
    id: str
    email: str
    message: str


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user (public)",
)
async def register_user(data: RegisterRequest):
    """
    Public endpoint to register a new user.

    Creates user with email auto-confirmed (no email verification needed).
    User is assigned 'user' role and default organization.
    """
    # Use service role to create user with confirmed email
    admin_client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )

    try:
        # Create auth user with email confirmed
        auth_response = admin_client.auth.admin.create_user(
            {
                "email": data.email,
                "password": data.password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": data.full_name,
                },
            }
        )

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user",
            )

        user_id = auth_response.user.id

        # Update profile with organization (trigger creates basic profile)
        admin_client.table("profiles").update({
            "full_name": data.full_name,
            "organization_id": DEFAULT_ORGANIZATION_ID,
            "role": "user",
        }).eq("id", user_id).execute()

        return RegisterResponse(
            id=user_id,
            email=data.email,
            message="User created successfully. You can now log in.",
        )

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "already been registered" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {error_msg}",
        )


@router.get(
    "/me",
    response_model=UserProfile,
    summary="Get current user profile",
)
async def get_current_user_profile(
    current_user: AuthenticatedUser,
):
    """
    Get the currently authenticated user's profile.

    Returns the user's ID, email, role, and organization.
    Useful for frontend to verify authentication state.
    """
    from app.core.supabase import supabase

    try:
        response = (
            supabase.table("profiles")
            .select("*")
            .eq("id", current_user.id)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )

        if not response.data:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found",
            )

        u = response.data
        return UserProfile(
            id=u["id"],
            email=u.get("email", ""),
            full_name=u.get("full_name"),
            role=u.get("role", "user"),
            organization_id=u.get("organization_id"),
            avatar_url=u.get("avatar_url"),
            created_at=u.get("created_at"),
            updated_at=u.get("updated_at"),
        )

    except Exception as e:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching profile: {str(e)}",
        )
