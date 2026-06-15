"""
Custom exception hierarchy for CarbonWise AI.
Provides structured error responses and clean exception propagation.
"""
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.logging import get_logger

logger = get_logger(__name__)


# ── Domain Exceptions ──────────────────────────────────────────────────────────


class CarbonWiseError(Exception):
    """Base exception for all CarbonWise domain errors."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}


class AIServiceError(CarbonWiseError):
    """Raised when the AI/LLM service fails."""

    def __init__(self, message: str = "AI service unavailable.") -> None:
        super().__init__(
            message=message,
            code="AI_SERVICE_ERROR",
            status_code=503,
        )


class AIRateLimitError(CarbonWiseError):
    """Raised when AI API rate limit is hit."""

    def __init__(self) -> None:
        super().__init__(
            message="AI service rate limit exceeded. Please retry after a moment.",
            code="AI_RATE_LIMIT",
            status_code=429,
        )


class DocumentProcessingError(CarbonWiseError):
    """Raised when document OCR or analysis fails."""

    def __init__(self, message: str = "Failed to process document.") -> None:
        super().__init__(
            message=message,
            code="DOCUMENT_PROCESSING_ERROR",
            status_code=422,
        )


class InvalidInputError(CarbonWiseError):
    """Raised when validated input fails domain-level rules."""

    def __init__(self, message: str, field: str | None = None) -> None:
        super().__init__(
            message=message,
            code="INVALID_INPUT",
            status_code=400,
            details={"field": field} if field else {},
        )


class EmissionFactorNotFoundError(CarbonWiseError):
    """Raised when a requested emission factor is missing from the dataset."""

    def __init__(self, factor_key: str) -> None:
        super().__init__(
            message=f"Emission factor not found: {factor_key}",
            code="EMISSION_FACTOR_NOT_FOUND",
            status_code=404,
            details={"factor_key": factor_key},
        )


class ConfigurationError(CarbonWiseError):
    """Raised when required configuration is missing or invalid."""

    def __init__(self, message: str) -> None:
        super().__init__(
            message=message,
            code="CONFIGURATION_ERROR",
            status_code=503,
        )


# ── Exception Handlers ─────────────────────────────────────────────────────────


def _error_response(
    status_code: int,
    code: str,
    message: str,
    details: dict[str, Any] | None = None,
) -> JSONResponse:
    """Build a standardised error JSON response."""
    import json

    body: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
        }
    }
    if details:
        # Safely convert details to ensure JSON serializability
        try:
            serializable_details = json.loads(json.dumps(details, default=str))
            body["error"]["details"] = serializable_details
        except Exception:
            body["error"]["details"] = str(details)
    return JSONResponse(status_code=status_code, content=body)


async def carbonwise_exception_handler(
    request: Request, exc: CarbonWiseError
) -> JSONResponse:
    logger.error(
        "domain_error",
        code=exc.code,
        message=exc.message,
        path=str(request.url),
        details=exc.details,
    )
    return _error_response(
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        details=exc.details or None,
    )


async def http_exception_handler(
    request: Request, exc: HTTPException
) -> JSONResponse:
    logger.warning(
        "http_error",
        status_code=exc.status_code,
        detail=exc.detail,
        path=str(request.url),
    )
    return _error_response(
        status_code=exc.status_code,
        code="HTTP_ERROR",
        message=str(exc.detail),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = exc.errors()
    logger.warning(
        "validation_error",
        errors=errors,
        path=str(request.url),
    )
    return _error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        code="VALIDATION_ERROR",
        message="Request validation failed.",
        details={"errors": errors},
    )


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    logger.exception(
        "unhandled_exception",
        exc_type=type(exc).__name__,
        path=str(request.url),
    )
    return _error_response(
        status_code=500,
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected error occurred. Please try again later.",
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI app."""
    app.add_exception_handler(CarbonWiseError, carbonwise_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(HTTPException, http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)  # type: ignore[arg-type]
