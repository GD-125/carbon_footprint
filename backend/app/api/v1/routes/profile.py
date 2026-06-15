"""
Carbon Profile API router.
POST /api/profile/analyze — Carbon footprint profile analysis.
"""
from fastapi import APIRouter, Depends

from app.carbon.calculator import CarbonCalculationEngine, get_carbon_engine
from app.core.logging import get_logger
from app.schemas.schemas import CarbonProfileRequest, CarbonProfileResponse

router = APIRouter(prefix="/profile", tags=["Carbon Profile"])
logger = get_logger(__name__)


@router.post(
    "/analyze",
    response_model=CarbonProfileResponse,
    summary="Analyze Carbon Footprint Profile",
    description=(
        "Submit your lifestyle profile to receive a personalized carbon footprint analysis. "
        "Includes a carbon score (0-100), category label, monthly emissions breakdown, "
        "and comparison against global averages and Paris Agreement targets."
    ),
    response_description="Carbon profile with score, category, monthly emissions, and benchmark comparison",
)
def analyze_profile(
    request: CarbonProfileRequest,
    engine: CarbonCalculationEngine = Depends(get_carbon_engine),
) -> CarbonProfileResponse:
    """
    Carbon Footprint Profile Analysis endpoint.

    Computes emissions across:
    - Transport (commute + mode)
    - Diet/food
    - Home energy
    - Shopping habits
    - Air travel
    - Household waste

    All values use peer-reviewed emission factors (DEFRA, IEA, Oxford University, ICAO).
    """
    logger.info(
        "profile_analyze_endpoint_called",
        commute=request.commute.value,
        food=request.food.value,
        travel=request.travel.value,
        work=request.work.value,
    )
    return engine.calculate_profile(request)
