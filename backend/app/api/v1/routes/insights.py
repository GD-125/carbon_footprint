"""
Insights API router.
POST /api/insights — AI-powered sustainability insights.
"""
from fastapi import APIRouter, Depends

from app.core.logging import get_logger
from app.insights.insights_engine import InsightsEngine, get_insights_engine
from app.schemas.schemas import InsightsRequest, InsightsResponse

router = APIRouter(prefix="/insights", tags=["Insights"])
logger = get_logger(__name__)


@router.post(
    "",
    response_model=InsightsResponse,
    summary="Generate AI Sustainability Insights",
    description=(
        "Generate AI-powered sustainability insights from your carbon profile. "
        "Combines rule-based analytics with Gemini AI to produce personalised observations "
        "about your emission patterns, peer comparisons, and priority actions."
    ),
    response_description="AI insights with severity ratings, peer comparison, and priority action",
)
async def generate_insights(
    request: InsightsRequest,
    engine: InsightsEngine = Depends(get_insights_engine),
) -> InsightsResponse:
    """
    Sustainability Insights endpoint.

    Produces:
    - Category-specific insights (transport, food, energy, travel)
    - Severity-rated observations (positive, neutral, warning, critical)
    - Peer comparison against global, US, UK averages and Paris targets
    - Single highest-priority action
    - AI-generated personalised narrative
    """
    logger.info(
        "insights_endpoint_called",
        commute=request.profile.commute.value,
        food=request.profile.food.value,
    )
    return await engine.generate_insights(request)
