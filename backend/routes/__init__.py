from fastapi import APIRouter
from routes.health import router as health_router
from routes.auth import router as auth_router
from routes.queues import router as queues_router
from routes.tokens import router as tokens_router
from routes.analytics import router as analytics_router

api_router = APIRouter()

# Register routes
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(queues_router)
api_router.include_router(tokens_router)
api_router.include_router(analytics_router)

__all__ = ["api_router"]
