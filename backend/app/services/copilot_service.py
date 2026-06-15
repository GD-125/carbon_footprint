"""
Copilot service — AI Sustainability Chat.
Wraps Gemini client with domain-specific logic:
- Message enrichment
- Response parsing
- Suggestion generation
- Source attribution
"""
import re
from typing import Any

from app.ai.gemini_client import GeminiClient, get_gemini_client
from app.core.logging import get_logger
from app.core.security import validate_user_message
from app.schemas.schemas import CopilotRequest, CopilotResponse

logger = get_logger(__name__)

# Pre-defined follow-up suggestions for common topics
SUGGESTION_TEMPLATES: dict[str, list[str]] = {
    "transport": [
        "What is the carbon footprint of electric vehicles?",
        "How does train compare to bus for commuting?",
        "What are the best ways to reduce commute emissions?",
    ],
    "food": [
        "How much CO2 does a vegan diet save vs meat?",
        "Which foods have the highest carbon footprint?",
        "How can I reduce food waste to cut emissions?",
    ],
    "energy": [
        "How much CO2 can solar panels save?",
        "What appliances use the most energy at home?",
        "Is it worth switching to a green energy tariff?",
    ],
    "flight": [
        "What is the carbon footprint of a long-haul flight?",
        "Are there carbon offsets for flights?",
        "How does flying first class compare to economy?",
    ],
    "default": [
        "How do I calculate my total carbon footprint?",
        "What are the highest-impact changes I can make?",
        "How does my footprint compare to the global average?",
    ],
}


class CopilotService:
    """
    AI Sustainability Copilot service.

    Orchestrates:
    - Input validation and sanitization
    - Context enrichment from user profile
    - Gemini API call
    - Response parsing and enrichment (sources, suggestions)
    """

    def __init__(self, ai_client: GeminiClient | None = None) -> None:
        self._ai = ai_client or get_gemini_client()

    async def chat(self, request: CopilotRequest) -> CopilotResponse:
        """
        Handle a copilot chat message.

        Args:
            request: CopilotRequest with message and optional context

        Returns:
            CopilotResponse with answer, sources, suggestions
        """
        # Security: validate and sanitize
        sanitized_message = validate_user_message(request.message)

        logger.info(
            "copilot_chat_request",
            message_length=len(sanitized_message),
            has_context=request.context is not None,
        )

        # Generate AI response
        answer_text, tokens_used = await self._ai.generate(
            prompt=sanitized_message,
            context=request.context,
        )

        # Enrich response
        sources = self._extract_sources(answer_text)
        suggestions = self._generate_suggestions(sanitized_message)

        logger.info(
            "copilot_chat_response",
            tokens_used=tokens_used,
            sources_count=len(sources),
            suggestions_count=len(suggestions),
        )

        return CopilotResponse(
            answer=answer_text,
            sources=sources,
            suggestions=suggestions,
            tokens_used=tokens_used or None,
        )

    def _extract_sources(self, text: str) -> list[str]:
        """
        Extract cited sources from AI response text.
        Looks for patterns like (Source: DEFRA), [IPCC 2022], etc.
        """
        sources: list[str] = []

        # Pattern: (DEFRA 2023), (IEA 2023), (IPCC 2022), etc.
        parenthetical = re.findall(
            r"\(([A-Z][A-Za-z\s]+(?:20\d{2}|19\d{2})?)\)", text
        )
        sources.extend(parenthetical)

        # Known authoritative sources
        known_sources = [
            "IPCC", "IEA", "DEFRA", "EPA", "ICAO", "Oxford University",
            "Poore & Nemecek", "MIT", "NASA", "UNEP", "World Bank"
        ]
        for src in known_sources:
            if src.lower() in text.lower() and src not in sources:
                sources.append(src)

        # Deduplicate while preserving order
        seen: set[str] = set()
        unique: list[str] = []
        for s in sources:
            if s not in seen:
                seen.add(s)
                unique.append(s)

        return unique[:5]  # Cap at 5 sources

    def _generate_suggestions(self, message: str) -> list[str]:
        """
        Generate follow-up question suggestions based on message topic.
        """
        msg_lower = message.lower()

        if any(w in msg_lower for w in ["car", "transport", "drive", "commut", "bus", "train"]):
            return SUGGESTION_TEMPLATES["transport"][:3]
        elif any(w in msg_lower for w in ["food", "eat", "diet", "vegan", "meat", "beef"]):
            return SUGGESTION_TEMPLATES["food"][:3]
        elif any(w in msg_lower for w in ["energy", "electric", "solar", "home", "heating"]):
            return SUGGESTION_TEMPLATES["energy"][:3]
        elif any(w in msg_lower for w in ["fly", "flight", "plane", "airport", "aviation"]):
            return SUGGESTION_TEMPLATES["flight"][:3]
        else:
            return SUGGESTION_TEMPLATES["default"][:3]


def get_copilot_service() -> CopilotService:
    """Dependency injection factory for CopilotService."""
    return CopilotService()
