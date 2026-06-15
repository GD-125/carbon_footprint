"""
Recommendations API router.
POST /api/recommendations — Personalized sustainability recommendations.
"""
from fastapi import APIRouter, Depends

from app.core.logging import get_logger
from app.schemas.schemas import RecommendationsRequest, RecommendationsResponse
from app.services.recommendation_service import RecommendationService, get_recommendation_service

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])
logger = get_logger(__name__)


@router.post(
    "",
    response_model=RecommendationsResponse,
    summary="Get Personalized Carbon Reduction Recommendations",
    description=(
        "Receive personalized, actionable sustainability recommendations based on your carbon profile. "
        "Each recommendation includes estimated CO2 savings, effort level, impact level, "
        "and implementation tips. Quick wins are highlighted separately."
    ),
    response_description="Ranked recommendations with CO2 savings, effort, impact, and tips",
)
def get_recommendations(
    request: RecommendationsRequest,
    service: RecommendationService = Depends(get_recommendation_service),
) -> RecommendationsResponse:
    """
    Carbon Reduction Recommendations endpoint.

    Generates context-aware recommendations by:
    1. Analysing which recommendations apply to the user's lifestyle
    2. Calculating actual kg CO2 savings for each option
    3. Ranking by impact potential
    4. Identifying quick wins (low effort, significant impact)

    Supports focus area filtering (transport, food, energy, etc.)
    """
    logger.info(
        "recommendations_endpoint_called",
        focus_areas=request.focus_areas,
        max_recs=request.max_recommendations,
    )
    return service.generate(request)
