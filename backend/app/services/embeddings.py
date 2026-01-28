"""
Embeddings Service
Handles text embedding generation using OpenAI's API.
"""

import logging
from functools import lru_cache

from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

# OpenAI embedding model
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536


@lru_cache
def get_openai_client() -> OpenAI:
    """Get cached OpenAI client."""
    return OpenAI(api_key=settings.OPENAI_API_KEY)


async def generate_embedding(text: str) -> list[float]:
    """
    Generate an embedding vector for the given text.

    Args:
        text: The text to embed

    Returns:
        List of floats representing the embedding vector
    """
    try:
        client = get_openai_client()

        # Clean and truncate text if needed (8191 tokens max for embedding model)
        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Empty text cannot be embedded")

        # Truncate to avoid token limits (rough approximation)
        if len(clean_text) > 30000:
            clean_text = clean_text[:30000]

        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=clean_text,
        )

        return response.data[0].embedding

    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        raise


async def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for multiple texts in a single API call.

    Args:
        texts: List of texts to embed

    Returns:
        List of embedding vectors
    """
    try:
        client = get_openai_client()

        # Clean texts
        clean_texts = [t.strip()[:30000] for t in texts if t.strip()]
        if not clean_texts:
            return []

        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=clean_texts,
        )

        return [item.embedding for item in response.data]

    except Exception as e:
        logger.error(f"Error generating batch embeddings: {e}")
        raise
