"""
Configurable Worker - Uses admin-defined configuration from database.
This worker uses the system_prompt, ai_model, temperature, and max_tokens
configured by admins in the AgentConfigPanel.

Supports sub-agent orchestration when the agent has sub-agents configured.
"""

import asyncio
from langchain_core.messages import AIMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.agents.state import AgentState
from app.core.config import settings


# Default fallback configuration
DEFAULT_CONFIG = {
    "system_prompt": "You are a helpful assistant. Answer the user's questions clearly and concisely.",
    "ai_model": "gpt-4o-mini",
    "temperature": 0.7,
    "max_tokens": 2048,
}


async def configurable_worker_async(state: AgentState) -> dict:
    """
    Async version of configurable worker that supports sub-agent orchestration.

    When the agent has sub-agents configured, this worker will:
    1. Load sub-agents from database
    2. Route to the appropriate sub-agent based on context
    3. Execute the sub-agent with its own config

    Args:
        state: Current graph state with agent_config

    Returns:
        Updated state with generated response
    """
    from app.services.sub_agents import orchestrate_with_sub_agents

    messages = state["messages"]
    agent_config = state.get("agent_config") or DEFAULT_CONFIG
    rag_context = state.get("rag_context", "")
    organization_id = state.get("organization_id")

    last_message = messages[-1] if messages else None

    if not last_message:
        return {
            "messages": [AIMessage(content="No message provided.")],
            "current_agent": "configurable",
            "final_response": "No message provided.",
        }

    # Get user message content
    user_message = (
        last_message.content
        if hasattr(last_message, "content")
        else str(last_message)
    )

    # Clean up the message - remove RAG context prefix if present
    if "PREGUNTA DEL USUARIO:" in user_message:
        user_message = user_message.split("PREGUNTA DEL USUARIO:")[-1].strip()

    agent_name = agent_config.get("name", "Configurable Agent")
    print(f"[{agent_name}] Processing with sub-agent orchestration enabled...")
    print(f"[{agent_name}] Config keys: {list(agent_config.keys())}")
    print(f"[{agent_name}] Has system_prompt: {bool(agent_config.get('system_prompt'))}")
    if agent_config.get("system_prompt"):
        print(f"[{agent_name}] System prompt preview: {agent_config.get('system_prompt')[:100]}...")

    try:
        # Use orchestration which will route to sub-agents if available
        response_text = await orchestrate_with_sub_agents(
            user_message=user_message,
            parent_agent=agent_config,
            organization_id=organization_id,
            rag_context=rag_context,
        )

        print(f"[{agent_name}] Response generated ({len(response_text)} chars)")

    except Exception as e:
        print(f"[{agent_name}] Error in orchestration: {e}")
        # Fallback to direct response without sub-agents
        response_text = await direct_response(agent_config, user_message, rag_context)

    return {
        "messages": [AIMessage(content=response_text)],
        "current_agent": "configurable",
        "final_response": response_text,
    }


async def direct_response(agent_config: dict, user_message: str, rag_context: str) -> str:
    """
    Generate a direct response using the agent's config without sub-agent routing.
    Used as fallback when orchestration fails or for agents without sub-agents.
    """
    system_prompt = agent_config.get("system_prompt") or DEFAULT_CONFIG["system_prompt"]
    ai_model = agent_config.get("ai_model") or DEFAULT_CONFIG["ai_model"]
    temperature = agent_config.get("temperature") or DEFAULT_CONFIG["temperature"]
    max_tokens = agent_config.get("max_tokens") or DEFAULT_CONFIG["max_tokens"]

    full_system_prompt = system_prompt
    if rag_context:
        full_system_prompt = f"""{system_prompt}

---
CONTEXTO RELEVANTE (de la base de conocimiento):
{rag_context}
---

Utiliza el contexto anterior para informar tus respuestas cuando sea relevante."""

    llm = ChatOpenAI(
        model=ai_model,
        api_key=settings.OPENAI_API_KEY,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    response = llm.invoke([
        SystemMessage(content=full_system_prompt),
        {"role": "user", "content": user_message},
    ])

    return response.content


def configurable_worker(state: AgentState) -> dict:
    """
    Configurable worker that uses admin-defined settings.
    Wraps the async version for LangGraph compatibility.

    Uses the agent_config from state which includes:
    - system_prompt: Custom instructions for the agent
    - ai_model: Which LLM model to use (gpt-4o, gpt-4o-mini, etc.)
    - temperature: Creativity level (0-2)
    - max_tokens: Maximum response length

    Args:
        state: Current graph state with agent_config

    Returns:
        Updated state with generated response
    """
    # Check if we're already in an async context
    try:
        loop = asyncio.get_running_loop()
        # We're in an async context, need to use a different approach
        # Create a new thread to run the async code
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(
                asyncio.run,
                configurable_worker_async(state)
            )
            return future.result()
    except RuntimeError:
        # No running loop, safe to use asyncio.run
        return asyncio.run(configurable_worker_async(state))
