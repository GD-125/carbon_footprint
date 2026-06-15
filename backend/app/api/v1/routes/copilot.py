"""
Copilot API router.
POST /api/copilot/chat — AI sustainability chat endpoint.
"""
from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings
from app.core.logging import get_logger
from app.schemas.schemas import CopilotRequest, CopilotResponse
from app.services.copilot_service import CopilotService, get_copilot_service

router = APIRouter(prefix="/copilot", tags=["AI Copilot"])
logger = get_logger(__name__)


@router.post(
    "/chat",
    response_model=CopilotResponse,
    summary="AI Sustainability Copilot Chat",
    description=(
        "Ask the AI sustainability copilot any question about carbon footprints, "
        "emission factors, lifestyle changes, or sustainability topics. "
        "Optionally provide your carbon profile context for personalised responses."
    ),
    response_description="AI-generated sustainability answer with sources and follow-up suggestions",
)
async def copilot_chat(
    request: CopilotRequest,
    service: CopilotService = Depends(get_copilot_service),
) -> CopilotResponse:
    """
    AI Sustainability Copilot endpoint.

    Accepts a user message and optional carbon profile context.
    Returns an AI-generated answer with cited sources and follow-up suggestions.

    Rate limited to prevent abuse.
    Input is sanitized against prompt injection.
    """
    logger.info("copilot_chat_endpoint_called", message_preview=request.message[:50])
    return await service.chat(request)
