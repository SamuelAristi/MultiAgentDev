"""
Threads API Endpoint
Handles chat threads and messages.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.core.supabase import supabase
from app.agents import run_agent
from app.models.thread import (
    ThreadCreate,
    ThreadResponse,
    ThreadWithMessagesResponse,
    ThreadListResponse,
    MessageResponse,
    SendMessageRequest,
    SendMessageResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/threads", tags=["threads"])


@router.get("/", response_model=ThreadListResponse)
async def list_threads(
    organization_id: UUID = Query(..., description="Organization ID"),
    user_id: UUID = Query(None, description="Filter by user ID"),
    store_id: UUID = Query(None, description="Filter by store ID"),
    agent_id: UUID = Query(None, description="Filter by agent ID"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> ThreadListResponse:
    """
    List chat threads for an organization.

    Args:
        organization_id: UUID of the organization
        user_id: Optional user ID filter
        store_id: Optional store ID filter
        agent_id: Optional agent ID filter
        limit: Max results per page
        offset: Offset for pagination

    Returns:
        List of threads
    """
    try:
        query = supabase.table("chat_sessions").select("*").eq(
            "organization_id", str(organization_id)
        )

        if user_id:
            query = query.eq("user_id", str(user_id))
        if store_id:
            query = query.eq("store_id", str(store_id))
        if agent_id:
            query = query.eq("agent_id", str(agent_id))

        result = (
            query.order("updated_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        threads = [ThreadResponse(**thread) for thread in result.data]

        return ThreadListResponse(threads=threads, total=len(threads))

    except Exception as e:
        logger.error(f"Error listing threads: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching threads: {str(e)}"
        )


@router.get("/{thread_id}", response_model=ThreadWithMessagesResponse)
async def get_thread(thread_id: UUID) -> ThreadWithMessagesResponse:
    """
    Get a thread with all its messages.

    Args:
        thread_id: UUID of the thread

    Returns:
        Thread data with messages
    """
    try:
        # Get thread
        thread_result = (
            supabase.table("chat_sessions")
            .select("*")
            .eq("id", str(thread_id))
            .single()
            .execute()
        )

        if not thread_result.data:
            raise HTTPException(status_code=404, detail="Thread not found")

        # Get messages (session_id is the FK column in chat_messages)
        messages_result = (
            supabase.table("chat_messages")
            .select("*")
            .eq("session_id", str(thread_id))
            .order("created_at", desc=False)
            .execute()
        )

        # Map session_id to thread_id for API response
        messages = [
            MessageResponse(
                id=msg["id"],
                thread_id=msg["session_id"],
                role=msg["role"],
                content=msg["content"],
                created_at=msg["created_at"],
                token_count=msg.get("token_count"),
                metadata=msg.get("metadata", {}),
            )
            for msg in messages_result.data
        ]

        return ThreadWithMessagesResponse(
            **thread_result.data,
            messages=messages,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting thread: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching thread: {str(e)}")


@router.post("/", response_model=ThreadResponse, status_code=201)
async def create_thread(
    thread: ThreadCreate,
    organization_id: UUID = Query(..., description="Organization ID"),
    user_id: UUID = Query(..., description="User ID"),
) -> ThreadResponse:
    """
    Create a new chat thread.

    Args:
        thread: Thread data
        organization_id: Organization ID
        user_id: User ID

    Returns:
        Created thread
    """
    try:
        data = {
            "organization_id": str(organization_id),
            "user_id": str(user_id),
            "title": thread.title,
            "store_id": str(thread.store_id) if thread.store_id else None,
            "agent_id": str(thread.agent_id) if thread.agent_id else None,
            "status": "active",
        }

        result = supabase.table("chat_sessions").insert(data).execute()

        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create thread")

        return ThreadResponse(**result.data[0])

    except Exception as e:
        logger.error(f"Error creating thread: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating thread: {str(e)}")


@router.post("/{thread_id}/messages", response_model=SendMessageResponse)
async def send_message(
    thread_id: UUID,
    request: SendMessageRequest,
) -> SendMessageResponse:
    """
    Send a message in a thread and get AI response.

    Args:
        thread_id: UUID of the thread
        request: Message content

    Returns:
        User message and AI response
    """
    try:
        # Verify thread exists
        thread_result = (
            supabase.table("chat_sessions")
            .select("*")
            .eq("id", str(thread_id))
            .single()
            .execute()
        )

        if not thread_result.data:
            raise HTTPException(status_code=404, detail="Thread not found")

        thread = thread_result.data

        # Save user message (using session_id as the FK column)
        user_message_data = {
            "session_id": str(thread_id),
            "role": "user",
            "content": request.message,
        }

        user_msg_result = (
            supabase.table("chat_messages")
            .insert(user_message_data)
            .execute()
        )

        if not user_msg_result.data:
            raise HTTPException(status_code=400, detail="Failed to save user message")

        msg_data = user_msg_result.data[0]
        user_message = MessageResponse(
            id=msg_data["id"],
            thread_id=msg_data["session_id"],
            role=msg_data["role"],
            content=msg_data["content"],
            created_at=msg_data["created_at"],
            token_count=msg_data.get("token_count"),
            metadata=msg_data.get("metadata", {}),
        )

        # Fetch agent configuration if agent_id is set
        agent_config = None
        agent_id = thread.get("agent_id")
        if agent_id:
            try:
                agent_result = (
                    supabase.table("agents")
                    .select("id, name, slug, role, system_prompt, ai_model, temperature, max_tokens, welcome_message, capabilities")
                    .eq("id", agent_id)
                    .single()
                    .execute()
                )
                if agent_result.data:
                    agent_config = agent_result.data
                    logger.info(f"Loaded agent config: {agent_config.get('name')} (model: {agent_config.get('ai_model')})")
            except Exception as e:
                logger.warning(f"Failed to load agent config: {e}")

        # Get AI response using agent configuration
        try:
            ai_response = await run_agent(
                message=request.message,
                organization_id=thread.get("organization_id"),
                user_id=thread.get("user_id"),
                store_id=thread.get("store_id"),
                agent_config=agent_config,
            )
        except Exception as e:
            logger.error(f"Agent error: {e}")
            ai_response = f"Lo siento, hubo un error procesando tu mensaje. Por favor intenta de nuevo."

        # Save assistant message (using session_id as the FK column)
        assistant_message_data = {
            "session_id": str(thread_id),
            "role": "assistant",
            "content": ai_response,
        }

        assistant_msg_result = (
            supabase.table("chat_messages")
            .insert(assistant_message_data)
            .execute()
        )

        if not assistant_msg_result.data:
            raise HTTPException(
                status_code=400, detail="Failed to save assistant message"
            )

        asst_data = assistant_msg_result.data[0]
        assistant_message = MessageResponse(
            id=asst_data["id"],
            thread_id=asst_data["session_id"],
            role=asst_data["role"],
            content=asst_data["content"],
            created_at=asst_data["created_at"],
            token_count=asst_data.get("token_count"),
            metadata=asst_data.get("metadata", {}),
        )

        # Update thread's updated_at
        supabase.table("chat_sessions").update(
            {"updated_at": "now()"}
        ).eq("id", str(thread_id)).execute()

        return SendMessageResponse(
            user_message=user_message,
            assistant_message=assistant_message,
            thread_id=thread_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail=f"Error sending message: {str(e)}")


@router.delete("/{thread_id}", status_code=204)
async def delete_thread(thread_id: UUID) -> None:
    """
    Delete a thread and all its messages.

    Args:
        thread_id: UUID of the thread to delete
    """
    try:
        # Messages will be cascade deleted
        supabase.table("chat_sessions").delete().eq("id", str(thread_id)).execute()
    except Exception as e:
        logger.error(f"Error deleting thread: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting thread: {str(e)}")
