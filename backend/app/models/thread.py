"""
Thread/Session Models - Pydantic schemas for chat threads.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class MessageBase(BaseModel):
    """Base message fields."""

    role: str = Field(..., description="user or assistant")
    content: str = Field(..., min_length=1)


class MessageCreate(MessageBase):
    """Request body for creating a message."""

    pass


class MessageResponse(MessageBase):
    """Response body for message data."""

    id: UUID
    thread_id: UUID
    created_at: datetime
    token_count: int | None = None
    metadata: dict = Field(default_factory=dict)

    class Config:
        from_attributes = True


class ThreadBase(BaseModel):
    """Base thread fields."""

    title: str | None = Field(None, max_length=200)


class ThreadCreate(ThreadBase):
    """Request body for creating a thread."""

    store_id: UUID | None = None
    agent_id: UUID | None = None


class ThreadResponse(ThreadBase):
    """Response body for thread data."""

    id: UUID
    user_id: UUID
    organization_id: UUID
    store_id: UUID | None
    agent_id: UUID | None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ThreadWithMessagesResponse(ThreadResponse):
    """Thread response with all messages."""

    messages: list[MessageResponse] = []


class ThreadListResponse(BaseModel):
    """Response body for list of threads."""

    threads: list[ThreadResponse]
    total: int


class SendMessageRequest(BaseModel):
    """Request body for sending a message in a thread."""

    message: str = Field(..., min_length=1, max_length=10000)


class SendMessageResponse(BaseModel):
    """Response body after sending a message."""

    user_message: MessageResponse
    assistant_message: MessageResponse
    thread_id: UUID
