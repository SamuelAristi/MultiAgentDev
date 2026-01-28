"""
Knowledge Base API Endpoint
Handles document management for RAG.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.knowledge_base import (
    add_document,
    search_knowledge,
    delete_document,
    list_documents,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


# Request/Response Models
class DocumentCreate(BaseModel):
    """Request body for creating a document."""

    content: str = Field(..., min_length=1, max_length=50000)
    metadata: dict = Field(default_factory=dict)
    store_id: UUID | None = None
    agent_id: UUID | None = None
    sub_agent_id: UUID | None = None
    document_type: str = Field(default="general", max_length=50)
    source_url: str | None = None


class DocumentResponse(BaseModel):
    """Response body for document data."""

    id: UUID
    content: str
    metadata: dict
    document_type: str
    source_url: str | None = None
    store_id: UUID | None = None
    agent_id: UUID | None = None
    sub_agent_id: UUID | None = None
    created_at: str


class DocumentListResponse(BaseModel):
    """Response for list of documents."""

    documents: list[DocumentResponse]
    total: int


class SearchQuery(BaseModel):
    """Request body for searching."""

    query: str = Field(..., min_length=1, max_length=1000)
    store_id: UUID | None = None
    match_threshold: float = Field(default=0.75, ge=0.0, le=1.0)
    match_count: int = Field(default=5, ge=1, le=20)


class SearchResult(BaseModel):
    """Search result item."""

    id: UUID
    content: str
    metadata: dict
    document_type: str
    similarity: float


class SearchResponse(BaseModel):
    """Response for search results."""

    results: list[SearchResult]
    query: str


@router.post("/documents", response_model=DocumentResponse, status_code=201)
async def create_document(
    document: DocumentCreate,
    organization_id: UUID = Query(..., description="Organization ID"),
) -> DocumentResponse:
    """
    Add a new document to the knowledge base.

    The document will be embedded and stored for semantic search.

    Args:
        document: Document data
        organization_id: Organization ID

    Returns:
        Created document
    """
    try:
        result = await add_document(
            organization_id=organization_id,
            content=document.content,
            metadata=document.metadata,
            store_id=document.store_id,
            agent_id=document.agent_id,
            sub_agent_id=document.sub_agent_id,
            document_type=document.document_type,
            source_url=document.source_url,
        )

        return DocumentResponse(
            id=result["id"],
            content=result["content"],
            metadata=result.get("metadata", {}),
            document_type=result.get("document_type", "general"),
            source_url=result.get("source_url"),
            store_id=result.get("store_id"),
            agent_id=result.get("agent_id"),
            sub_agent_id=result.get("sub_agent_id"),
            created_at=result["created_at"],
        )

    except Exception as e:
        logger.error(f"Error creating document: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating document: {str(e)}")


@router.post("/search", response_model=SearchResponse)
async def search_documents(
    search: SearchQuery,
    organization_id: UUID = Query(..., description="Organization ID"),
) -> SearchResponse:
    """
    Search the knowledge base using semantic similarity.

    Args:
        search: Search parameters
        organization_id: Organization ID

    Returns:
        Matching documents with similarity scores
    """
    try:
        results = await search_knowledge(
            organization_id=organization_id,
            query=search.query,
            store_id=search.store_id,
            match_threshold=search.match_threshold,
            match_count=search.match_count,
        )

        return SearchResponse(
            results=[
                SearchResult(
                    id=r["id"],
                    content=r["content"],
                    metadata=r.get("metadata", {}),
                    document_type=r.get("document_type", "general"),
                    similarity=r.get("similarity", 0),
                )
                for r in results
            ],
            query=search.query,
        )

    except Exception as e:
        logger.error(f"Error searching: {e}")
        raise HTTPException(status_code=500, detail=f"Error searching: {str(e)}")


@router.get("/documents", response_model=DocumentListResponse)
async def get_documents(
    organization_id: UUID = Query(..., description="Organization ID"),
    store_id: UUID = Query(None, description="Filter by store"),
    agent_id: UUID = Query(None, description="Filter by agent"),
    sub_agent_id: UUID = Query(None, description="Filter by sub-agent"),
    document_type: str = Query(None, description="Filter by type"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> DocumentListResponse:
    """
    List documents in the knowledge base.

    Args:
        organization_id: Organization ID
        store_id: Optional store filter
        agent_id: Optional agent filter
        document_type: Optional type filter
        limit: Max results
        offset: Pagination offset

    Returns:
        List of documents
    """
    try:
        results = await list_documents(
            organization_id=organization_id,
            store_id=store_id,
            agent_id=agent_id,
            sub_agent_id=sub_agent_id,
            document_type=document_type,
            limit=limit,
            offset=offset,
        )

        documents = [
            DocumentResponse(
                id=r["id"],
                content=r["content"],
                metadata=r.get("metadata", {}),
                document_type=r.get("document_type", "general"),
                source_url=r.get("source_url"),
                store_id=r.get("store_id"),
                agent_id=r.get("agent_id"),
                sub_agent_id=r.get("sub_agent_id"),
                created_at=r["created_at"],
            )
            for r in results
        ]

        return DocumentListResponse(documents=documents, total=len(documents))

    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing documents: {str(e)}")


@router.delete("/documents/{document_id}", status_code=204)
async def remove_document(document_id: UUID) -> None:
    """
    Delete a document from the knowledge base.

    Args:
        document_id: ID of document to delete
    """
    try:
        success = await delete_document(document_id)
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")
