"""
API v1 router — aggregates all feature routers.
All routes are prefixed with /api.
"""
from fastapi import APIRouter

from app.api.v1.routes import (
    copilot,
    document,
    health,
    insights,
    profile,
    recommendations,
    simulate,
)

api_router = APIRouter(prefix="/api")

# Feature routes
api_router.include_router(copilot.router)
api_router.include_router(profile.router)
api_router.include_router(recommendations.router)
api_router.include_router(simulate.router)
api_router.include_router(insights.router)
api_router.include_router(document.router)

# Observability routes (no /api prefix needed — top level)
health_router = APIRouter()
health_router.include_router(health.router)
