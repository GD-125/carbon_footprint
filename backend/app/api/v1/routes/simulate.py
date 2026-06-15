"""
Scenario Simulation API router.
POST /api/simulate — Carbon reduction scenario simulation.
"""
from fastapi import APIRouter, Depends

from app.core.logging import get_logger
from app.schemas.schemas import SimulationRequest, SimulationResult
from app.simulations.simulation_engine import SimulationEngine, get_simulation_engine

router = APIRouter(prefix="/simulate", tags=["Scenario Simulator"])
logger = get_logger(__name__)


@router.post(
    "",
    response_model=SimulationResult,
    summary="Simulate Carbon Reduction Scenario",
    description=(
        "Simulate the carbon impact of a specific lifestyle change. "
        "Calculates before/after emissions, total savings, and human-scale equivalents "
        "(trees planted, km driving avoided). "
        "Supported scenarios: electric_vehicle, vegetarian_diet, vegan_diet, "
        "remote_work, solar_power, reduced_flights, led_lighting, plant_based_meals."
    ),
    response_description="Simulation result with before/after emissions, savings, assumptions, and real-world equivalents",
)
def simulate_scenario(
    request: SimulationRequest,
    engine: SimulationEngine = Depends(get_simulation_engine),
) -> SimulationResult:
    """
    Scenario Simulation endpoint.

    Applies realistic assumptions from peer-reviewed sources to model
    the precise impact of each lifestyle change on the user's existing profile.

    Custom parameters can override default assumptions for specific scenarios.
    """
    logger.info(
        "simulate_endpoint_called",
        scenario=request.scenario.value,
        commute=request.profile.commute.value,
    )
    return engine.simulate(request)
