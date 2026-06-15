"""
Emission factor data loader.
Loads and caches emission factors from JSON file.
Designed to support future database migration.
"""
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.core.exceptions import EmissionFactorNotFoundError
from app.core.logging import get_logger

logger = get_logger(__name__)


class EmissionFactorRepository:
    """
    Repository for emission factor data.
    Currently backed by JSON file — interface ready for DB migration.

    All values are in kg CO2e per unit as documented in each factor.
    Sources: UK DEFRA 2023, IEA 2023, ICAO 2023, Poore & Nemecek 2018, Oxford University 2023.
    """

    def __init__(self, data_path: Path) -> None:
        self._path = data_path
        self._data: dict[str, Any] = {}
        self._load()

    def _load(self) -> None:
        """Load emission factors from JSON file."""
        try:
            with open(self._path, encoding="utf-8") as f:
                self._data = json.load(f)
            logger.info(
                "emission_factors_loaded",
                path=str(self._path),
                categories=list(self._data.keys()),
            )
        except FileNotFoundError:
            logger.error("emission_factors_file_not_found", path=str(self._path))
            raise FileNotFoundError(
                f"Emission factors file not found at {self._path}. "
                "Ensure data/emission_factors.json exists."
            )
        except json.JSONDecodeError as exc:
            logger.error("emission_factors_parse_error", error=str(exc))
            raise ValueError(f"Failed to parse emission factors JSON: {exc}") from exc

    def get_transport_factor(self, mode: str) -> float:
        """
        Get kg CO2 per km for a transport mode.

        Args:
            mode: Transport mode (car, bus, train, etc.)

        Returns:
            kg CO2 per km

        Raises:
            EmissionFactorNotFoundError: If mode is not found
        """
        transport = self._data.get("transportation", {})
        if mode == "car" or mode == "electric_car":
            car_data = transport.get("car", {})
            if mode == "electric_car":
                return car_data.get("electric", {}).get("kg_co2_per_km", 0.053)
            return car_data.get("average", {}).get("kg_co2_per_km", 0.170)

        factor_data = transport.get(mode, {})
        if not factor_data:
            # Default: 0 for zero-emission modes, error for unknown
            if mode in ("bicycle", "walking", "work_from_home"):
                return 0.0
            raise EmissionFactorNotFoundError(f"transport:{mode}")

        # Some factors are nested dicts, others are flat
        if isinstance(factor_data, dict) and "kg_co2_per_km" in factor_data:
            return factor_data["kg_co2_per_km"]
        elif isinstance(factor_data, dict):
            # Try to get average sub-key
            avg = factor_data.get("average", {})
            if isinstance(avg, dict):
                return avg.get("kg_co2_per_km", 0.0)

        return 0.0

    def get_diet_factor(self, diet_type: str) -> float:
        """
        Get kg CO2 per day for a diet type.

        Args:
            diet_type: Diet type (vegan, vegetarian, mixed, etc.)

        Returns:
            kg CO2 per day
        """
        profiles = self._data.get("food", {}).get("diet_profiles", {})
        if diet_type not in profiles:
            raise EmissionFactorNotFoundError(f"diet:{diet_type}")
        return profiles[diet_type]["kg_co2_per_day"]

    def get_energy_factor(self, energy_type: str = "global_average") -> float:
        """
        Get kg CO2 per kWh for electricity.

        Args:
            energy_type: Grid type (global_average, uk_average, renewable, etc.)

        Returns:
            kg CO2 per kWh
        """
        electricity = self._data.get("energy", {}).get("electricity", {})
        if energy_type not in electricity:
            energy_type = "global_average"
        return electricity[energy_type]["kg_co2_per_kwh"]

    def get_home_kwh_per_month(self, home_size: str) -> float:
        """
        Get average monthly kWh consumption for a home size.

        Args:
            home_size: Size descriptor (apartment_small, house_medium, etc.)

        Returns:
            Average kWh per month
        """
        profiles = self._data.get("energy", {}).get("home_profiles", {})
        if home_size not in profiles:
            home_size = "apartment_medium"
        return profiles[home_size]["kwh_per_month"]

    def get_shopping_factor(self, habit: str) -> float:
        """
        Get monthly kg CO2 for shopping habits.

        Args:
            habit: Shopping habit (minimal/average/high)

        Returns:
            kg CO2 per month
        """
        profiles = self._data.get("shopping", {}).get("spending_profiles", {})
        if habit not in profiles:
            habit = "average"
        return profiles[habit]["kg_co2_per_month"]

    def get_scenario_data(self, scenario: str) -> dict[str, Any]:
        """
        Get scenario simulation data.

        Args:
            scenario: Scenario name

        Returns:
            Scenario parameters dict
        """
        scenarios = self._data.get("scenarios", {})
        if scenario not in scenarios:
            raise EmissionFactorNotFoundError(f"scenario:{scenario}")
        return scenarios[scenario]

    def get_benchmarks(self) -> dict[str, Any]:
        """Return global benchmark data."""
        return self._data.get("benchmarks", {})

    def get_category_label(self, monthly_kg: float) -> str:
        """
        Map monthly emissions to a human-readable category label.

        Args:
            monthly_kg: Monthly CO2e in kg

        Returns:
            Category label string
        """
        categories = self.get_benchmarks().get("categories", {})
        for _key, cat_data in categories.items():
            if monthly_kg <= cat_data["max_monthly_kg"]:
                return cat_data["label"]
        return "Very High Footprint"

    def get_travel_factor(self, frequency: str) -> float:
        """
        Get annual kg CO2 from flight travel frequency.

        Args:
            frequency: Travel frequency enum value

        Returns:
            Annual kg CO2 from flights (divided by 12 for monthly)
        """
        # Average flight: 2000 km at 0.225 kg/km = 450 kg per flight
        avg_flight_kg = 2000 * 0.225
        frequency_map = {
            "never": 0,
            "rarely": 2,       # 2 flights/year
            "monthly": 12,     # 12 flights/year
            "weekly": 48,      # 48 flights/year
            "frequent": 96,    # 96 flights/year (2/week)
        }
        flights_per_year = frequency_map.get(frequency, 2)
        return (flights_per_year * avg_flight_kg) / 12  # monthly kg CO2


@lru_cache(maxsize=1)
def get_emission_repository() -> EmissionFactorRepository:
    """Return cached emission factor repository singleton."""
    settings = get_settings()
    return EmissionFactorRepository(settings.emission_factors_path)
