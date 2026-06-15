"""
Carbon Calculation Engine.
Reusable service for computing carbon footprints across all dimensions.
All values in kg CO2e. Emission factors loaded from data repository.
"""
import uuid
from typing import Any

from app.carbon.emission_repository import EmissionFactorRepository, get_emission_repository
from app.core.logging import get_logger
from app.schemas.schemas import (
    CarbonProfileRequest,
    CarbonProfileResponse,
)

logger = get_logger(__name__)

# ── Scoring constants ──────────────────────────────────────────────────────────
# Score of 0 = zero emissions, 100 = very high emissions (~1200 kg/month)
MAX_SCORE_KG_MONTH: float = 1200.0
MIN_SCORE_KG_MONTH: float = 0.0

# Work-from-home reduces energy usage (office energy avoidance factor)
OFFICE_ENERGY_KG_PER_DAY: float = 2.5
WORKING_DAYS_PER_MONTH: int = 22


class CarbonCalculationEngine:
    """
    Core carbon footprint calculation engine.

    Computes emissions across:
    - Transport (commute + travel)
    - Food / diet
    - Home energy
    - Shopping
    - Waste

    Designed with clean interfaces for service injection and future DB migration.
    """

    def __init__(self, repository: EmissionFactorRepository | None = None) -> None:
        self._repo = repository or get_emission_repository()

    def calculate_profile(
        self, request: CarbonProfileRequest
    ) -> CarbonProfileResponse:
        """
        Compute a complete carbon profile from user inputs.

        Args:
            request: Carbon profile request with lifestyle inputs

        Returns:
            CarbonProfileResponse with score, category, breakdown
        """
        breakdown = self._compute_breakdown(request)
        total_monthly_kg = sum(breakdown.values())

        # Score on 0-100 scale
        score = self._compute_score(total_monthly_kg)
        category = self._repo.get_category_label(total_monthly_kg)
        comparison = self._compute_comparison(total_monthly_kg)

        profile_id = str(uuid.uuid4())[:8]

        logger.info(
            "carbon_profile_calculated",
            total_monthly_kg=round(total_monthly_kg, 1),
            score=score,
            category=category,
            profile_id=profile_id,
        )

        return CarbonProfileResponse(
            carbon_score=score,
            category=category,
            estimated_monthly_emissions=round(total_monthly_kg, 2),
            breakdown={k: round(v, 2) for k, v in breakdown.items()},
            comparison=comparison,
            profile_id=profile_id,
        )

    def _compute_breakdown(
        self, request: CarbonProfileRequest
    ) -> dict[str, float]:
        """
        Calculate monthly kg CO2e for each emission category.

        Returns:
            Dict mapping category → monthly kg CO2e
        """
        transport_kg = self._calc_transport(request)
        food_kg = self._calc_food(request)
        energy_kg = self._calc_energy(request)
        shopping_kg = self._calc_shopping(request)
        travel_kg = self._calc_travel(request)
        waste_kg = self._calc_waste()

        return {
            "transport": transport_kg,
            "food": food_kg,
            "energy": energy_kg,
            "shopping": shopping_kg,
            "travel": travel_kg,
            "waste": waste_kg,
        }

    def _calc_transport(self, request: CarbonProfileRequest) -> float:
        """
        Monthly commute emissions.

        Formula:
            kg/month = kg/km × km/day × 2 (return) × working_days × commute_factor
        """
        if request.commute.value == "work_from_home":
            return 0.0

        # Remote work eliminates most commute
        if request.work.value == "remote":
            return 0.0

        # Hybrid: 50% of days in office
        days_multiplier = 1.0
        if request.work.value == "hybrid":
            days_multiplier = 0.5

        km_per_day = request.commute_km_per_day
        factor = self._repo.get_transport_factor(request.commute.value)
        monthly_km = km_per_day * 2 * WORKING_DAYS_PER_MONTH * days_multiplier
        return factor * monthly_km

    def _calc_food(self, request: CarbonProfileRequest) -> float:
        """
        Monthly food emissions based on diet type.

        Formula:
            kg/month = kg/day × 30.4
        """
        kg_per_day = self._repo.get_diet_factor(request.food.value)
        return kg_per_day * 30.4

    def _calc_energy(self, request: CarbonProfileRequest) -> float:
        """
        Monthly home energy emissions.

        Considers:
        - Home size → kWh per month
        - Renewable energy tariff → near-zero factor
        - Per-person allocation within household
        - Work location (WFH adds home energy usage)
        """
        kwh = self._repo.get_home_kwh_per_month(request.home_size)

        # WFH adds ~20% to home energy
        if request.work.value in ("remote", "hybrid"):
            kwh *= 1.20

        # Per-person share
        kwh_per_person = kwh / max(request.num_people_household, 1)

        grid_type = "renewable" if request.renewable_energy else "global_average"
        factor = self._repo.get_energy_factor(grid_type)

        return kwh_per_person * factor

    def _calc_shopping(self, request: CarbonProfileRequest) -> float:
        """Monthly emissions from consumer shopping."""
        return self._repo.get_shopping_factor(request.shopping_habit)

    def _calc_travel(self, request: CarbonProfileRequest) -> float:
        """
        Monthly emissions from air/long-distance travel.

        Uses annual flight frequency → monthly average.
        """
        return self._repo.get_travel_factor(request.travel.value)

    def _calc_waste(self) -> float:
        """
        Monthly waste emissions (global household average).
        18 kg household waste × 0.587 kg CO2/kg landfill
        """
        return 18.0 * 0.587  # ≈ 10.57 kg CO2

    def _compute_score(self, monthly_kg: float) -> int:
        """
        Convert monthly kg CO2 to a 0-100 score.
        0 = zero impact, 100 = very high impact.
        """
        clamped = max(MIN_SCORE_KG_MONTH, min(monthly_kg, MAX_SCORE_KG_MONTH))
        raw_score = (clamped / MAX_SCORE_KG_MONTH) * 100
        return round(raw_score)

    def _compute_comparison(self, monthly_kg: float) -> dict[str, Any]:
        """Build a comparison object against global benchmarks."""
        benchmarks = self._repo.get_benchmarks()
        global_annual = benchmarks.get("global_average_annual_kg_co2", 4800)
        global_monthly = global_annual / 12
        paris_monthly = benchmarks.get("paris_agreement_target_annual_kg_co2", 2000) / 12

        return {
            "vs_global_average_pct": round(
                ((monthly_kg - global_monthly) / global_monthly) * 100, 1
            ),
            "global_monthly_avg_kg": round(global_monthly, 1),
            "paris_target_monthly_kg": round(paris_monthly, 1),
            "is_below_global_average": monthly_kg < global_monthly,
            "is_paris_compliant": monthly_kg <= paris_monthly,
        }

    def compute_total_monthly(self, request: CarbonProfileRequest) -> float:
        """Return total monthly kg CO2e for a profile (used by other services)."""
        breakdown = self._compute_breakdown(request)
        return sum(breakdown.values())


def get_carbon_engine() -> CarbonCalculationEngine:
    """Dependency injection factory for CarbonCalculationEngine."""
    return CarbonCalculationEngine()
