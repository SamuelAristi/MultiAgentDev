"""
API Router - Aggregates all API endpoints.
"""

from fastapi import APIRouter

from app.api.admin import router as admin_router
from app.api.agents import router as agents_router
from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.knowledge import router as knowledge_router
from app.api.stores import router as stores_router
from app.api.sub_agents import router as sub_agents_router
from app.api.threads import router as threads_router

router = APIRouter()

# Include sub-routers
router.include_router(admin_router)
router.include_router(agents_router)
router.include_router(auth_router)
router.include_router(chat_router)
router.include_router(knowledge_router)
router.include_router(stores_router)
router.include_router(sub_agents_router)
router.include_router(threads_router)


@router.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "MultiAgent Marketing Platform API v1"}
