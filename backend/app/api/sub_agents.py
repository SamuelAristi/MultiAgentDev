"""
Sub-Agents API Endpoint
Handles CRUD operations for sub-agents that belong to orchestrator agents.
"""

import logging
import re
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.core.supabase import supabase
from app.models.sub_agent import (
    SubAgentCreate,
    SubAgentUpdate,
    SubAgentResponse,
    SubAgentListResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["sub-agents"])


def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from a name."""
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug[:50]


@router.get("/{agent_id}/sub-agents", response_model=SubAgentListResponse)
async def list_sub_agents(
    agent_id: UUID,
    active_only: bool = Query(False, description="Filter to active sub-agents only"),
) -> SubAgentListResponse:
    """
    List all sub-agents for an orchestrator agent.

    Args:
        agent_id: UUID of the parent (orchestrator) agent
        active_only: If true, only return active sub-agents

    Returns:
        List of sub-agents
    """
    try:
        # Verify parent agent exists and is an orchestrator
        parent = (
            supabase.table("agents")
            .select("id, is_orchestrator")
            .eq("id", str(agent_id))
            .single()
            .execute()
        )

        if not parent.data:
            raise HTTPException(status_code=404, detail="Parent agent not found")

        # Build query
        query = (
            supabase.table("sub_agents")
            .select("*")
            .eq("parent_agent_id", str(agent_id))
        )

        if active_only:
            query = query.eq("is_active", True)

        result = query.order("created_at", desc=False).execute()

        sub_agents = [SubAgentResponse(**sa) for sa in result.data]

        return SubAgentListResponse(sub_agents=sub_agents, total=len(sub_agents))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing sub-agents: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching sub-agents: {str(e)}")


@router.get("/{agent_id}/sub-agents/{sub_agent_id}", response_model=SubAgentResponse)
async def get_sub_agent(
    agent_id: UUID,
    sub_agent_id: UUID,
) -> SubAgentResponse:
    """
    Get a single sub-agent by ID.

    Args:
        agent_id: UUID of the parent agent
        sub_agent_id: UUID of the sub-agent

    Returns:
        Sub-agent data
    """
    try:
        result = (
            supabase.table("sub_agents")
            .select("*")
            .eq("id", str(sub_agent_id))
            .eq("parent_agent_id", str(agent_id))
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Sub-agent not found")

        return SubAgentResponse(**result.data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting sub-agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching sub-agent: {str(e)}")


@router.post("/{agent_id}/sub-agents", response_model=SubAgentResponse, status_code=201)
async def create_sub_agent(
    agent_id: UUID,
    sub_agent: SubAgentCreate,
    created_by: UUID = Query(..., description="User ID creating the sub-agent"),
) -> SubAgentResponse:
    """
    Create a new sub-agent for an orchestrator agent.

    Args:
        agent_id: UUID of the parent (orchestrator) agent
        sub_agent: Sub-agent data
        created_by: User ID creating the sub-agent

    Returns:
        Created sub-agent
    """
    try:
        # Get parent agent to verify it exists and get organization_id
        parent = (
            supabase.table("agents")
            .select("id, organization_id, is_orchestrator")
            .eq("id", str(agent_id))
            .single()
            .execute()
        )

        if not parent.data:
            raise HTTPException(status_code=404, detail="Parent agent not found")

        # Prepare sub-agent data
        sub_agent_data = sub_agent.model_dump(mode="json")
        sub_agent_data["parent_agent_id"] = str(agent_id)
        sub_agent_data["organization_id"] = parent.data["organization_id"]
        sub_agent_data["created_by"] = str(created_by)

        # Generate slug if not provided or empty
        if not sub_agent_data.get("slug"):
            sub_agent_data["slug"] = generate_slug(sub_agent_data["name"])

        result = (
            supabase.table("sub_agents")
            .insert(sub_agent_data)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create sub-agent")

        logger.info(f"Created sub-agent {result.data[0]['id']} for agent {agent_id}")
        return SubAgentResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating sub-agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating sub-agent: {str(e)}")


@router.patch("/{agent_id}/sub-agents/{sub_agent_id}", response_model=SubAgentResponse)
async def update_sub_agent(
    agent_id: UUID,
    sub_agent_id: UUID,
    sub_agent_update: SubAgentUpdate,
    modified_by: UUID = Query(..., description="User ID making the change"),
) -> SubAgentResponse:
    """
    Update a sub-agent's configuration.

    Args:
        agent_id: UUID of the parent agent
        sub_agent_id: UUID of the sub-agent
        sub_agent_update: Fields to update
        modified_by: User ID making the change

    Returns:
        Updated sub-agent
    """
    try:
        # Verify sub-agent exists and belongs to this parent
        existing = (
            supabase.table("sub_agents")
            .select("id")
            .eq("id", str(sub_agent_id))
            .eq("parent_agent_id", str(agent_id))
            .single()
            .execute()
        )

        if not existing.data:
            raise HTTPException(status_code=404, detail="Sub-agent not found")

        # Build update data, excluding None values
        update_data = {
            k: v for k, v in sub_agent_update.model_dump(mode="json").items()
            if v is not None
        }

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Add modified_by
        update_data["modified_by"] = str(modified_by)

        # Update slug if name changed and slug not explicitly set
        if "name" in update_data and "slug" not in update_data:
            update_data["slug"] = generate_slug(update_data["name"])

        result = (
            supabase.table("sub_agents")
            .update(update_data)
            .eq("id", str(sub_agent_id))
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Sub-agent not found")

        logger.info(f"Updated sub-agent {sub_agent_id}")
        return SubAgentResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating sub-agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating sub-agent: {str(e)}")


@router.delete("/{agent_id}/sub-agents/{sub_agent_id}", status_code=204)
async def delete_sub_agent(
    agent_id: UUID,
    sub_agent_id: UUID,
) -> None:
    """
    Delete a sub-agent.

    This will also delete all associated knowledge base entries.

    Args:
        agent_id: UUID of the parent agent
        sub_agent_id: UUID of the sub-agent to delete
    """
    try:
        # Verify sub-agent exists and belongs to this parent
        existing = (
            supabase.table("sub_agents")
            .select("id")
            .eq("id", str(sub_agent_id))
            .eq("parent_agent_id", str(agent_id))
            .single()
            .execute()
        )

        if not existing.data:
            raise HTTPException(status_code=404, detail="Sub-agent not found")

        # Delete (cascades to knowledge_base via FK)
        supabase.table("sub_agents").delete().eq("id", str(sub_agent_id)).execute()

        logger.info(f"Deleted sub-agent {sub_agent_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting sub-agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting sub-agent: {str(e)}")


@router.post("/{agent_id}/sub-agents/{sub_agent_id}/duplicate", response_model=SubAgentResponse, status_code=201)
async def duplicate_sub_agent(
    agent_id: UUID,
    sub_agent_id: UUID,
    new_name: str = Query(..., description="Name for the duplicated sub-agent"),
    created_by: UUID = Query(..., description="User ID creating the duplicate"),
) -> SubAgentResponse:
    """
    Duplicate an existing sub-agent.

    Args:
        agent_id: UUID of the parent agent
        sub_agent_id: UUID of the sub-agent to duplicate
        new_name: Name for the new sub-agent
        created_by: User ID creating the duplicate

    Returns:
        Newly created sub-agent
    """
    try:
        # Get original sub-agent
        original = (
            supabase.table("sub_agents")
            .select("*")
            .eq("id", str(sub_agent_id))
            .eq("parent_agent_id", str(agent_id))
            .single()
            .execute()
        )

        if not original.data:
            raise HTTPException(status_code=404, detail="Sub-agent not found")

        # Create copy with new name/slug
        new_sub_agent_data = {**original.data}
        del new_sub_agent_data["id"]
        del new_sub_agent_data["created_at"]
        del new_sub_agent_data["updated_at"]
        new_sub_agent_data["name"] = new_name
        new_sub_agent_data["slug"] = generate_slug(new_name)
        new_sub_agent_data["created_by"] = str(created_by)
        new_sub_agent_data["modified_by"] = None

        result = supabase.table("sub_agents").insert(new_sub_agent_data).execute()

        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to duplicate sub-agent")

        logger.info(f"Duplicated sub-agent {sub_agent_id} to {result.data[0]['id']}")
        return SubAgentResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error duplicating sub-agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error duplicating sub-agent: {str(e)}")
