"""
Knowledge Base Service
Handles document storage and RAG retrieval.
"""

import logging
from uuid import UUID
from typing import Optional

from app.core.supabase import supabase
from app.services.embeddings import generate_embedding

logger = logging.getLogger(__name__)


async def add_document(
    organization_id: UUID,
    content: str,
    metadata: dict = None,
    store_id: UUID = None,
    agent_id: UUID = None,
    sub_agent_id: UUID = None,
    document_type: str = "general",
    source_url: str = None,
) -> dict:
    """
    Add a document to the knowledge base with its embedding.

    Args:
        organization_id: Organization this document belongs to
        content: The text content to store
        metadata: Optional metadata dictionary
        store_id: Optional store ID for store-specific knowledge
        agent_id: Optional agent ID for agent-specific knowledge
        document_type: Type of document (general, product, faq, etc.)
        source_url: Optional source URL

    Returns:
        The created document record
    """
    try:
        # Generate embedding
        embedding = await generate_embedding(content)

        # Prepare document data
        doc_data = {
            "organization_id": str(organization_id),
            "content": content,
            "embedding": embedding,
            "metadata": metadata or {},
            "document_type": document_type,
        }

        if store_id:
            doc_data["store_id"] = str(store_id)
        if agent_id:
            doc_data["agent_id"] = str(agent_id)
        if sub_agent_id:
            doc_data["sub_agent_id"] = str(sub_agent_id)
        if source_url:
            doc_data["source_url"] = source_url

        # Insert into database
        result = supabase.table("knowledge_base").insert(doc_data).execute()

        if not result.data:
            raise Exception("Failed to insert document")

        logger.info(f"Added document to knowledge base: {result.data[0]['id']}")
        return result.data[0]

    except Exception as e:
        logger.error(f"Error adding document: {e}")
        raise


async def search_knowledge(
    organization_id: UUID,
    query: str,
    store_id: UUID = None,
    match_threshold: float = 0.75,
    match_count: int = 5,
) -> list[dict]:
    """
    Search the knowledge base using semantic similarity.

    Args:
        organization_id: Organization to search within
        query: The search query
        store_id: Optional store ID to filter by
        match_threshold: Minimum similarity score (0-1)
        match_count: Maximum number of results

    Returns:
        List of matching documents with similarity scores
    """
    try:
        # Generate query embedding
        query_embedding = await generate_embedding(query)

        # Use the appropriate search function based on whether store_id is provided
        if store_id:
            # Use store-specific search function
            result = supabase.rpc(
                "search_store_knowledge",
                {
                    "query_embedding": query_embedding,
                    "p_store_id": str(store_id),
                    "match_threshold": match_threshold,
                    "match_count": match_count,
                },
            ).execute()
        else:
            # Use general organization search function
            result = supabase.rpc(
                "search_knowledge_base",
                {
                    "query_embedding": query_embedding,
                    "org_id": str(organization_id),
                    "match_threshold": match_threshold,
                    "match_count": match_count,
                },
            ).execute()

        logger.info(f"Found {len(result.data)} matches for query")
        return result.data

    except Exception as e:
        logger.error(f"Error searching knowledge base: {e}")
        return []


async def get_relevant_context(
    organization_id: UUID,
    query: str,
    store_id: UUID = None,
    max_tokens: int = 2000,
) -> str:
    """
    Get relevant context from the knowledge base for RAG.

    Args:
        organization_id: Organization to search within
        query: The user's query
        store_id: Optional store ID
        max_tokens: Maximum tokens to include in context

    Returns:
        Formatted context string for LLM prompt
    """
    try:
        results = await search_knowledge(
            organization_id=organization_id,
            query=query,
            store_id=store_id,
            match_count=5,
        )

        if not results:
            return ""

        # Build context string
        context_parts = []
        current_length = 0

        for doc in results:
            content = doc.get("content", "")
            # Rough token estimation (4 chars per token)
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
            return "CONTEXTO RELEVANTE:\n\n" + "\n\n---\n\n".join(context_parts)

        return ""

    except Exception as e:
        logger.error(f"Error getting relevant context: {e}")
        return ""


async def delete_document(document_id: UUID) -> bool:
    """
    Delete a document from the knowledge base.

    Args:
        document_id: ID of the document to delete

    Returns:
        True if deleted successfully
    """
    try:
        supabase.table("knowledge_base").delete().eq(
            "id", str(document_id)
        ).execute()
        return True
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        return False


async def list_documents(
    organization_id: UUID,
    store_id: UUID = None,
    agent_id: UUID = None,
    sub_agent_id: UUID = None,
    document_type: str = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """
    List documents in the knowledge base.

    Args:
        organization_id: Organization to list documents for
        store_id: Optional store filter
        agent_id: Optional agent filter
        document_type: Optional document type filter
        limit: Max results
        offset: Pagination offset

    Returns:
        List of documents (without embeddings)
    """
    try:
        query = (
            supabase.table("knowledge_base")
            .select("id, content, metadata, document_type, source_url, store_id, agent_id, sub_agent_id, created_at")
            .eq("organization_id", str(organization_id))
        )

        if store_id:
            query = query.eq("store_id", str(store_id))
        if agent_id:
            query = query.eq("agent_id", str(agent_id))
        if sub_agent_id:
            query = query.eq("sub_agent_id", str(sub_agent_id))
        if document_type:
            query = query.eq("document_type", document_type)

        result = (
            query.order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        return result.data

    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        return []
