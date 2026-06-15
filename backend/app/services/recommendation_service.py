"""
Carbon Recommendation Engine.
Generates personalized, context-aware sustainability recommendations
based on a user's carbon profile. Prioritizes by impact and effort.
"""
import uuid
from typing import Any

from app.carbon.calculator import CarbonCalculationEngine, get_carbon_engine
from app.carbon.emission_repository import EmissionFactorRepository, get_emission_repository
from app.core.logging import get_logger
from app.schemas.schemas import (
    CarbonProfileRequest,
    EffortLevel,
    ImpactLevel,
    Recommendation,
    RecommendationsRequest,
    RecommendationsResponse,
)

logger = get_logger(__name__)


# ── Recommendation Templates ───────────────────────────────────────────────────
# Each template has dynamic fields filled based on profile analysis

RECOMMENDATION_TEMPLATES: list[dict[str, Any]] = [
    # Transport
    {
        "id": "r_ev",
        "title": "Switch to an Electric Vehicle",
        "description": (
            "Electric vehicles produce ~68% fewer lifetime emissions than petrol cars "
            "in most electricity grids. Combined with renewable energy, the saving is even greater."
        ),
        "category": "transport",
        "effort_level": EffortLevel.high,
        "impact_level": ImpactLevel.very_high,
        "condition": lambda p: p.commute.value == "car",
        "saving_fn": lambda p, repo: (
            (p.commute_km_per_day * 2 * 22) * (
                repo.get_transport_factor("car") - repo.get_transport_factor("electric_car")
            )
        ),
        "tips": [
            "Research EV grants and tax credits in your country",
            "Install a home charger for convenience",
            "Consider second-hand EVs to reduce manufacturing footprint",
        ],
    },
    {
        "id": "r_public_transport",
        "title": "Switch to Public Transport",
        "description": (
            "Buses and trains emit up to 80% less CO2 per passenger-km than solo car trips. "
            "A 20 km daily commute by train instead of car saves ~55 kg CO2/month."
        ),
        "category": "transport",
        "effort_level": EffortLevel.medium,
        "impact_level": ImpactLevel.high,
        "condition": lambda p: p.commute.value in ("car", "motorcycle"),
        "saving_fn": lambda p, repo: (
            (p.commute_km_per_day * 2 * 22) * (
                repo.get_transport_factor(p.commute.value) - repo.get_transport_factor("train")
            )
        ),
        "tips": [
            "Try a monthly transit pass for cost savings",
            "Use journey planner apps for optimal routes",
            "Combine with cycling for first/last mile",
        ],
    },
    {
        "id": "r_cycling",
        "title": "Cycle or Walk Short Distances",
        "description": (
            "Zero-emission travel for trips under 5 km. Cycling a 5 km commute daily "
            "saves ~200 kg CO2 per year compared to driving."
        ),
        "category": "transport",
        "effort_level": EffortLevel.low,
        "impact_level": ImpactLevel.medium,
        "condition": lambda p: p.commute.value in ("car", "motorcycle", "bus") and p.commute_km_per_day <= 10,
        "saving_fn": lambda p, repo: (
            (p.commute_km_per_day * 2 * 22) * repo.get_transport_factor(p.commute.value)
        ),
        "tips": [
            "Start with 1-2 cycle days per week",
            "Check e-bike subsidies in your area",
            "Join a local cycling group for motivation",
        ],
    },
    # Food
    {
        "id": "r_vegetarian",
        "title": "Adopt a Vegetarian Diet",
        "description": (
            "Switching from a mixed diet to vegetarian saves approximately 52 kg CO2e "
            "per month (0.56 kg/day less). Cutting beef alone has the largest single food impact."
        ),
        "category": "food",
        "effort_level": EffortLevel.medium,
        "impact_level": ImpactLevel.very_high,
        "condition": lambda p: p.food.value in ("meat_heavy", "mixed"),
        "saving_fn": lambda p, repo: (
            (repo.get_diet_factor(p.food.value) - repo.get_diet_factor("vegetarian")) * 30.4
        ),
        "tips": [
            "Start with Meat-Free Mondays to build the habit",
            "Explore plant-based protein alternatives (legumes, tofu, tempeh)",
            "Try meal prepping vegetarian lunches for the week",
        ],
    },
    {
        "id": "r_vegan",
        "title": "Try a Plant-Based Vegan Diet",
        "description": (
            "A vegan diet produces ~49% less CO2 than a meat-heavy diet. "
            "This is one of the single biggest individual actions available."
        ),
        "category": "food",
        "effort_level": EffortLevel.high,
        "impact_level": ImpactLevel.very_high,
        "condition": lambda p: p.food.value in ("meat_heavy", "mixed", "vegetarian"),
        "saving_fn": lambda p, repo: (
            (repo.get_diet_factor(p.food.value) - repo.get_diet_factor("vegan")) * 30.4
        ),
        "tips": [
            "Use apps like HappyCow to find plant-based options",
            "Ensure B12, iron and omega-3 intake with supplements",
            "Explore international cuisines — many are naturally plant-based",
        ],
    },
    # Energy
    {
        "id": "r_solar",
        "title": "Install Solar Panels",
        "description": (
            "Solar panels can reduce home electricity emissions by up to 90%. "
            "A typical 4kW system generates 3,400 kWh/year in the UK or 5,000+ in sunnier climates."
        ),
        "category": "energy",
        "effort_level": EffortLevel.high,
        "impact_level": ImpactLevel.very_high,
        "condition": lambda p: not p.renewable_energy,
        "saving_fn": lambda p, repo: (
            repo.get_home_kwh_per_month(p.home_size)
            / max(p.num_people_household, 1)
            * (repo.get_energy_factor("global_average") - repo.get_energy_factor("renewable"))
        ),
        "tips": [
            "Check government solar grants and feed-in tariffs",
            "Get 3+ installer quotes for best pricing",
            "Add battery storage to maximise self-consumption",
        ],
    },
    {
        "id": "r_green_tariff",
        "title": "Switch to a Renewable Energy Tariff",
        "description": (
            "Green energy suppliers source electricity from wind, solar and hydro. "
            "This reduces your home electricity emissions by up to 95% with minimal effort."
        ),
        "category": "energy",
        "effort_level": EffortLevel.low,
        "impact_level": ImpactLevel.high,
        "condition": lambda p: not p.renewable_energy,
        "saving_fn": lambda p, repo: (
            repo.get_home_kwh_per_month(p.home_size)
            / max(p.num_people_household, 1)
            * (repo.get_energy_factor("global_average") - repo.get_energy_factor("renewable"))
        ),
        "tips": [
            "Compare green tariffs on energy comparison sites",
            "Look for 100% renewable certified suppliers",
            "Switching typically takes 2-3 weeks and requires no new hardware",
        ],
    },
    # Work
    {
        "id": "r_remote_work",
        "title": "Work From Home More Often",
        "description": (
            "Full remote work eliminates commute emissions entirely and can reduce overall "
            "footprint by 40-54%. Even 2 WFH days per week creates significant savings."
        ),
        "category": "work",
        "effort_level": EffortLevel.low,
        "impact_level": ImpactLevel.high,
        "condition": lambda p: p.work.value == "office" and p.commute.value not in ("bicycle", "walking"),
        "saving_fn": lambda p, repo: (
            (p.commute_km_per_day * 2 * 10) * repo.get_transport_factor(p.commute.value)
        ),
        "tips": [
            "Negotiate 2-3 WFH days per week with your manager",
            "Ensure your home office is energy efficient",
            "Consider co-working spaces as a middle ground",
        ],
    },
    # Shopping
    {
        "id": "r_reduce_shopping",
        "title": "Reduce Consumer Shopping",
        "description": (
            "Manufacturing new goods is highly carbon-intensive. Reducing clothing purchases "
            "by 50% can save 5+ kg CO2/month. Buying second-hand extends product lifespans."
        ),
        "category": "shopping",
        "effort_level": EffortLevel.low,
        "impact_level": ImpactLevel.medium,
        "condition": lambda p: p.shopping_habit in ("high", "average"),
        "saving_fn": lambda p, repo: (
            repo.get_shopping_factor(p.shopping_habit)
            - repo.get_shopping_factor("minimal")
        ),
        "tips": [
            "Try a 30-day no-buy challenge",
            "Use apps like Depop, Vinted for second-hand items",
            "Repair clothes and electronics before replacing them",
        ],
    },
    # Travel
    {
        "id": "r_reduce_flights",
        "title": "Reduce Air Travel",
        "description": (
            "A single transatlantic flight emits ~1,600 kg CO2. Replacing 1 short-haul "
            "flight with train travel saves ~200 kg. Flying economy also emits less than business/first."
        ),
        "category": "travel",
        "effort_level": EffortLevel.medium,
        "impact_level": ImpactLevel.very_high,
        "condition": lambda p: p.travel.value in ("monthly", "weekly", "frequent"),
        "saving_fn": lambda p, repo: repo.get_travel_factor(p.travel.value) * 0.5,
        "tips": [
            "Take trains for journeys under 600 km",
            "Video-conference for business travel where possible",
            "If you must fly, book direct routes and offset",
        ],
    },
]


class RecommendationService:
    """
    Personalized sustainability recommendation engine.

    Generates context-aware recommendations by:
    1. Computing which recommendations apply to the user's profile
    2. Calculating actual CO2 savings for each
    3. Ranking by impact and respecting effort preferences
    4. Identifying quick wins (low effort, medium+ impact)
    """

    def __init__(
        self,
        calculator: CarbonCalculationEngine | None = None,
        repository: EmissionFactorRepository | None = None,
    ) -> None:
        self._calculator = calculator or get_carbon_engine()
        self._repo = repository or get_emission_repository()

    def generate(self, request: RecommendationsRequest) -> RecommendationsResponse:
        """
        Generate personalized recommendations for a carbon profile.

        Args:
            request: RecommendationsRequest with profile and preferences

        Returns:
            RecommendationsResponse with ranked recommendations
        """
        profile = request.profile
        max_recs = request.max_recommendations
        focus_areas = request.focus_areas

        # Build applicable recommendations
        applicable: list[Recommendation] = []

        for template in RECOMMENDATION_TEMPLATES:
            try:
                # Check if recommendation applies to this profile
                condition = template.get("condition")
                if condition and not condition(profile):
                    continue

                # Apply focus area filter if specified
                if focus_areas and template["category"] not in focus_areas:
                    continue

                # Compute saving
                saving_fn = template.get("saving_fn")
                saving_kg = saving_fn(profile, self._repo) if saving_fn else 10.0
                saving_kg = max(0.0, round(saving_kg, 2))

                # Determine quick win (low effort + medium+ impact)
                is_quick_win = (
                    template["effort_level"] == EffortLevel.low
                    and template["impact_level"]
                    in (ImpactLevel.medium, ImpactLevel.high, ImpactLevel.very_high)
                )

                rec = Recommendation(
                    id=template["id"],
                    title=template["title"],
                    description=template["description"],
                    estimated_co2_saving_kg_month=saving_kg,
                    effort_level=template["effort_level"],
                    impact_level=template["impact_level"],
                    category=template["category"],
                    quick_win=is_quick_win,
                    implementation_tips=template.get("tips", []),
                )
                applicable.append(rec)

            except Exception as exc:
                logger.warning(
                    "recommendation_calc_error",
                    rec_id=template.get("id"),
                    error=str(exc),
                )
                continue

        # Sort: highest CO2 saving first
        applicable.sort(
            key=lambda r: r.estimated_co2_saving_kg_month, reverse=True
        )

        # Limit
        final_recs = applicable[:max_recs]
        quick_wins = [r for r in final_recs if r.quick_win]

        total_saving = sum(r.estimated_co2_saving_kg_month for r in final_recs)

        logger.info(
            "recommendations_generated",
            total=len(final_recs),
            quick_wins=len(quick_wins),
            total_saving_kg=round(total_saving, 1),
        )

        return RecommendationsResponse(
            recommendations=final_recs,
            total_potential_saving_kg_month=round(total_saving, 2),
            quick_wins=quick_wins,
            top_recommendation=final_recs[0] if final_recs else None,
        )


def get_recommendation_service() -> RecommendationService:
    """Dependency injection factory for RecommendationService."""
    return RecommendationService()
