"""
Sub-Agent Models - Pydantic schemas for sub-agent API.

Sub-agents are specialized workers that belong to an orchestrator agent.
Each sub-agent handles a specific task within the orchestrator's workflow.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SubAgentCapabilities(BaseModel):
    """Sub-agent capabilities configuration."""

    rag_enabled: bool = True
    web_search: bool = False
    code_execution: bool = False
    image_generation: bool = False


class SubAgentBase(BaseModel):
    """Base sub-agent fields."""

    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50)
    role: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None, max_length=500)
    icon: str = Field(default="🔧")
    system_prompt: str | None = None
    is_active: bool = True

    # AI Configuration (full config like parent agents)
    ai_model: str = Field(default="gpt-4o-mini")
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=2048, gt=0, le=128000)
    capabilities: dict = Field(default_factory=lambda: {
        "rag_enabled": True,
        "web_search": False,
        "code_execution": False,
        "image_generation": False,
    })


class SubAgentCreate(SubAgentBase):
    """Request body for creating a sub-agent."""

    # parent_agent_id and organization_id come from the URL/context
    pass


class SubAgentUpdate(BaseModel):
    """Request body for updating a sub-agent (all fields optional)."""

    name: str | None = Field(None, min_length=1, max_length=100)
    slug: str | None = Field(None, min_length=1, max_length=50)
    role: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, max_length=500)
    icon: str | None = None
    system_prompt: str | None = None
    is_active: bool | None = None

    # AI Configuration
    ai_model: str | None = None
    temperature: float | None = Field(None, ge=0, le=2)
    max_tokens: int | None = Field(None, gt=0, le=128000)
    capabilities: dict | None = None


class SubAgentResponse(SubAgentBase):
    """Response body for sub-agent data."""

    id: UUID
    parent_agent_id: UUID
    organization_id: UUID
    created_at: datetime
    updated_at: datetime
    created_by: UUID | None = None
    modified_by: UUID | None = None

    class Config:
        from_attributes = True


class SubAgentListResponse(BaseModel):
    """Response body for list of sub-agents."""

    sub_agents: list[SubAgentResponse]
    total: int


class SubAgentWithKnowledge(SubAgentResponse):
    """Sub-agent response with knowledge base info."""

    knowledge_count: int = 0
