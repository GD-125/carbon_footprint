"""
Unit tests for the Carbon Calculation Engine.
Tests emission calculations, scoring, and profile analysis.
"""
import pytest
from pathlib import Path

from app.carbon.calculator import CarbonCalculationEngine
from app.carbon.emission_repository import EmissionFactorRepository
from app.schemas.schemas import CarbonProfileRequest, CommuteType, DietType, TravelFrequency, WorkLocation


DATA_FILE = Path(__file__).parent.parent / "data" / "emission_factors.json"


@pytest.fixture
def repo():
    return EmissionFactorRepository(DATA_FILE)


@pytest.fixture
def engine(repo):
    return CarbonCalculationEngine(repository=repo)


@pytest.fixture
def base_profile():
    return CarbonProfileRequest(
        commute=CommuteType.car,
        commute_km_per_day=20.0,
        food=DietType.mixed,
        travel=TravelFrequency.rarely,
        work=WorkLocation.office,
        home_size="apartment_medium",
        shopping_habit="average",
        renewable_energy=False,
        num_people_household=2,
    )


class TestCarbonCalculationEngine:
    """Tests for CarbonCalculationEngine."""

    def test_profile_returns_valid_response(self, engine, base_profile):
        """Profile analysis returns a valid response structure."""
        result = engine.calculate_profile(base_profile)
        assert result.carbon_score >= 0
        assert result.carbon_score <= 100
        assert result.estimated_monthly_emissions > 0
        assert result.category != ""
        assert len(result.breakdown) > 0

    def test_car_commuter_has_higher_transport_than_cyclist(self, engine, repo):
        """Car commuters have higher transport emissions than cyclists."""
        car_profile = CarbonProfileRequest(
            commute=CommuteType.car,
            commute_km_per_day=20.0,
            food=DietType.mixed,
            travel=TravelFrequency.never,
            work=WorkLocation.office,
        )
        bike_profile = CarbonProfileRequest(
            commute=CommuteType.bicycle,
            commute_km_per_day=20.0,
            food=DietType.mixed,
            travel=TravelFrequency.never,
            work=WorkLocation.office,
        )
        car_result = engine.calculate_profile(car_profile)
        bike_result = engine.calculate_profile(bike_profile)
        assert car_result.breakdown["transport"] > bike_result.breakdown["transport"]

    def test_vegan_has_lower_food_emissions_than_meat_heavy(self, engine, repo):
        """Vegan diet has lower food emissions than meat-heavy."""
        vegan = CarbonProfileRequest(
            commute=CommuteType.bicycle,
            food=DietType.vegan,
            travel=TravelFrequency.never,
            work=WorkLocation.remote,
        )
        meat = CarbonProfileRequest(
            commute=CommuteType.bicycle,
            food=DietType.meat_heavy,
            travel=TravelFrequency.never,
            work=WorkLocation.remote,
        )
        assert engine.calculate_profile(vegan).breakdown["food"] < engine.calculate_profile(meat).breakdown["food"]

    def test_renewable_energy_reduces_energy_emissions(self, engine):
        """Renewable energy reduces home energy emissions significantly."""
        no_renewable = CarbonProfileRequest(renewable_energy=False, home_size="house_medium")
        with_renewable = CarbonProfileRequest(renewable_energy=True, home_size="house_medium")
        nr = engine.calculate_profile(no_renewable)
        wr = engine.calculate_profile(with_renewable)
        assert wr.breakdown["energy"] < nr.breakdown["energy"]

    def test_remote_work_reduces_transport_emissions(self, engine):
        """Remote work eliminates commute transport emissions."""
        office = CarbonProfileRequest(
            commute=CommuteType.car,
            commute_km_per_day=20.0,
            work=WorkLocation.office,
        )
        remote = CarbonProfileRequest(
            commute=CommuteType.car,
            commute_km_per_day=20.0,
            work=WorkLocation.remote,
        )
        office_result = engine.calculate_profile(office)
        remote_result = engine.calculate_profile(remote)
        assert remote_result.breakdown["transport"] < office_result.breakdown["transport"]

    def test_frequent_flyer_has_higher_travel_than_non_flyer(self, engine):
        """Frequent flyers have much higher travel emissions."""
        frequent = CarbonProfileRequest(travel=TravelFrequency.frequent)
        never = CarbonProfileRequest(travel=TravelFrequency.never)
        assert (
            engine.calculate_profile(frequent).breakdown["travel"]
            > engine.calculate_profile(never).breakdown["travel"]
        )

    def test_score_ranges_0_to_100(self, engine):
        """Carbon score is always between 0 and 100."""
        profiles = [
            CarbonProfileRequest(commute=CommuteType.car, commute_km_per_day=100, travel=TravelFrequency.frequent, food=DietType.meat_heavy),
            CarbonProfileRequest(commute=CommuteType.bicycle, travel=TravelFrequency.never, food=DietType.vegan, renewable_energy=True),
        ]
        for p in profiles:
            result = engine.calculate_profile(p)
            assert 0 <= result.carbon_score <= 100

    def test_breakdown_keys_present(self, engine, base_profile):
        """All expected emission categories are in breakdown."""
        result = engine.calculate_profile(base_profile)
        expected_keys = {"transport", "food", "energy", "shopping", "travel", "waste"}
        assert expected_keys.issubset(set(result.breakdown.keys()))

    def test_breakdown_sums_to_total(self, engine, base_profile):
        """Breakdown values sum to estimated total."""
        result = engine.calculate_profile(base_profile)
        breakdown_total = sum(result.breakdown.values())
        assert abs(breakdown_total - result.estimated_monthly_emissions) < 0.1

    def test_comparison_fields_present(self, engine, base_profile):
        """Comparison contains expected fields."""
        result = engine.calculate_profile(base_profile)
        assert "vs_global_average_pct" in result.comparison
        assert "is_paris_compliant" in result.comparison
        assert "global_monthly_avg_kg" in result.comparison
