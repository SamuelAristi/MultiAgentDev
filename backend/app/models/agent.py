"""
Agent Models - Pydantic schemas for agent API.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AgentCapabilities(BaseModel):
    """Agent capabilities configuration."""

    rag_enabled: bool = True
    web_search: bool = False
    code_execution: bool = False
    image_generation: bool = False


class AgentBase(BaseModel):
    """Base agent fields."""

    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50)
    role: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None, max_length=500)
    icon: str = Field(default="🤖")
    system_prompt: str | None = None
    is_active: bool = True
    settings: dict = Field(default_factory=dict)

    # AI Configuration
    ai_model: str = Field(default="gpt-4o-mini")
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=2048, gt=0, le=128000)
    welcome_message: str | None = None
    capabilities: dict = Field(default_factory=lambda: {
        "rag_enabled": True,
        "web_search": False,
        "code_execution": False,
        "image_generation": False,
    })
    category: str = Field(default="general")


class AgentCreate(AgentBase):
    """Request body for creating an agent."""

    organization_id: UUID


class AgentUpdate(BaseModel):
    """Request body for updating an agent (all fields optional)."""

    name: str | None = Field(None, min_length=1, max_length=100)
    role: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, max_length=500)
    icon: str | None = None
    system_prompt: str | None = None
    is_active: bool | None = None
    settings: dict | None = None

    # AI Configuration
    ai_model: str | None = None
    temperature: float | None = Field(None, ge=0, le=2)
    max_tokens: int | None = Field(None, gt=0, le=128000)
    welcome_message: str | None = None
    capabilities: dict | None = None
    category: str | None = None


class AgentResponse(AgentBase):
    """Response body for agent data."""

    id: UUID
    organization_id: UUID
    created_at: datetime
    updated_at: datetime
    version: int | None = 1
    modified_by: UUID | None = None

    class Config:
        from_attributes = True


class AgentListResponse(BaseModel):
    """Response body for list of agents."""

    agents: list[AgentResponse]
    total: int


class AgentConfigHistoryItem(BaseModel):
    """Single config change history item."""

    id: UUID
    agent_id: UUID
    changed_by: UUID
    changed_at: datetime
    changes: dict
    previous_config: dict
    change_reason: str | None = None


class AgentConfigHistoryResponse(BaseModel):
    """Response for agent config history."""

    history: list[AgentConfigHistoryItem]
    total: int


class AIModelResponse(BaseModel):
    """Response for AI model info."""

    id: str
    name: str
    provider: str
    description: str | None = None
    max_tokens: int
    supports_vision: bool
    supports_functions: bool
    is_available: bool


class AIModelsListResponse(BaseModel):
    """Response for list of AI models."""

    models: list[AIModelResponse]
    total: int
