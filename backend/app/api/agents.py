"""
Agents API Endpoint
Handles CRUD operations for agents including configuration management.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.core.supabase import supabase
from app.models.agent import (
    AgentCreate,
    AgentUpdate,
    AgentResponse,
    AgentListResponse,
    AgentConfigHistoryResponse,
    AgentConfigHistoryItem,
    AIModelResponse,
    AIModelsListResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/", response_model=AgentListResponse)
async def list_agents(
    organization_id: UUID = Query(..., description="Organization ID"),
    active_only: bool = Query(False, description="Filter to active agents only"),
) -> AgentListResponse:
    """
    List all agents for an organization.

    Args:
        organization_id: UUID of the organization
        active_only: If true, only return active agents

    Returns:
        List of agents
    """
    try:
        query = supabase.table("agents").select("*").eq(
            "organization_id", str(organization_id)
        )

        if active_only:
            query = query.eq("is_active", True)

        result = query.order("created_at", desc=False).execute()

        agents = [AgentResponse(**agent) for agent in result.data]

        return AgentListResponse(agents=agents, total=len(agents))

    except Exception as e:
        logger.error(f"Error listing agents: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching agents: {str(e)}")


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: UUID) -> AgentResponse:
    """
    Get a single agent by ID.

    Args:
        agent_id: UUID of the agent

    Returns:
        Agent data
    """
    try:
        result = (
            supabase.table("agents")
            .select("*")
            .eq("id", str(agent_id))
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Agent not found")

        return AgentResponse(**result.data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching agent: {str(e)}")


@router.get("/slug/{slug}", response_model=AgentResponse)
async def get_agent_by_slug(
    slug: str,
    organization_id: UUID = Query(..., description="Organization ID"),
) -> AgentResponse:
    """
    Get an agent by its slug within an organization.

    Args:
        slug: Agent slug
        organization_id: UUID of the organization

    Returns:
        Agent data
    """
    try:
        result = (
            supabase.table("agents")
            .select("*")
            .eq("organization_id", str(organization_id))
            .eq("slug", slug)
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Agent not found")

        return AgentResponse(**result.data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent by slug: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching agent: {str(e)}")


@router.post("/", response_model=AgentResponse, status_code=201)
async def create_agent(agent: AgentCreate) -> AgentResponse:
    """
    Create a new agent.

    Args:
        agent: Agent data

    Returns:
        Created agent
    """
    try:
        result = (
            supabase.table("agents")
            .insert(agent.model_dump(mode="json"))
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create agent")

        return AgentResponse(**result.data[0])

    except Exception as e:
        logger.error(f"Error creating agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating agent: {str(e)}")


@router.patch("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: UUID,
    agent_update: AgentUpdate,
    modified_by: UUID = Query(..., description="User ID making the change"),
) -> AgentResponse:
    """
    Update an agent's configuration.

    Args:
        agent_id: UUID of the agent
        agent_update: Fields to update
        modified_by: User ID making the change (for audit trail)

    Returns:
        Updated agent
    """
    try:
        # Build update data, excluding None values
        update_data = {
            k: v for k, v in agent_update.model_dump(mode="json").items()
            if v is not None
        }

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Add modified_by for audit trail
        update_data["modified_by"] = str(modified_by)

        result = (
            supabase.table("agents")
            .update(update_data)
            .eq("id", str(agent_id))
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Agent not found")

        return AgentResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating agent: {str(e)}")


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(agent_id: UUID) -> None:
    """
    Delete an agent.

    Args:
        agent_id: UUID of the agent to delete
    """
    try:
        supabase.table("agents").delete().eq("id", str(agent_id)).execute()
    except Exception as e:
        logger.error(f"Error deleting agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting agent: {str(e)}")


@router.get("/{agent_id}/history", response_model=AgentConfigHistoryResponse)
async def get_agent_config_history(
    agent_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> AgentConfigHistoryResponse:
    """
    Get configuration change history for an agent.

    Args:
        agent_id: UUID of the agent
        limit: Max results
        offset: Pagination offset

    Returns:
        List of configuration changes
    """
    try:
        result = (
            supabase.table("agent_config_history")
            .select("*")
            .eq("agent_id", str(agent_id))
            .order("changed_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        history = [AgentConfigHistoryItem(**item) for item in result.data]

        return AgentConfigHistoryResponse(history=history, total=len(history))

    except Exception as e:
        logger.error(f"Error fetching agent history: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")


@router.get("/models/available", response_model=AIModelsListResponse)
async def list_ai_models() -> AIModelsListResponse:
    """
    List all available AI models for agent configuration.

    Returns:
        List of AI models
    """
    try:
        result = (
            supabase.table("ai_models")
            .select("*")
            .eq("is_available", True)
            .order("provider")
            .execute()
        )

        models = [AIModelResponse(**model) for model in result.data]

        return AIModelsListResponse(models=models, total=len(models))

    except Exception as e:
        logger.error(f"Error listing AI models: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching models: {str(e)}")


@router.post("/{agent_id}/duplicate", response_model=AgentResponse, status_code=201)
async def duplicate_agent(
    agent_id: UUID,
    new_name: str = Query(..., description="Name for the duplicated agent"),
    new_slug: str = Query(..., description="Slug for the duplicated agent"),
) -> AgentResponse:
    """
    Duplicate an existing agent with a new name.

    Args:
        agent_id: UUID of the agent to duplicate
        new_name: Name for the new agent
        new_slug: Slug for the new agent

    Returns:
        Newly created agent
    """
    try:
        # Get original agent
        original = (
            supabase.table("agents")
            .select("*")
            .eq("id", str(agent_id))
            .single()
            .execute()
        )

        if not original.data:
            raise HTTPException(status_code=404, detail="Agent not found")

        # Create copy with new name/slug
        new_agent_data = {**original.data}
        del new_agent_data["id"]
        del new_agent_data["created_at"]
        del new_agent_data["updated_at"]
        new_agent_data["name"] = new_name
        new_agent_data["slug"] = new_slug
        new_agent_data["version"] = 1
        new_agent_data["modified_by"] = None

        result = supabase.table("agents").insert(new_agent_data).execute()

        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to duplicate agent")

        return AgentResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error duplicating agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error duplicating agent: {str(e)}")
