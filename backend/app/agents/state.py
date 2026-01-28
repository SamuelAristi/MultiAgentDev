"""
Shared State for LangGraph Agents
Defines the state schema that flows through the graph.
"""

from typing import Annotated, Literal, TypedDict

from langgraph.graph.message import add_messages


class AgentConfig(TypedDict, total=False):
    """
    Agent configuration loaded from database.
    These settings are configured by admins in the AgentConfigPanel.
    """
    id: str
    name: str
    slug: str
    role: str
    system_prompt: str | None
    ai_model: str
    temperature: float
    max_tokens: int
    welcome_message: str | None
    capabilities: dict


class AgentState(TypedDict):
    """
    State shared across all agents in the graph.

    Attributes:
        messages: Conversation history with automatic message merging
        current_agent: Which agent is currently handling the request
        organization_id: Multi-tenant organization context
        user_id: The user making the request
        iteration_count: Safety counter to prevent infinite loops
        final_response: The consolidated response to return
        rag_context: Retrieved context from knowledge base
        agent_config: Configuration from database (set by admin)
    """
    messages: Annotated[list, add_messages]
    current_agent: str
    organization_id: str | None
    user_id: str | None
    iteration_count: int
    final_response: str | None
    rag_context: str | None
    agent_config: AgentConfig | None


# Agent routing options
AgentType = Literal["supervisor", "echo", "amazon", "tiktok", "web", "email", "copywriter", "general", "END"]

# Maximum iterations to prevent infinite loops
MAX_ITERATIONS = 3
