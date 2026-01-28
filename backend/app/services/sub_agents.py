"""
Sub-Agents Service
Handles loading and routing to sub-agents for orchestrator agents.
"""

import logging
from uuid import UUID
from typing import Optional

from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI

from app.core.supabase import supabase
from app.core.config import settings
from app.services.knowledge_base import get_relevant_context

logger = logging.getLogger(__name__)


async def get_sub_agents(parent_agent_id: UUID) -> list[dict]:
    """
    Load all active sub-agents for a parent (orchestrator) agent.

    Args:
        parent_agent_id: UUID of the orchestrator agent

    Returns:
        List of sub-agent configurations
    """
    try:
        result = (
            supabase.table("sub_agents")
            .select("*")
            .eq("parent_agent_id", str(parent_agent_id))
            .eq("is_active", True)
            .order("created_at")
            .execute()
        )

        logger.info(f"Loaded {len(result.data)} sub-agents for parent {parent_agent_id}")
        return result.data

    except Exception as e:
        logger.error(f"Error loading sub-agents: {e}")
        return []


async def get_sub_agent_knowledge(
    organization_id: UUID,
    sub_agent_id: UUID,
    query: str,
    max_tokens: int = 1500,
) -> str:
    """
    Get relevant knowledge context for a specific sub-agent.

    Args:
        organization_id: Organization ID
        sub_agent_id: Sub-agent ID
        query: User's query
        max_tokens: Maximum tokens for context

    Returns:
        Formatted context string
    """
    try:
        # Use the RPC function for sub-agent knowledge search
        from app.services.embeddings import generate_embedding

        query_embedding = await generate_embedding(query)

        result = supabase.rpc(
            "search_sub_agent_knowledge",
            {
                "query_embedding": query_embedding,
                "p_sub_agent_id": str(sub_agent_id),
                "match_threshold": 0.70,
                "match_count": 3,
            },
        ).execute()

        if not result.data:
            return ""

        # Format context
        context_parts = []
        current_length = 0

        for doc in result.data:
            content = doc.get("content", "")
            estimated_tokens = len(content) // 4

            if current_length + estimated_tokens > max_tokens:
                break

            similarity = doc.get("similarity", 0)
            doc_type = doc.get("document_type", "general")

            context_parts.append(
                f"[{doc_type.upper()} - Relevancia: {similarity:.2f}]\n{content}"
            )
            current_length += estimated_tokens

        if context_parts:
            return "CONOCIMIENTO DEL SUB-AGENTE:\n\n" + "\n\n---\n\n".join(context_parts)

        return ""

    except Exception as e:
        logger.error(f"Error getting sub-agent knowledge: {e}")
        return ""


async def route_to_sub_agent(
    user_message: str,
    sub_agents: list[dict],
    orchestrator_name: str = "Orchestrator",
) -> Optional[dict]:
    """
    Use LLM to decide which sub-agent should handle the request.

    Args:
        user_message: The user's message
        sub_agents: List of available sub-agents
        orchestrator_name: Name of the parent orchestrator

    Returns:
        Selected sub-agent config or None if no match
    """
    if not sub_agents:
        return None

    # Build routing prompt with sub-agent descriptions
    sub_agent_descriptions = "\n".join([
        f"- {sa['name']}: {sa['role']}. {sa.get('description', '')}"
        for sa in sub_agents
    ])

    routing_prompt = f"""You are a router for {orchestrator_name}. Analyze the user request and decide which specialized sub-agent should handle it.

AVAILABLE SUB-AGENTS:
{sub_agent_descriptions}

RULES:
1. Analyze the user's intent and topic
2. Match to the most appropriate sub-agent based on their role and description
3. If no sub-agent is a good match, respond with "NONE"
4. Respond with ONLY the exact sub-agent name or "NONE"

User request: {user_message}

Which sub-agent should handle this? Respond with the exact name or NONE:"""

    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=settings.OPENAI_API_KEY,
            temperature=0,
        )

        response = llm.invoke([
            SystemMessage(content=routing_prompt),
        ])

        selected_name = response.content.strip()
        logger.info(f"[Router] Selected sub-agent: {selected_name}")

        if selected_name.upper() == "NONE":
            return None

        # Find matching sub-agent
        for sa in sub_agents:
            if sa["name"].lower() == selected_name.lower():
                return sa

        # Fuzzy match - try partial match
        for sa in sub_agents:
            if selected_name.lower() in sa["name"].lower() or sa["name"].lower() in selected_name.lower():
                return sa

        return None

    except Exception as e:
        logger.error(f"Error routing to sub-agent: {e}")
        return None


async def execute_sub_agent(
    sub_agent: dict,
    user_message: str,
    organization_id: Optional[str] = None,
    rag_context: str = "",
) -> str:
    """
    Execute a sub-agent to handle the user's request.

    Args:
        sub_agent: Sub-agent configuration
        user_message: User's message
        organization_id: Organization ID for RAG
        rag_context: Optional pre-fetched RAG context

    Returns:
        Sub-agent's response
    """
    sub_agent_name = sub_agent.get("name", "Sub-Agent")

    # Handle empty or None system_prompt
    system_prompt = sub_agent.get("system_prompt") or ""
    if not system_prompt.strip():
        # Use a default copywriting prompt if none provided
        system_prompt = f"""Eres {sub_agent_name}, un asistente experto en copywriting y marketing.
Tu rol es: {sub_agent.get('role', 'Asistente de Marketing')}

Ayudas a crear contenido persuasivo y efectivo para marketing digital.
Responde siempre en español de manera profesional y creativa."""
        print(f"[{sub_agent_name}] WARNING: No system_prompt found, using default")

    ai_model = sub_agent.get("ai_model") or "gpt-4o-mini"
    temperature = sub_agent.get("temperature") if sub_agent.get("temperature") is not None else 0.7
    max_tokens = sub_agent.get("max_tokens") or 2048

    print(f"[{sub_agent_name}] Executing with model={ai_model}, temp={temperature}")
    print(f"[{sub_agent_name}] System prompt length: {len(system_prompt)} chars")
    print(f"[{sub_agent_name}] User message: {user_message[:100]}...")

    # Get sub-agent specific knowledge if RAG is enabled
    sub_agent_context = ""
    capabilities = sub_agent.get("capabilities", {})
    if capabilities.get("rag_enabled", True) and organization_id:
        try:
            sub_agent_context = await get_sub_agent_knowledge(
                organization_id=UUID(organization_id),
                sub_agent_id=UUID(sub_agent["id"]),
                query=user_message,
            )
        except Exception as e:
            logger.error(f"Error getting sub-agent knowledge: {e}")

    # Build full system prompt with context
    full_prompt = system_prompt
    if sub_agent_context:
        full_prompt = f"""{system_prompt}

---
{sub_agent_context}
---

Utiliza el conocimiento anterior para informar tus respuestas cuando sea relevante."""

    if rag_context:
        full_prompt = f"""{full_prompt}

---
CONTEXTO ADICIONAL DEL ORQUESTADOR:
{rag_context}
---"""

    try:
        llm = ChatOpenAI(
            model=ai_model,
            api_key=settings.OPENAI_API_KEY,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        print(f"[{sub_agent_name}] Calling LLM...")
        response = llm.invoke([
            SystemMessage(content=full_prompt),
            {"role": "user", "content": user_message},
        ])

        result = response.content
        print(f"[{sub_agent_name}] LLM Response: {result[:200]}...")
        print(f"[{sub_agent_name}] Generated response ({len(result)} chars)")
        return result

    except Exception as e:
        print(f"[{sub_agent_name}] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return f"Lo siento, hubo un error al procesar tu solicitud con {sub_agent_name}."


async def orchestrate_with_sub_agents(
    user_message: str,
    parent_agent: dict,
    organization_id: Optional[str] = None,
    rag_context: str = "",
) -> str:
    """
    Main orchestration function that routes to sub-agents.

    If the parent agent has sub-agents:
    1. Load sub-agents from database
    2. Route to appropriate sub-agent based on context
    3. Execute sub-agent and return response

    If no sub-agent match or no sub-agents, use parent agent's config.

    Args:
        user_message: User's message
        parent_agent: Parent agent configuration
        organization_id: Organization ID
        rag_context: Pre-fetched RAG context

    Returns:
        Response from sub-agent or parent agent
    """
    parent_name = parent_agent.get("name", "Orchestrator")
    parent_id = parent_agent.get("id")

    # Debug logging (using print for visibility)
    print(f"[{parent_name}] Orchestrating - ID: {parent_id}")
    print(f"[{parent_name}] Has system_prompt: {bool(parent_agent.get('system_prompt'))}")
    print(f"[{parent_name}] Model: {parent_agent.get('ai_model')}, Temp: {parent_agent.get('temperature')}")

    if not parent_id:
        print(f"[{parent_name}] WARNING: No parent agent ID, using parent config directly")
        return await execute_sub_agent(parent_agent, user_message, organization_id, rag_context)

    # Load sub-agents
    sub_agents = await get_sub_agents(UUID(parent_id))

    if not sub_agents:
        print(f"[{parent_name}] No sub-agents found, using parent config directly")
        return await execute_sub_agent(parent_agent, user_message, organization_id, rag_context)

    logger.info(f"[{parent_name}] Found {len(sub_agents)} sub-agents, routing...")

    # Route to appropriate sub-agent
    selected_sub_agent = await route_to_sub_agent(user_message, sub_agents, parent_name)

    if selected_sub_agent:
        logger.info(f"[{parent_name}] Routing to sub-agent: {selected_sub_agent['name']}")
        return await execute_sub_agent(selected_sub_agent, user_message, organization_id, rag_context)

    # No sub-agent match - use parent agent
    logger.info(f"[{parent_name}] No sub-agent match, using parent config")
    return await execute_sub_agent(parent_agent, user_message, organization_id, rag_context)
