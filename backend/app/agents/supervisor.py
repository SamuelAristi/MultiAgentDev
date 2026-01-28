"""
Dynamic Agent System - All agents are loaded from database.
No hardcoded workers - everything goes through configurable_worker.
"""

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.graph import END, StateGraph

from app.agents.state import MAX_ITERATIONS, AgentState
from app.agents.workers.configurable import configurable_worker
from app.services.knowledge_base import get_relevant_context


def agent_node(state: AgentState) -> dict:
    """
    Simple passthrough node that prepares state for the configurable worker.
    No routing logic needed - the agent_config from DB determines behavior.

    Args:
        state: Current graph state

    Returns:
        Updated state
    """
    iteration = state.get("iteration_count", 0)

    # Safety check: prevent infinite loops
    if iteration >= MAX_ITERATIONS:
        return {
            "current_agent": "END",
            "final_response": "Maximum iterations reached. Ending conversation.",
            "iteration_count": iteration,
        }

    agent_config = state.get("agent_config", {})
    agent_name = agent_config.get("name", "Dynamic Agent")

    print(f"[Agent] Processing request with: {agent_name}")

    return {
        "current_agent": "configurable",
        "iteration_count": iteration + 1,
    }


def build_graph() -> StateGraph:
    """
    Builds a simplified LangGraph workflow.

    Flow: agent_node -> configurable_worker -> END

    All intelligence comes from:
    1. agent_config (loaded from DB)
    2. Sub-agents (if configured)
    3. RAG context (if enabled)

    Returns:
        Compiled StateGraph ready for execution
    """
    workflow = StateGraph(AgentState)

    # Only two nodes needed
    workflow.add_node("agent", agent_node)
    workflow.add_node("worker", configurable_worker)

    # Simple linear flow
    workflow.set_entry_point("agent")
    workflow.add_edge("agent", "worker")
    workflow.add_edge("worker", END)

    return workflow.compile()


# Create the compiled graph instance
agent_graph = build_graph()


async def run_agent(
    message: str,
    organization_id: str | None = None,
    user_id: str | None = None,
    store_id: str | None = None,
    agent_config: dict | None = None,
) -> str:
    """
    Main entry point to run the dynamic agent system.

    Args:
        message: User's input message
        organization_id: Multi-tenant org context
        user_id: User making the request
        store_id: Optional store context for RAG
        agent_config: Agent configuration from database (required)
            - id: Agent UUID
            - name: Agent name
            - system_prompt: Instructions for the agent
            - ai_model: Which LLM to use
            - temperature: Creativity level
            - max_tokens: Response length limit
            - capabilities: {rag_enabled, web_search, etc.}

    Returns:
        Agent's response string
    """
    # Validate agent config
    if not agent_config:
        return "Error: No agent configuration provided. Please select an agent."

    agent_name = agent_config.get("name", "Unknown Agent")
    ai_model = agent_config.get("ai_model", "gpt-4o-mini")
    temperature = agent_config.get("temperature", 0.7)

    print(f"[Agent] {agent_name} | Model: {ai_model} | Temp: {temperature}")

    # Get RAG context if enabled
    rag_context = ""
    capabilities = agent_config.get("capabilities", {})
    rag_enabled = capabilities.get("rag_enabled", True)

    if organization_id and rag_enabled:
        try:
            from uuid import UUID
            org_uuid = UUID(organization_id) if isinstance(organization_id, str) else organization_id
            store_uuid = UUID(store_id) if store_id and isinstance(store_id, str) else store_id

            rag_context = await get_relevant_context(
                organization_id=org_uuid,
                query=message,
                store_id=store_uuid,
                max_tokens=2000,
            )

            if rag_context:
                print(f"[RAG] Added context ({len(rag_context)} chars)")
        except Exception as e:
            print(f"[RAG] Error getting context: {e}")

    # Build initial state
    initial_state: AgentState = {
        "messages": [HumanMessage(content=message)],
        "current_agent": "agent",
        "organization_id": organization_id,
        "user_id": user_id,
        "iteration_count": 0,
        "final_response": None,
        "rag_context": rag_context,
        "agent_config": agent_config,
    }

    # Run the graph
    result = await agent_graph.ainvoke(initial_state)

    # Extract final response
    if result.get("final_response"):
        return result["final_response"]

    # Fallback: get last AI message
    messages = result.get("messages", [])
    for msg in reversed(messages):
        if isinstance(msg, AIMessage):
            return msg.content

    return "No response generated."
