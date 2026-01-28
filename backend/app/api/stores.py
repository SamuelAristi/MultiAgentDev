"""
Stores API Endpoint
Handles CRUD operations for stores.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.core.supabase import supabase
from app.models.store import StoreCreate, StoreResponse, StoreListResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("/", response_model=StoreListResponse)
async def list_stores(
    organization_id: UUID = Query(..., description="Organization ID"),
    active_only: bool = Query(True, description="Filter to active stores only"),
) -> StoreListResponse:
    """
    List all stores for an organization.

    Args:
        organization_id: UUID of the organization
        active_only: If true, only return active stores

    Returns:
        List of stores
    """
    try:
        query = supabase.table("stores").select("*").eq(
            "organization_id", str(organization_id)
        )

        if active_only:
            query = query.eq("is_active", True)

        result = query.order("created_at", desc=False).execute()

        stores = [StoreResponse(**store) for store in result.data]

        return StoreListResponse(stores=stores, total=len(stores))

    except Exception as e:
        logger.error(f"Error listing stores: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching stores: {str(e)}")


@router.get("/{store_id}", response_model=StoreResponse)
async def get_store(store_id: UUID) -> StoreResponse:
    """
    Get a single store by ID.

    Args:
        store_id: UUID of the store

    Returns:
        Store data
    """
    try:
        result = (
            supabase.table("stores")
            .select("*")
            .eq("id", str(store_id))
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Store not found")

        return StoreResponse(**result.data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting store: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching store: {str(e)}")


@router.get("/slug/{slug}", response_model=StoreResponse)
async def get_store_by_slug(
    slug: str,
    organization_id: UUID = Query(..., description="Organization ID"),
) -> StoreResponse:
    """
    Get a store by its slug within an organization.

    Args:
        slug: Store slug
        organization_id: UUID of the organization

    Returns:
        Store data
    """
    try:
        result = (
            supabase.table("stores")
            .select("*")
            .eq("organization_id", str(organization_id))
            .eq("slug", slug)
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Store not found")

        return StoreResponse(**result.data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting store by slug: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching store: {str(e)}")


@router.post("/", response_model=StoreResponse, status_code=201)
async def create_store(store: StoreCreate) -> StoreResponse:
    """
    Create a new store.

    Args:
        store: Store data

    Returns:
        Created store
    """
    try:
        result = (
            supabase.table("stores")
            .insert(store.model_dump(mode="json"))
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create store")

        return StoreResponse(**result.data[0])

    except Exception as e:
        logger.error(f"Error creating store: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating store: {str(e)}")


@router.delete("/{store_id}", status_code=204)
async def delete_store(store_id: UUID) -> None:
    """
    Delete a store.

    Args:
        store_id: UUID of the store to delete
    """
    try:
        supabase.table("stores").delete().eq("id", str(store_id)).execute()
    except Exception as e:
        logger.error(f"Error deleting store: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting store: {str(e)}")
