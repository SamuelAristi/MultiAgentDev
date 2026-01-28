"""
Chat Models - Pydantic schemas for chat API.
"""

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""

    message: str = Field(..., min_length=1, max_length=10000, description="User message")
    agent_id: str = Field(..., description="Agent ID to handle the request (required)")
    session_id: str | None = Field(None, description="Optional session ID for context")
    organization_id: str | None = Field(None, description="Organization context")
    store_id: str | None = Field(None, description="Store context for RAG")


class ChatResponse(BaseModel):
    """Response body from chat endpoint."""

    response: str = Field(..., description="Agent response")
    session_id: str | None = Field(None, description="Session ID for follow-up")
    agent_used: str = Field("supervisor", description="Which agent handled the request")


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str = "0.1.0"
