"""
Scenario Simulation Engine.
Simulates the CO2 impact of specific lifestyle changes.
Uses realistic assumptions based on emission factor datasets.
"""
import math
from typing import Any

from app.carbon.calculator import CarbonCalculationEngine, get_carbon_engine
from app.carbon.emission_repository import EmissionFactorRepository, get_emission_repository
from app.core.exceptions import EmissionFactorNotFoundError
from app.core.logging import get_logger
from app.schemas.schemas import (
    CarbonProfileRequest,
    ScenarioType,
    SimulationRequest,
    SimulationResult,
)

logger = get_logger(__name__)

# Human-scale equivalents per kg CO2 saved
KG_CO2_PER_TREE_YEAR: float = 22.0       # A tree absorbs ~22 kg CO2/year
KG_CO2_PER_KM_CAR: float = 0.170         # Average car per km
KG_CO2_PER_SMARTPHONE_CHARGE: float = 0.005  # Per charge


SCENARIO_LABELS: dict[str, str] = {
    "electric_vehicle": "Switch to Electric Vehicle",
    "vegetarian_diet": "Adopt Vegetarian Diet",
    "vegan_diet": "Adopt Vegan Diet",
    "remote_work": "Full Remote Work",
    "solar_power": "Install Solar Panels",
    "reduced_flights": "Reduce Air Travel by 75%",
    "led_lighting": "Switch to LED Lighting",
    "plant_based_meals": "Replace 7 Meals/Week with Plant-Based",
}

SCENARIO_PAYBACK_MONTHS: dict[str, int | None] = {
    "electric_vehicle": 36,   # ~3 years payback on EV premium
    "solar_power": 84,        # ~7 years payback on installation
    "led_lighting": 6,        # ~6 months payback on bulbs
    "vegetarian_diet": None,  # No upfront cost
    "vegan_diet": None,
    "remote_work": None,
    "reduced_flights": None,
    "plant_based_meals": None,
}


class SimulationEngine:
    """
    Scenario simulation engine.

    Simulates specific lifestyle changes and computes:
    - Before/after monthly emissions
    - CO2 savings (monthly and annual)
    - Reduction percentage
    - Human-scale equivalents
    - Key assumptions
    """

    def __init__(
        self,
        calculator: CarbonCalculationEngine | None = None,
        repository: EmissionFactorRepository | None = None,
    ) -> None:
        self._calculator = calculator or get_carbon_engine()
        self._repo = repository or get_emission_repository()

    def simulate(self, request: SimulationRequest) -> SimulationResult:
        """
        Run a scenario simulation.

        Args:
            request: SimulationRequest with profile and scenario

        Returns:
            SimulationResult with before/after emissions and context
        """
        profile = request.profile
        scenario = request.scenario
        custom_params = request.custom_params or {}

        # Compute baseline
        before_kg = self._calculator.compute_total_monthly(profile)

        # Dispatch to scenario handler
        handler = self._get_handler(scenario)
        after_kg, assumptions = handler(profile, custom_params)

        saved_kg_month = max(0.0, before_kg - after_kg)
        saved_kg_year = saved_kg_month * 12
        reduction_pct = (
            round((saved_kg_month / before_kg) * 100, 1) if before_kg > 0 else 0.0
        )

        equivalents = self._compute_equivalents(saved_kg_month)

        logger.info(
            "scenario_simulated",
            scenario=scenario.value,
            before_kg=round(before_kg, 1),
            after_kg=round(after_kg, 1),
            saved_kg=round(saved_kg_month, 1),
            reduction_pct=reduction_pct,
        )

        return SimulationResult(
            scenario=scenario,
            scenario_label=SCENARIO_LABELS.get(scenario.value, scenario.value),
            before_kg_month=round(before_kg, 2),
            after_kg_month=round(max(0.0, after_kg), 2),
            saved_kg_month=round(saved_kg_month, 2),
            saved_kg_year=round(saved_kg_year, 2),
            reduction_percentage=reduction_pct,
            assumptions=assumptions,
            equivalent_context=equivalents,
            payback_months=SCENARIO_PAYBACK_MONTHS.get(scenario.value),
        )

    def _get_handler(self, scenario: ScenarioType):
        """Return the appropriate simulation handler for a scenario."""
        handlers = {
            ScenarioType.electric_vehicle: self._sim_electric_vehicle,
            ScenarioType.vegetarian_diet: self._sim_vegetarian_diet,
            ScenarioType.vegan_diet: self._sim_vegan_diet,
            ScenarioType.remote_work: self._sim_remote_work,
            ScenarioType.solar_power: self._sim_solar_power,
            ScenarioType.reduced_flights: self._sim_reduced_flights,
            ScenarioType.led_lighting: self._sim_led_lighting,
            ScenarioType.plant_based_meals: self._sim_plant_based_meals,
        }
        handler = handlers.get(scenario)
        if not handler:
            raise EmissionFactorNotFoundError(f"scenario:{scenario.value}")
        return handler

    def _sim_electric_vehicle(
        self, profile: CarbonProfileRequest, params: dict[str, Any]
    ) -> tuple[float, list[str]]:
        """Simulate switching from combustion vehicle to EV."""
        scenario_data = self._repo.get_scenario_data("electric_vehicle")
        km_per_month = params.get(
            "km_per_month", scenario_data["assumption_km_per_month"]
        )
        from_factor = scenario_data["from_factor"]
        to_factor = scenario_data["to_factor"]

        # Only transport changes
        baseline_transport = (
            profile.commute_km_per_day * 2 * 22 * from_factor
            if profile.commute.value in ("car",)
            else km_per_month * from_factor
        )
        new_transport = km_per_month * to_factor

        baseline_total = self._calculator.compute_total_monthly(profile)
        old_transport_in_baseline = max(
            0.0,
            profile.commute_km_per_day * 2 * 22
            * self._repo.get_transport_factor(profile.commute.value),
        )
        after_kg = baseline_total - old_transport_in_baseline + new_transport

        assumptions = [
            f"Assumed {km_per_month} km driven per month",
            f"Petrol car: {from_factor} kg CO2/km (DEFRA 2023)",
            f"EV on global average grid: {to_factor} kg CO2/km (IEA 2023)",
            "EV manufacture emissions amortised over 150,000 km lifetime",
            "Charging losses and grid carbon intensity included",
        ]
        return after_kg, assumptions

    def _sim_vegetarian_diet(
        self, profile: CarbonProfileRequest, params: dict[str, Any]
    ) -> tuple[float, list[str]]:
        """Simulate switching to vegetarian diet."""
        scenario_data = self._repo.get_scenario_data("vegetarian_diet")
        old_per_day = scenario_data["from_kg_co2_per_day"]
        new_per_day = scenario_data["to_kg_co2_per_day"]

        baseline_food = self._repo.get_diet_factor(profile.food.value) * 30.4
        new_food = new_per_day * 30.4
        baseline_total = self._calculator.compute_total_monthly(profile)
        after_kg = baseline_total - baseline_food + new_food

        assumptions = [
            f"Current diet ({profile.food.value}): {old_per_day:.2f} kg CO2/day (Oxford 2023)",
            f"Vegetarian diet: {new_per_day:.2f} kg CO2/day (Oxford 2023)",
            "Includes dairy and eggs; excludes meat and fish",
            "Local vs. imported produce variation not modelled",
        ]
        return after_kg, assumptions

    def _sim_vegan_diet(
        self, profile: CarbonProfileRequest, params: dict[str, Any]
    ) -> tuple[float, list[str]]:
        """Simulate switching to vegan diet."""
        scenario_data = self._repo.get_scenario_data("vegan_diet")
        new_per_day = scenario_data["to_kg_co2_per_day"]

        baseline_food = self._repo.get_diet_factor(profile.food.value) * 30.4
        new_food = new_per_day * 30.4
        baseline_total = self._calculator.compute_total_monthly(profile)
        after_kg = baseline_total - baseline_food + new_food

        assumptions = [
            f"Current diet ({profile.food.value}): {self._repo.get_diet_factor(profile.food.value):.2f} kg CO2/day",
            f"Vegan diet: {new_per_day:.2f} kg CO2/day (Oxford University 2023)",
            "Excludes all animal products",
            "Savings vary by geographic region and season",
        ]
        return after_kg, assumptions

    def _sim_remote_work(
        self, profile: CarbonProfileRequest, params: dict[str, Any]
    ) -> tuple[float, list[str]]:
        """Simulate full remote work."""
        scenario_data = self._repo.get_scenario_data("remote_work")
        days_saved = params.get(
            "commute_days_saved_per_month", scenario_data["commute_days_saved_per_month"]
        )
        avg_km = params.get("average_commute_km", profile.commute_km_per_day)
        from_factor = self._repo.get_transport_factor(profile.commute.value)

        commute_saved = avg_km * 2 * days_saved * from_factor
        # WFH adds ~2.5 kg CO2/day to home energy (heating, electricity)
        home_energy_increase = scenario_data["office_energy_share_kg_per_day"] * days_saved

        baseline_total = self._calculator.compute_total_monthly(profile)
        after_kg = baseline_total - commute_saved + home_energy_increase

        assumptions = [
            f"Commute eliminated for {days_saved} days/month",
            f"Commute distance: {avg_km} km one-way",
            f"Transport factor: {from_factor:.3f} kg CO2/km",
            f"WFH adds {scenario_data['office_energy_share_kg_per_day']} kg CO2/day from home energy",
            "Office heating/cooling savings not included (shared building)",
        ]
        return after_kg, assumptions

    def _sim_solar_power(
        self, profile: CarbonProfileRequest, params: dict[str, Any]
    ) -> tuple[float, list[str]]:
        """Simulate switching home electricity to solar."""
        scenario_data = self._repo.get_scenario_data("solar_power")
        avg_kwh = params.get(
            "monthly_kwh", self._repo.get_home_kwh_per_month(profile.home_size)
        )
        kwh_per_person = avg_kwh / max(profile.num_people_household, 1)

        from_factor = scenario_data["from_factor"]
        to_factor = scenario_data["to_factor"]

        old_energy = kwh_per_person * from_factor
        new_energy = kwh_per_person * to_factor

        baseline_total = self._calculator.compute_total_monthly(profile)
        # Replace energy component
        grid_factor = self._repo.get_energy_factor(
            "renewable" if profile.renewable_energy else "global_average"
        )
        old_in_baseline = kwh_per_person * grid_factor
        after_kg = baseline_total - old_in_baseline + new_energy

        assumptions = [
            f"Home consumes {avg_kwh} kWh/month ({profile.home_size})",
            f"Grid electricity: {from_factor} kg CO2/kWh (US average, EPA 2023)",
            f"Solar electricity: {to_factor} kg CO2/kWh including panel manufacture (IPCC 2022)",
            "Assumes panels generate enough for full home electricity needs",
            "Export to grid not modelled",
        ]
        return after_kg, assumptions

    def _sim_reduced_flights(
        self, profile: CarbonProfileRequest, params: dict[str, Any]
    ) -> tuple[float, list[str]]:
        """Simulate reducing flights by 75%."""
        scenario_data = self._repo.get_scenario_data("reduced_flights")
        avg_flights = params.get("avg_flights_per_year", scenario_data["avg_flights_per_year"])
        avg_km = params.get("avg_flight_km", scenario_data["avg_flight_km"])
        reduction = params.get("reduction_pct", scenario_data["reduction_pct"])
        factor = scenario_data["from_factor"]

        old_monthly = (avg_flights * avg_km * factor) / 12
        new_monthly = old_monthly * (1 - reduction)

        baseline_total = self._calculator.compute_total_monthly(profile)
        current_travel = self._repo.get_travel_factor(profile.travel.value)
        after_kg = baseline_total - current_travel + new_monthly

        assumptions = [
            f"Baseline: {avg_flights} flights/year at {avg_km} km average",
            f"Short-haul flight factor: {factor} kg CO2/km (ICAO 2023)",
            f"Flight reduction: {int(reduction * 100)}%",
            "Radiative forcing (contrail warming) not included (would add 2-4x)",
            "Business class emits ~3x more than economy per passenger",
        ]
        return after_kg, assumptions

    def _sim_led_lighting(
        self, profile: CarbonProfileRequest, params: dict[str, Any]
    ) -> tuple[float, list[str]]:
        """Simulate switching all lighting to LED."""
        scenario_data = self._repo.get_scenario_data("led_lighting")
        kwh_saved = params.get("kwh_saved_per_month", scenario_data["kwh_saved_per_month"])
        factor = scenario_data["factor"]
        monthly_saving = kwh_saved * factor

        baseline_total = self._calculator.compute_total_monthly(profile)
        after_kg = baseline_total - monthly_saving

        assumptions = [
            f"LED conversion saves {kwh_saved} kWh/month vs. incandescent",
            f"Electricity factor: {factor} kg CO2/kWh (US average grid)",
            "Assumes typical 10-bulb household",
            "LED bulbs last 25x longer than incandescent (lower manufacturing impact)",
        ]
        return after_kg, assumptions

    def _sim_plant_based_meals(
        self, profile: CarbonProfileRequest, params: dict[str, Any]
    ) -> tuple[float, list[str]]:
        """Simulate replacing 7 meals/week with plant-based options."""
        scenario_data = self._repo.get_scenario_data("plant_based_meals")
        meals_per_week = params.get("meals_per_week", scenario_data["meals_per_week"])
        from_kg = params.get("from_kg_co2_per_meal", scenario_data["from_kg_co2_per_meal"])
        to_kg = params.get("to_kg_co2_per_meal", scenario_data["to_kg_co2_per_meal"])

        saving_per_week = meals_per_week * (from_kg - to_kg)
        monthly_saving = saving_per_week * 4.33

        baseline_total = self._calculator.compute_total_monthly(profile)
        after_kg = baseline_total - monthly_saving

        assumptions = [
            f"Replacing {meals_per_week} meat-based meals/week with plant-based",
            f"Average meat meal: {from_kg} kg CO2 (based on chicken/pork average)",
            f"Average plant-based meal: {to_kg} kg CO2 (legumes, vegetables)",
            "Dairy included in plant-based meal estimate",
            "Saving from red meat replacement would be even higher",
        ]
        return after_kg, assumptions

    def _compute_equivalents(self, saved_kg_month: float) -> list[str]:
        """
        Convert CO2 savings to relatable human-scale equivalents.

        Args:
            saved_kg_month: Monthly CO2 savings in kg

        Returns:
            List of equivalency strings
        """
        saved_kg_year = saved_kg_month * 12
        equivalents: list[str] = []

        if saved_kg_year > 0:
            # Trees
            trees = saved_kg_year / KG_CO2_PER_TREE_YEAR
            equivalents.append(
                f"Equivalent to planting {trees:.0f} tree{'s' if trees != 1 else ''} per year"
            )

            # Car km avoided
            km_avoided = saved_kg_year / KG_CO2_PER_KM_CAR
            equivalents.append(
                f"Like removing {km_avoided:,.0f} km of car driving per year"
            )

            # Smartphone charges
            charges = saved_kg_year / KG_CO2_PER_SMARTPHONE_CHARGE
            equivalents.append(
                f"Equivalent to {charges:,.0f} smartphone charges avoided"
            )

        return equivalents


def get_simulation_engine() -> SimulationEngine:
    """Dependency injection factory for SimulationEngine."""
    return SimulationEngine()
