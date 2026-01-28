"""
Chat API Endpoint
Handles user interactions with the dynamic agent system.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.agents import run_agent
from app.core.supabase import supabase
from app.models.chat import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


async def get_agent_config(agent_id: str) -> dict | None:
    """
    Load agent configuration from database.

    Args:
        agent_id: UUID of the agent

    Returns:
        Agent configuration dict or None if not found
    """
    try:
        result = (
            supabase.table("agents")
            .select("*")
            .eq("id", agent_id)
            .eq("is_active", True)
            .single()
            .execute()
        )

        if result.data:
            return result.data
        return None

    except Exception as e:
        logger.error(f"Error loading agent config: {e}")
        return None


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Send a message to a specific agent.

    The agent_id determines which agent handles the request.
    The agent's configuration (system_prompt, model, temperature, etc.)
    is loaded from the database.

    If the agent has sub-agents configured, it will automatically
    orchestrate to the appropriate sub-agent based on context.

    Args:
        request: ChatRequest with message and agent_id

    Returns:
        ChatResponse with agent's response
    """
    try:
        logger.info(f"Chat request for agent {request.agent_id}: {request.message[:100]}...")

        # Load agent configuration from database
        agent_config = await get_agent_config(request.agent_id)

        if not agent_config:
            raise HTTPException(
                status_code=404,
                detail=f"Agent not found or inactive: {request.agent_id}",
            )

        agent_name = agent_config.get("name", "Unknown")
        logger.info(f"Using agent: {agent_name}")

        # Run the agent with the loaded configuration
        response = await run_agent(
            message=request.message,
            organization_id=request.organization_id,
            user_id=None,  # Will be extracted from auth token later
            store_id=request.store_id,
            agent_config=agent_config,
        )

        return ChatResponse(
            response=response,
            session_id=request.session_id,
            agent_used=agent_name,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Agent processing error: {str(e)}",
        )


@router.get("/health")
async def chat_health() -> dict:
    """Health check for chat service."""
    return {"status": "operational", "service": "chat"}
