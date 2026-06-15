"""
Pydantic v2 schemas for all API request and response models.
These are the contracts between the frontend and backend.
"""
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


# ── Enums ──────────────────────────────────────────────────────────────────────


class CommuteType(str, Enum):
    """Mode of daily commute."""
    car = "car"
    electric_car = "electric_car"
    bus = "bus"
    train = "train"
    subway = "subway"
    bicycle = "bicycle"
    walking = "walking"
    motorcycle = "motorcycle"
    work_from_home = "work_from_home"


class DietType(str, Enum):
    """Dietary pattern."""
    vegan = "vegan"
    vegetarian = "vegetarian"
    pescatarian = "pescatarian"
    mixed = "mixed"
    meat_heavy = "meat_heavy"


class TravelFrequency(str, Enum):
    """Air/long-distance travel frequency."""
    never = "never"
    rarely = "rarely"        # 1-2 times/year
    monthly = "monthly"      # ~1/month
    weekly = "weekly"        # multiple/month
    frequent = "frequent"    # very frequent flyer


class WorkLocation(str, Enum):
    """Primary work arrangement."""
    office = "office"
    hybrid = "hybrid"
    remote = "remote"
    no_work = "no_work"


class EffortLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class ImpactLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    very_high = "very_high"


class ScenarioType(str, Enum):
    electric_vehicle = "electric_vehicle"
    vegetarian_diet = "vegetarian_diet"
    vegan_diet = "vegan_diet"
    remote_work = "remote_work"
    solar_power = "solar_power"
    reduced_flights = "reduced_flights"
    led_lighting = "led_lighting"
    plant_based_meals = "plant_based_meals"


class DocumentType(str, Enum):
    pdf = "pdf"
    image = "image"
    receipt = "receipt"
    utility_bill = "utility_bill"
    flight_ticket = "flight_ticket"
    unknown = "unknown"


# ── Copilot ────────────────────────────────────────────────────────────────────


class CopilotRequest(BaseModel):
    """Request to the AI sustainability copilot."""

    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="User's question or message",
        examples=["Compare train and flight travel emissions"],
    )
    context: dict[str, Any] | None = Field(
        default=None,
        description="Optional carbon profile context to personalise responses",
    )

    @field_validator("message")
    @classmethod
    def message_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message cannot be blank.")
        return v.strip()


class CopilotResponse(BaseModel):
    """Response from the AI sustainability copilot."""

    answer: str = Field(..., description="AI-generated sustainability answer")
    sources: list[str] = Field(
        default_factory=list,
        description="References cited in the answer",
    )
    suggestions: list[str] = Field(
        default_factory=list,
        description="Follow-up questions or topics",
    )
    tokens_used: int | None = Field(
        default=None,
        description="Approximate tokens consumed (for monitoring)",
    )


# ── Carbon Profile ─────────────────────────────────────────────────────────────


class CarbonProfileRequest(BaseModel):
    """Input for carbon footprint profile analysis."""

    commute: CommuteType = Field(
        default=CommuteType.car,
        description="Primary daily commute mode",
    )
    commute_km_per_day: float = Field(
        default=20.0,
        ge=0,
        le=500,
        description="One-way commute distance in km",
    )
    food: DietType = Field(
        default=DietType.mixed,
        description="Dietary pattern",
    )
    travel: TravelFrequency = Field(
        default=TravelFrequency.rarely,
        description="Frequency of flights/long-distance travel",
    )
    work: WorkLocation = Field(
        default=WorkLocation.office,
        description="Primary work location arrangement",
    )
    home_size: str = Field(
        default="apartment_medium",
        description="Home size descriptor for energy estimation",
    )
    shopping_habit: str = Field(
        default="average",
        description="Shopping frequency (minimal/average/high)",
    )
    renewable_energy: bool = Field(
        default=False,
        description="Whether home uses renewable/green energy tariff",
    )
    num_people_household: int = Field(
        default=2,
        ge=1,
        le=20,
        description="Number of people in household (for per-person allocation)",
    )


class CarbonProfileResponse(BaseModel):
    """Output of carbon profile analysis."""

    carbon_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Relative carbon score (0=lowest impact, 100=highest)",
    )
    category: str = Field(..., description="Human-readable footprint category")
    estimated_monthly_emissions: float = Field(
        ..., description="Estimated kg CO2e per month"
    )
    breakdown: dict[str, float] = Field(
        default_factory=dict,
        description="Emission breakdown by category (kg CO2e/month)",
    )
    comparison: dict[str, Any] = Field(
        default_factory=dict,
        description="How this compares to averages",
    )
    profile_id: str | None = Field(
        default=None,
        description="Temporary profile ID for cross-endpoint use",
    )


# ── Recommendations ────────────────────────────────────────────────────────────


class Recommendation(BaseModel):
    """A single actionable sustainability recommendation."""

    id: str
    title: str
    description: str
    estimated_co2_saving_kg_month: float = Field(
        ..., description="Estimated monthly CO2 saving in kg"
    )
    effort_level: EffortLevel
    impact_level: ImpactLevel
    category: str
    quick_win: bool = Field(
        default=False,
        description="True if this is a low-effort, decent-impact action",
    )
    implementation_tips: list[str] = Field(default_factory=list)


class RecommendationsRequest(BaseModel):
    """Request for personalised recommendations."""

    profile: CarbonProfileRequest
    max_recommendations: int = Field(default=8, ge=1, le=20)
    focus_areas: list[str] | None = Field(
        default=None,
        description="Optional focus: ['transport', 'food', 'energy']",
    )


class RecommendationsResponse(BaseModel):
    """Personalised sustainability recommendations."""

    recommendations: list[Recommendation]
    total_potential_saving_kg_month: float
    quick_wins: list[Recommendation] = Field(default_factory=list)
    top_recommendation: Recommendation | None = None


# ── Scenario Simulation ────────────────────────────────────────────────────────


class SimulationRequest(BaseModel):
    """Request to simulate a lifestyle change scenario."""

    profile: CarbonProfileRequest
    scenario: ScenarioType
    custom_params: dict[str, Any] | None = Field(
        default=None,
        description="Optional overrides for scenario assumptions",
    )


class SimulationResult(BaseModel):
    """Result of a scenario simulation."""

    scenario: ScenarioType
    scenario_label: str
    before_kg_month: float = Field(..., description="Baseline monthly emissions")
    after_kg_month: float = Field(..., description="Post-change monthly emissions")
    saved_kg_month: float = Field(..., description="Monthly CO2 savings")
    saved_kg_year: float = Field(..., description="Annual CO2 savings")
    reduction_percentage: float = Field(..., description="Percentage reduction")
    assumptions: list[str] = Field(
        default_factory=list,
        description="Key assumptions made in the simulation",
    )
    equivalent_context: list[str] = Field(
        default_factory=list,
        description="Human-scale equivalents (e.g., X trees planted)",
    )
    payback_months: int | None = Field(
        default=None,
        description="Estimated payback period for upfront investments",
    )


# ── Insights ───────────────────────────────────────────────────────────────────


class InsightItem(BaseModel):
    """A single AI-generated sustainability insight."""

    category: str
    insight: str
    severity: str = Field(
        ...,
        description="positive / neutral / warning / critical",
    )
    data_point: str | None = None


class InsightsRequest(BaseModel):
    """Request for AI sustainability insights."""

    profile: CarbonProfileRequest


class InsightsResponse(BaseModel):
    """AI-generated sustainability insights."""

    insights: list[InsightItem]
    overall_summary: str
    priority_action: str
    monthly_emissions_kg: float
    peer_comparison: dict[str, Any] = Field(default_factory=dict)


# ── Document Analysis ──────────────────────────────────────────────────────────


class ExtractedDocumentData(BaseModel):
    """Structured data extracted from a document."""

    raw_text: str | None = None
    document_subtype: str | None = None
    date: str | None = None
    vendor: str | None = None
    total_amount: float | None = None
    currency: str | None = None
    items: list[dict[str, Any]] = Field(default_factory=list)
    flight_details: dict[str, Any] | None = None
    utility_details: dict[str, Any] | None = None
    confidence_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Extraction confidence (0-1)",
    )


class DocumentEmissions(BaseModel):
    """Estimated emissions from an analysed document."""

    total_kg_co2: float
    breakdown: dict[str, float] = Field(default_factory=dict)
    methodology: str = ""
    notes: list[str] = Field(default_factory=list)


class DocumentAnalysisResponse(BaseModel):
    """Response from document analysis endpoint."""

    document_type: DocumentType
    extracted_data: ExtractedDocumentData
    estimated_emissions: DocumentEmissions
    processing_time_ms: int | None = None
    warnings: list[str] = Field(default_factory=list)


# ── Health / Observability ─────────────────────────────────────────────────────


class HealthStatus(str, Enum):
    healthy = "healthy"
    degraded = "degraded"
    unhealthy = "unhealthy"


class ComponentHealth(BaseModel):
    status: HealthStatus
    message: str | None = None
    latency_ms: float | None = None


class HealthResponse(BaseModel):
    status: HealthStatus
    version: str
    environment: str
    components: dict[str, ComponentHealth] = Field(default_factory=dict)


class MetricsResponse(BaseModel):
    """Basic application metrics."""

    uptime_seconds: float
    requests_total: int
    requests_per_minute: float
    error_rate: float
    ai_calls_total: int
    avg_ai_latency_ms: float
