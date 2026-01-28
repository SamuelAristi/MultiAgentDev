"""
User and Profile Models
Pydantic schemas for user-related operations.
"""

from datetime import datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    """User roles for RBAC."""

    ADMIN = "admin"
    USER = "user"


class UserBase(BaseModel):
    """Base user fields."""

    email: EmailStr
    full_name: str | None = None


class UserCreate(UserBase):
    """Request body for creating a new user."""

    password: Annotated[str, Field(min_length=8, max_length=72)]
    role: UserRole = UserRole.USER
    organization_id: str | None = None


class UserUpdate(BaseModel):
    """Request body for updating a user."""

    full_name: str | None = None
    role: UserRole | None = None
    organization_id: str | None = None


class UserProfile(UserBase):
    """User profile response."""

    id: str
    role: UserRole
    organization_id: str | None = None
    avatar_url: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """Paginated list of users."""

    users: list[UserProfile]
    total: int
    page: int
    page_size: int


class UserCreateResponse(BaseModel):
    """Response after creating a user."""

    id: str
    email: EmailStr
    role: UserRole
    message: str = "User created successfully"
