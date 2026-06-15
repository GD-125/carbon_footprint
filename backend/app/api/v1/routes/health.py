"""
Health and Metrics API router.
GET /health — Application health check
GET /metrics — Application metrics
"""
import time

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.core.metrics import metrics
from app.schemas.schemas import (
    ComponentHealth,
    HealthResponse,
    HealthStatus,
    MetricsResponse,
)

router = APIRouter(tags=["Observability"])
logger = get_logger(__name__)


@router.get(
    "/",
    summary="API Root",
    include_in_schema=False,
)
def api_root() -> dict:
    """Root endpoint — confirms the API is running."""
    return {
        "name": "CarbonWise AI API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "copilot": "POST /api/copilot/chat",
            "profile": "POST /api/profile/analyze",
            "recommendations": "POST /api/recommendations",
            "simulate": "POST /api/simulate",
            "insights": "POST /api/insights",
            "document": "POST /api/document/analyze",
        },
    }


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Application Health Check",
    description="Check the health of the CarbonWise AI backend and its components.",
)
def health_check(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """
    Health check endpoint.

    Checks:
    - API availability
    - Gemini AI configuration
    - Emission factors data file

    Returns overall status and per-component health.
    """
    components: dict[str, ComponentHealth] = {}

    # Check AI availability
    if settings.GEMINI_API_KEY:
        components["gemini_ai"] = ComponentHealth(
            status=HealthStatus.healthy,
            message="Gemini 2.5 Flash configured",
        )
    else:
        components["gemini_ai"] = ComponentHealth(
            status=HealthStatus.degraded,
            message="GEMINI_API_KEY not set — AI features unavailable",
        )

    # Check emission factors data
    start = time.time()
    try:
        from app.carbon.emission_repository import get_emission_repository
        repo = get_emission_repository()
        benchmarks = repo.get_benchmarks()
        data_latency = round((time.time() - start) * 1000, 1)
        components["emission_data"] = ComponentHealth(
            status=HealthStatus.healthy,
            message="Emission factors loaded",
            latency_ms=data_latency,
        )
    except Exception as exc:
        components["emission_data"] = ComponentHealth(
            status=HealthStatus.unhealthy,
            message=f"Emission factors unavailable: {exc}",
        )

    # Determine overall status
    statuses = [c.status for c in components.values()]
    if HealthStatus.unhealthy in statuses:
        overall = HealthStatus.unhealthy
    elif HealthStatus.degraded in statuses:
        overall = HealthStatus.degraded
    else:
        overall = HealthStatus.healthy

    return HealthResponse(
        status=overall,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        components=components,
    )


@router.get(
    "/metrics",
    response_model=MetricsResponse,
    summary="Application Metrics",
    description="Retrieve runtime metrics including request counts, error rates, and AI performance.",
)
def get_metrics() -> MetricsResponse:
    """
    Application metrics endpoint.

    Returns:
    - Uptime since startup
    - Total and per-minute request counts
    - Error rate
    - AI call statistics and latency
    """
    return MetricsResponse(
        uptime_seconds=round(metrics.uptime_seconds, 1),
        requests_total=metrics.requests_total,
        requests_per_minute=metrics.requests_per_minute,
        error_rate=metrics.error_rate,
        ai_calls_total=metrics.ai_calls_total,
        avg_ai_latency_ms=metrics.avg_ai_latency_ms,
    )
