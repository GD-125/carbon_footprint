"""
Insights Engine.
Generates AI-powered sustainability insights from a carbon profile.
Uses Gemini 2.5 Flash to produce personalised, data-grounded observations.
"""
import json
import re
from typing import Any

from app.ai.gemini_client import GeminiClient, get_gemini_client
from app.carbon.calculator import CarbonCalculationEngine, get_carbon_engine
from app.carbon.emission_repository import EmissionFactorRepository, get_emission_repository
from app.core.logging import get_logger
from app.schemas.schemas import (
    CarbonProfileRequest,
    InsightItem,
    InsightsRequest,
    InsightsResponse,
)

logger = get_logger(__name__)


class InsightsEngine:
    """
    AI-powered sustainability insights engine.

    Combines:
    - Deterministic rule-based observations (always reliable)
    - AI-generated narrative insights (contextual, personalised)
    - Peer comparisons with global benchmarks
    """

    def __init__(
        self,
        ai_client: GeminiClient | None = None,
        calculator: CarbonCalculationEngine | None = None,
        repository: EmissionFactorRepository | None = None,
    ) -> None:
        self._ai = ai_client or get_gemini_client()
        self._calculator = calculator or get_carbon_engine()
        self._repo = repository or get_emission_repository()

    async def generate_insights(self, request: InsightsRequest) -> InsightsResponse:
        """
        Generate sustainability insights for a carbon profile.

        Args:
            request: InsightsRequest with user carbon profile

        Returns:
            InsightsResponse with AI insights and comparisons
        """
        profile = request.profile

        # 1. Compute full breakdown
        breakdown = self._calculator._compute_breakdown(profile)
        total_monthly = sum(breakdown.values())
        benchmarks = self._repo.get_benchmarks()

        # 2. Rule-based insights (fast, always available)
        rule_insights = self._generate_rule_insights(profile, breakdown, benchmarks)

        # 3. AI-generated insights (personalised narrative)
        ai_insights = await self._generate_ai_insights(profile, breakdown, total_monthly)

        # Combine insights
        all_insights = rule_insights + ai_insights

        # 4. Build peer comparison
        peer_comparison = self._build_peer_comparison(total_monthly, benchmarks)

        # 5. Determine priority action
        priority_action = self._determine_priority_action(breakdown)

        # 6. Generate overall summary
        overall_summary = self._generate_summary(total_monthly, breakdown, benchmarks)

        logger.info(
            "insights_generated",
            total_insights=len(all_insights),
            monthly_kg=round(total_monthly, 1),
        )

        return InsightsResponse(
            insights=all_insights,
            overall_summary=overall_summary,
            priority_action=priority_action,
            monthly_emissions_kg=round(total_monthly, 2),
            peer_comparison=peer_comparison,
        )

    def _generate_rule_insights(
        self,
        profile: CarbonProfileRequest,
        breakdown: dict[str, float],
        benchmarks: dict[str, Any],
    ) -> list[InsightItem]:
        """Generate deterministic insights based on profile data."""
        insights: list[InsightItem] = []
        global_monthly = benchmarks.get("global_average_annual_kg_co2", 4800) / 12
        paris_monthly = benchmarks.get("paris_agreement_target_annual_kg_co2", 2000) / 12

        transport_kg = breakdown.get("transport", 0)
        food_kg = breakdown.get("food", 0)
        energy_kg = breakdown.get("energy", 0)
        travel_kg = breakdown.get("travel", 0)

        # Transport insight
        avg_transport = global_monthly * 0.28  # ~28% of avg footprint
        if transport_kg > avg_transport * 1.3:
            insights.append(InsightItem(
                category="transport",
                insight="Your commute emissions are significantly above average. Switching to public transport or an EV could make the biggest difference.",
                severity="warning",
                data_point=f"{transport_kg:.0f} kg CO2/month from commuting",
            ))
        elif transport_kg < avg_transport * 0.5:
            insights.append(InsightItem(
                category="transport",
                insight="Great news! Your transport emissions are well below average. Keep up the sustainable commuting habits.",
                severity="positive",
                data_point=f"Only {transport_kg:.0f} kg CO2/month from commuting",
            ))
        else:
            insights.append(InsightItem(
                category="transport",
                insight="Your transport emissions are around average. Small changes like carpooling or 1 WFH day could help.",
                severity="neutral",
                data_point=f"{transport_kg:.0f} kg CO2/month from commuting",
            ))

        # Food insight
        avg_food = global_monthly * 0.35  # ~35% of avg footprint
        if food_kg > avg_food * 1.2:
            insights.append(InsightItem(
                category="food",
                insight="Your diet has a higher than average carbon footprint. Reducing meat (especially beef) or trying plant-based meals could save 50+ kg CO2/month.",
                severity="warning",
                data_point=f"{food_kg:.0f} kg CO2/month from diet",
            ))
        elif food_kg < avg_food * 0.7:
            insights.append(InsightItem(
                category="food",
                insight="Your diet has a low carbon footprint — a great personal contribution to sustainability.",
                severity="positive",
                data_point=f"Only {food_kg:.0f} kg CO2/month from diet",
            ))

        # Energy insight
        avg_energy = global_monthly * 0.25
        if energy_kg > avg_energy * 1.5:
            insights.append(InsightItem(
                category="energy",
                insight="Your home energy emissions are above average. Switching to a renewable energy tariff or installing solar could reduce this by up to 90%.",
                severity="warning",
                data_point=f"{energy_kg:.0f} kg CO2/month from home energy",
            ))
        elif profile.renewable_energy:
            insights.append(InsightItem(
                category="energy",
                insight="Using renewable energy is excellent! Your home electricity is nearly carbon-neutral.",
                severity="positive",
                data_point=f"Only {energy_kg:.0f} kg CO2/month from home energy",
            ))

        # Travel/flights insight
        if travel_kg > 50:
            insights.append(InsightItem(
                category="travel",
                insight="Air travel is a significant part of your footprint. Even one less flight per year can save 300-1,600 kg CO2.",
                severity="critical" if travel_kg > 150 else "warning",
                data_point=f"{travel_kg:.0f} kg CO2/month from flights (averaged annually)",
            ))
        elif travel_kg == 0:
            insights.append(InsightItem(
                category="travel",
                insight="You rarely or never fly — one of the most impactful sustainability choices possible.",
                severity="positive",
                data_point="Near-zero flight emissions",
            ))

        # Remote work opportunity
        if profile.work.value == "office" and profile.commute.value in ("car", "motorcycle"):
            insights.append(InsightItem(
                category="work",
                insight="Remote work could significantly reduce your footprint. Even 2 WFH days/week can cut commute emissions by 40%.",
                severity="neutral",
                data_point=f"Potential saving: {transport_kg * 0.4:.0f} kg CO2/month",
            ))

        return insights

    async def _generate_ai_insights(
        self,
        profile: CarbonProfileRequest,
        breakdown: dict[str, float],
        total_monthly: float,
    ) -> list[InsightItem]:
        """Generate additional AI-powered insights using Gemini."""
        try:
            breakdown_text = "\n".join(
                f"  - {cat}: {kg:.1f} kg CO2/month"
                for cat, kg in breakdown.items()
            )

            prompt = f"""Analyse this carbon footprint profile and generate 2 specific, actionable insights:

Profile:
- Commute: {profile.commute.value} ({profile.commute_km_per_day} km/day)
- Diet: {profile.food.value}
- Travel frequency: {profile.travel.value}
- Work: {profile.work.value}
- Home: {profile.home_size}
- Renewable energy: {profile.renewable_energy}

Monthly breakdown:
{breakdown_text}
Total: {total_monthly:.1f} kg CO2/month

Generate exactly 2 insights in this JSON array format:
[
  {{
    "category": "<transport|food|energy|shopping|travel|work>",
    "insight": "<specific, data-driven observation with actionable suggestion>",
    "severity": "<positive|neutral|warning|critical>",
    "data_point": "<specific number or statistic>"
  }}
]"""

            response_text = await self._ai.generate_structured(
                system_context="You are a carbon footprint data analyst. Provide precise, evidence-based insights.",
                user_prompt=prompt,
                expected_format="JSON",
            )

            # Parse JSON
            parsed = self._parse_ai_insights(response_text)
            return parsed

        except Exception as exc:
            logger.warning("ai_insights_failed", error=str(exc))
            return []  # Fall back to rule-based only

    def _parse_ai_insights(self, response_text: str) -> list[InsightItem]:
        """Parse AI-generated insights JSON safely."""
        try:
            # Extract JSON array from response
            json_match = re.search(r"\[.*?\]", response_text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                items = []
                for item in data[:2]:  # Max 2 AI insights
                    items.append(InsightItem(
                        category=item.get("category", "general"),
                        insight=item.get("insight", ""),
                        severity=item.get("severity", "neutral"),
                        data_point=item.get("data_point"),
                    ))
                return items
        except (json.JSONDecodeError, KeyError, ValueError) as exc:
            logger.warning("ai_insights_parse_error", error=str(exc))
        return []

    def _build_peer_comparison(
        self, total_monthly: float, benchmarks: dict[str, Any]
    ) -> dict[str, Any]:
        """Build comparison data against global and national averages."""
        global_monthly = benchmarks.get("global_average_annual_kg_co2", 4800) / 12
        us_monthly = benchmarks.get("us_average_annual_kg_co2", 14800) / 12
        uk_monthly = benchmarks.get("uk_average_annual_kg_co2", 5500) / 12
        paris_monthly = benchmarks.get("paris_agreement_target_annual_kg_co2", 2000) / 12

        return {
            "global_average_kg_month": round(global_monthly, 1),
            "us_average_kg_month": round(us_monthly, 1),
            "uk_average_kg_month": round(uk_monthly, 1),
            "paris_target_kg_month": round(paris_monthly, 1),
            "your_kg_month": round(total_monthly, 1),
            "vs_global_pct": round(((total_monthly - global_monthly) / global_monthly) * 100, 1),
            "vs_uk_pct": round(((total_monthly - uk_monthly) / uk_monthly) * 100, 1),
            "paris_gap_kg_month": round(max(0, total_monthly - paris_monthly), 1),
        }

    def _determine_priority_action(self, breakdown: dict[str, float]) -> str:
        """Identify the single highest-impact action based on breakdown."""
        max_category = max(breakdown, key=lambda k: breakdown[k])
        action_map = {
            "transport": "Switch your commute to public transport or an EV to make the biggest single impact.",
            "food": "Reduce meat consumption — switching to a vegetarian diet can save 50+ kg CO2/month.",
            "energy": "Switch to a renewable energy tariff or install solar panels for near-zero home electricity emissions.",
            "travel": "Reduce your flights — replacing 1 flight with a train journey saves 200-1,600 kg CO2.",
            "shopping": "Cut consumer purchases and buy second-hand where possible.",
            "waste": "Compost food waste and recycle more to reduce landfill emissions.",
        }
        return action_map.get(max_category, "Focus on your largest emission source first.")

    def _generate_summary(
        self,
        total_monthly: float,
        breakdown: dict[str, float],
        benchmarks: dict[str, Any],
    ) -> str:
        """Generate a concise overall summary."""
        global_monthly = benchmarks.get("global_average_annual_kg_co2", 4800) / 12
        category = self._repo.get_category_label(total_monthly)

        if total_monthly < global_monthly:
            comparison = "below the global average"
        else:
            pct = round(((total_monthly - global_monthly) / global_monthly) * 100)
            comparison = f"{pct}% above the global average"

        top_category = max(breakdown, key=lambda k: breakdown[k])
        top_kg = breakdown[top_category]

        return (
            f"Your monthly footprint of {total_monthly:.0f} kg CO2e places you in the '{category}' category, "
            f"{comparison}. Your largest emission source is {top_category} at {top_kg:.0f} kg/month. "
            f"Targeting this category first will give you the greatest impact."
        )


def get_insights_engine() -> InsightsEngine:
    """Dependency injection factory for InsightsEngine."""
    return InsightsEngine()
