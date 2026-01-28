"""
Admin API Endpoints
Protected routes for user management and administration.
"""

from fastapi import APIRouter, HTTPException, Query, status
from supabase import create_client

from app.core.auth import AdminUser
from app.core.config import settings
from app.core.supabase import supabase
from app.models.user import (
    UserCreate,
    UserCreateResponse,
    UserListResponse,
    UserProfile,
    UserUpdate,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


def get_admin_client():
    """
    Get Supabase client with service role for admin operations.
    Service role bypasses RLS for user management.
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )


@router.post(
    "/users",
    response_model=UserCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",
)
async def create_user(
    user_data: UserCreate,
    admin: AdminUser,
):
    """
    Create a new user with email and password.

    Uses SERVICE_ROLE_KEY to bypass RLS and create both:
    1. Auth user in auth.users
    2. Profile in public.profiles

    Admin only endpoint.
    """
    admin_client = get_admin_client()

    try:
        # Step 1: Create auth user using admin API
        auth_response = admin_client.auth.admin.create_user(
            {
                "email": user_data.email,
                "password": user_data.password,
                "email_confirm": True,  # Auto-confirm email
                "user_metadata": {
                    "full_name": user_data.full_name,
                },
            }
        )

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create auth user",
            )

        user_id = auth_response.user.id

        # Step 2: Create profile (RLS bypassed with service role)
        profile_data = {
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role": user_data.role.value,
            "organization_id": user_data.organization_id or admin.organization_id,
        }

        profile_response = (
            admin_client.table("profiles")
            .insert(profile_data)
            .execute()
        )

        if not profile_response.data:
            # Rollback: delete auth user if profile creation fails
            admin_client.auth.admin.delete_user(user_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user profile",
            )

        return UserCreateResponse(
            id=user_id,
            email=user_data.email,
            role=user_data.role,
            message="User created successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}",
        )


@router.get(
    "/users",
    response_model=UserListResponse,
    summary="List all users",
)
async def list_users(
    admin: AdminUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    include_deleted: bool = Query(False),
):
    """
    Get paginated list of users.

    Admin only endpoint.
    """
    try:
        query = supabase.table("profiles").select("*", count="exact")

        # Filter by organization if admin has one
        if admin.organization_id:
            query = query.eq("organization_id", admin.organization_id)

        # Exclude soft-deleted unless requested
        if not include_deleted:
            query = query.is_("deleted_at", "null")

        # Pagination
        offset = (page - 1) * page_size
        query = query.range(offset, offset + page_size - 1)

        response = query.execute()

        users = [
            UserProfile(
                id=u["id"],
                email=u.get("email", ""),
                full_name=u.get("full_name"),
                role=u.get("role", "user"),
                organization_id=u.get("organization_id"),
                avatar_url=u.get("avatar_url"),
                created_at=u.get("created_at"),
                updated_at=u.get("updated_at"),
            )
            for u in response.data
        ]

        return UserListResponse(
            users=users,
            total=response.count or 0,
            page=page,
            page_size=page_size,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing users: {str(e)}",
        )


@router.get(
    "/users/{user_id}",
    response_model=UserProfile,
    summary="Get user by ID",
)
async def get_user(
    user_id: str,
    admin: AdminUser,
):
    """
    Get a single user by ID.

    Admin only endpoint.
    """
    try:
        response = (
            supabase.table("profiles")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user: {str(e)}",
        )


@router.patch(
    "/users/{user_id}",
    response_model=UserProfile,
    summary="Update user",
)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    admin: AdminUser,
):
    """
    Update user profile.

    Admin only endpoint.
    """
    try:
        update_data = user_data.model_dump(exclude_none=True)

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update",
            )

        # Convert role enum to string if present
        if "role" in update_data:
            update_data["role"] = update_data["role"].value

        response = (
            supabase.table("profiles")
            .update(update_data)
            .eq("id", user_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        u = response.data[0]
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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user: {str(e)}",
        )


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft delete user",
)
async def delete_user(
    user_id: str,
    admin: AdminUser,
):
    """
    Soft delete a user by setting deleted_at timestamp.

    Does NOT delete from auth.users to preserve audit trail.
    User will be blocked from logging in due to RLS policies.

    Admin only endpoint.
    """
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    try:
        from datetime import datetime, timezone

        response = (
            supabase.table("profiles")
            .update({"deleted_at": datetime.now(timezone.utc).isoformat()})
            .eq("id", user_id)
            .is_("deleted_at", "null")  # Only if not already deleted
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found or already deleted",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}",
        )


@router.post(
    "/users/{user_id}/restore",
    response_model=UserProfile,
    summary="Restore soft-deleted user",
)
async def restore_user(
    user_id: str,
    admin: AdminUser,
):
    """
    Restore a soft-deleted user by clearing deleted_at.

    Admin only endpoint.
    """
    try:
        response = (
            supabase.table("profiles")
            .update({"deleted_at": None})
            .eq("id", user_id)
            .not_.is_("deleted_at", "null")  # Only if deleted
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found or not deleted",
            )

        u = response.data[0]
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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error restoring user: {str(e)}",
        )
