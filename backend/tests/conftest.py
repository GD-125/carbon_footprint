"""
Pytest configuration and shared fixtures.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture(scope="session")
def app():
    """Create FastAPI test app."""
    import os
    os.environ["GEMINI_API_KEY"] = "test-key-for-testing"
    os.environ["ENVIRONMENT"] = "development"
    os.environ["LOG_FORMAT"] = "console"
    
    from app.main import create_app
    return create_app()


@pytest.fixture(scope="session")
def client(app):
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_gemini_response():
    """Mock Gemini AI response."""
    return (
        "Flying produces approximately 0.255 kg CO2 per km for short-haul flights (ICAO 2023), "
        "compared to trains at 0.041 kg CO2 per km (DEFRA 2023). "
        "For a 500 km journey, flying emits ~127 kg CO2 while train emits ~20 kg CO2.",
        512,
    )


@pytest.fixture
def sample_profile_request():
    """Sample carbon profile request."""
    return {
        "commute": "car",
        "commute_km_per_day": 20.0,
        "food": "mixed",
        "travel": "monthly",
        "work": "office",
        "home_size": "apartment_medium",
        "shopping_habit": "average",
        "renewable_energy": False,
        "num_people_household": 2,
    }


@pytest.fixture
def eco_profile_request():
    """Low-emission profile for testing."""
    return {
        "commute": "bicycle",
        "commute_km_per_day": 5.0,
        "food": "vegan",
        "travel": "never",
        "work": "remote",
        "home_size": "apartment_small",
        "shopping_habit": "minimal",
        "renewable_energy": True,
        "num_people_household": 2,
    }
