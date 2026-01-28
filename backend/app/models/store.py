"""
Store Models - Pydantic schemas for store API.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class StoreBase(BaseModel):
    """Base store fields."""

    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50)
    description: str | None = Field(None, max_length=500)
    color: str = Field(default="#a855f7")
    logo_url: str | None = None
    is_active: bool = True
    settings: dict = Field(default_factory=dict)


class StoreCreate(StoreBase):
    """Request body for creating a store."""

    organization_id: UUID


class StoreResponse(StoreBase):
    """Response body for store data."""

    id: UUID
    organization_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StoreListResponse(BaseModel):
    """Response body for list of stores."""

    stores: list[StoreResponse]
    total: int
