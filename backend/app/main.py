"""
CarbonWise AI — FastAPI Application Factory.
Production-grade setup with middleware, CORS, rate limiting,
exception handling, structured logging, and OpenAPI docs.
"""
import time
import uuid

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.api.v1.router import api_router, health_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import get_logger, setup_logging
from app.core.metrics import metrics
from app.core.security import security_headers_middleware

# Initialise settings
settings = get_settings()

# Initialise logging before anything else
setup_logging(
    log_level=settings.LOG_LEVEL,
    log_format=settings.LOG_FORMAT,
)

logger = get_logger(__name__)


def create_app() -> FastAPI:
    """
    FastAPI application factory.

    Creates and configures the FastAPI app with:
    - CORS middleware
    - Rate limiting (SlowAPI)
    - Security headers middleware
    - Request ID and metrics middleware
    - Exception handlers
    - OpenAPI documentation
    - All feature routers
    """

    # ── Create FastAPI app ─────────────────────────────────────────────────────
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=f"""
## {settings.APP_NAME}

{settings.APP_DESCRIPTION}

### Features

| Endpoint | Description |
|---|---|
| `POST /api/copilot/chat` | AI Sustainability Copilot |
| `POST /api/profile/analyze` | Carbon Footprint Profile Analysis |
| `POST /api/recommendations` | Personalized Recommendations |
| `POST /api/simulate` | Scenario Simulation |
| `POST /api/insights` | AI Sustainability Insights |
| `POST /api/document/analyze` | Document Carbon Analysis |
| `GET /health` | Health Check |
| `GET /metrics` | Runtime Metrics |

### AI Model
Powered by **Google Gemini 2.5 Flash** — state-of-the-art AI for sustainability intelligence.

### Data Sources
- UK DEFRA 2023 emission factors
- IEA 2023 electricity grid data
- ICAO 2023 aviation emissions
- Oxford University dietary footprint study 2023
- Poore & Nemecek 2018 food systems analysis
        """,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        contact={
            "name": "CarbonWise AI Team",
            "url": "https://carbonwise.ai",
        },
        license_info={
            "name": "MIT License",
        },
    )

    # ── Rate Limiter ───────────────────────────────────────────────────────────
    limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # ── CORS ───────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        max_age=600,
    )

    # ── Security Headers Middleware ────────────────────────────────────────────
    app.middleware("http")(security_headers_middleware)

    # ── Request ID + Metrics Middleware ────────────────────────────────────────
    @app.middleware("http")
    async def request_middleware(request: Request, call_next) -> Response:
        """
        Attaches a unique request ID to each request for tracing.
        Records metrics for observability.
        """
        request_id = str(uuid.uuid4())[:8]
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )

        metrics.record_request()
        start_time = time.time()

        try:
            response = await call_next(request)
        except Exception as exc:
            metrics.record_error()
            raise

        elapsed_ms = round((time.time() - start_time) * 1000, 1)

        logger.info(
            "request_completed",
            status_code=response.status_code,
            elapsed_ms=elapsed_ms,
        )

        response.headers["X-Request-ID"] = request_id
        return response

    # ── Exception Handlers ─────────────────────────────────────────────────────
    register_exception_handlers(app)

    # ── Routers ────────────────────────────────────────────────────────────────
    app.include_router(api_router)
    app.include_router(health_router)

    # ── Startup / Shutdown Events ──────────────────────────────────────────────
    @app.on_event("startup")
    async def on_startup() -> None:
        """Pre-load emission factors and validate configuration."""
        logger.info(
            "carbonwise_api_starting",
            version=settings.APP_VERSION,
            environment=settings.ENVIRONMENT,
            model=settings.GEMINI_MODEL,
        )
        try:
            # Eagerly load emission factors to catch file errors early
            from app.carbon.emission_repository import get_emission_repository
            get_emission_repository()
            logger.info("emission_factors_preloaded_successfully")
        except Exception as exc:
            logger.error("emission_factors_preload_failed", error=str(exc))

        if not settings.GEMINI_API_KEY:
            logger.warning(
                "gemini_api_key_missing",
                message="AI features (copilot, insights, document analysis) will not work without GEMINI_API_KEY",
            )

    @app.on_event("shutdown")
    async def on_shutdown() -> None:
        """Graceful shutdown logging."""
        logger.info(
            "carbonwise_api_shutting_down",
            uptime_seconds=round(metrics.uptime_seconds),
            total_requests=metrics.requests_total,
        )

    logger.info("carbonwise_app_created", version=settings.APP_VERSION)
    return app


# ── Application instance ───────────────────────────────────────────────────────
app = create_app()
