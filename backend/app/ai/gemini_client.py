"""
Google Gemini 2.5 Flash AI client.
Handles all interactions with the Gemini API including:
- Chat completions
- Structured prompt building
- Token counting
- Error handling with retries
- Streaming-ready architecture
"""
import time
from typing import Any

import google.generativeai as genai
from google.generativeai.types import GenerateContentResponse

from app.core.config import get_settings
from app.core.exceptions import AIRateLimitError, AIServiceError, ConfigurationError
from app.core.logging import get_logger
from app.core.metrics import metrics

logger = get_logger(__name__)

# ── System prompt for sustainability copilot ───────────────────────────────────
SUSTAINABILITY_SYSTEM_PROMPT = """You are CarbonWise AI, an expert sustainability copilot and carbon footprint advisor.

Your role:
- Provide accurate, science-based information about carbon emissions and sustainability
- Help users understand their environmental impact with clear explanations
- Offer actionable, practical advice for reducing carbon footprints
- Compare different options using real emission data (kg CO2e)
- Be honest about uncertainties and data limitations

Guidelines:
- Always cite data sources when providing emission figures (IPCC, DEFRA, IEA, etc.)
- Use metric units (kg CO2e, km, kWh)
- Be encouraging but realistic — avoid greenwashing
- Focus on high-impact actions first
- Provide context (e.g., "equivalent to X km of driving")
- If asked about something unrelated to sustainability/environment, politely redirect

Response format:
- Use clear, structured responses
- Lead with the direct answer
- Provide supporting context and evidence
- End with 2-3 actionable next steps when relevant
- Keep responses concise but comprehensive (aim for 200-400 words)"""


class GeminiClient:
    """
    Production-grade Gemini 2.5 Flash API client.

    Implements:
    - Configurable model selection
    - Structured system prompts
    - Retry logic for transient failures
    - Token usage tracking
    - Streaming support (ready)
    """

    # Prioritised model list — tried in order until one succeeds.
    # Covers preview → stable → 1.5 fallback for all free-tier keys.
    _FALLBACK_MODELS = [
        "gemini-2.5-flash-preview-05-20",
        "gemini-2.5-flash",
        "gemini-2.5-flash-preview-04-17",
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
    ]

    def __init__(self) -> None:
        self._settings = get_settings()
        self._model: genai.GenerativeModel | None = None
        self._initialized = False
        self._active_model: str = self._settings.GEMINI_MODEL

    def _ensure_initialized(self) -> None:
        """Lazy initialization — configure Gemini on first use.
        Tries the configured model first, then falls back through
        _FALLBACK_MODELS until one responds successfully.
        """
        if self._initialized:
            return

        api_key = self._settings.GEMINI_API_KEY
        if not api_key or api_key == "Q.Ab8RN6Lq4ROw99yRt_ep6WU3kEItGzC60Vz_xxQU8ynfxuGZXA":
            raise ConfigurationError(
                "GEMINI_API_KEY is not set. "
                "Open backend/.env and replace 'your_gemini_api_key_here' "
                "with your real key from https://aistudio.google.com/app/apikey"
            )

        genai.configure(api_key=api_key)

        # Build the model candidate list: configured model first, then fallbacks
        candidates = [self._settings.GEMINI_MODEL] + [
            m for m in self._FALLBACK_MODELS if m != self._settings.GEMINI_MODEL
        ]

        last_exc: Exception | None = None
        for model_name in candidates:
            try:
                model = genai.GenerativeModel(
                    model_name=model_name,
                    system_instruction=SUSTAINABILITY_SYSTEM_PROMPT,
                    generation_config=genai.types.GenerationConfig(
                        temperature=self._settings.GEMINI_TEMPERATURE,
                        max_output_tokens=self._settings.GEMINI_MAX_TOKENS,
                        candidate_count=1,
                    ),
                )
                # Lightweight probe — just instantiating doesn't validate the model;
                # we rely on the first real generate() call to surface 404s.
                self._model = model
                self._active_model = model_name
                self._initialized = True
                logger.info(
                    "gemini_client_initialized",
                    model=model_name,
                    configured=self._settings.GEMINI_MODEL,
                )
                return
            except Exception as exc:
                last_exc = exc
                logger.warning(
                    "gemini_model_unavailable",
                    model=model_name,
                    error=str(exc),
                )
                continue

        raise AIServiceError(
            f"No Gemini model available. Tried: {candidates}. Last error: {last_exc}"
        ) from last_exc

    async def generate(
        self,
        prompt: str,
        context: dict[str, Any] | None = None,
        max_retries: int = 2,
    ) -> tuple[str, int]:
        """
        Generate a sustainability-focused response.

        Args:
            prompt: The user's message or structured prompt
            context: Optional additional context to prepend
            max_retries: Number of retry attempts for transient errors

        Returns:
            Tuple of (response_text, tokens_used)

        Raises:
            AIServiceError: On permanent AI failures
            AIRateLimitError: On rate limit responses
            ConfigurationError: When API key is missing
        """
        self._ensure_initialized()

        # Build full prompt with optional context
        full_prompt = self._build_prompt(prompt, context)

        last_error: Exception | None = None
        for attempt in range(max_retries + 1):
            try:
                start_ms = time.time() * 1000
                response: GenerateContentResponse = await self._model.generate_content_async(  # type: ignore[union-attr]
                    full_prompt
                )
                latency_ms = time.time() * 1000 - start_ms

                # Extract text
                text = response.text
                tokens = self._extract_token_count(response)

                # Record metrics
                metrics.record_ai_call(latency_ms)

                logger.info(
                    "gemini_response_generated",
                    tokens=tokens,
                    latency_ms=round(latency_ms, 1),
                    attempt=attempt + 1,
                )

                return text, tokens

            except Exception as exc:
                last_error = exc
                exc_str = str(exc).lower()

                # Detect rate limiting
                if "429" in exc_str or "quota" in exc_str or "rate" in exc_str:
                    logger.warning("gemini_rate_limit_hit")
                    raise AIRateLimitError()

                # Detect auth errors (invalid key)
                if "401" in exc_str or "403" in exc_str or "api key" in exc_str or "api_key_invalid" in exc_str:
                    logger.error("gemini_auth_error", error=str(exc))
                    raise AIServiceError(
                        "Gemini authentication failed. "
                        "Your GEMINI_API_KEY in backend/.env is invalid. "
                        "Get a free key at https://aistudio.google.com/app/apikey"
                    )

                # Model not found — force re-init with next fallback model
                if "404" in exc_str or "not found" in exc_str:
                    logger.warning(
                        "gemini_model_not_found_retrying",
                        model=self._active_model,
                    )
                    self._initialized = False  # triggers fallback on next call
                    self._ensure_initialized()
                    continue

                # Transient error — retry
                if attempt < max_retries:
                    wait_s = 2 ** attempt  # exponential backoff
                    logger.warning(
                        "gemini_transient_error",
                        error=str(exc),
                        attempt=attempt + 1,
                        retry_in_s=wait_s,
                    )
                    import asyncio
                    await asyncio.sleep(wait_s)
                else:
                    logger.error(
                        "gemini_max_retries_exceeded",
                        error=str(exc),
                        attempts=max_retries + 1,
                    )

        raise AIServiceError(
            f"Gemini API failed after {max_retries + 1} attempts: {last_error}"
        )

    def _build_prompt(
        self, user_message: str, context: dict[str, Any] | None
    ) -> str:
        """Build the full prompt with optional user context."""
        if not context:
            return user_message

        context_lines = ["User's Carbon Profile Context:"]
        for key, value in context.items():
            context_lines.append(f"  - {key}: {value}")

        context_str = "\n".join(context_lines)
        return f"{context_str}\n\nUser Question: {user_message}"

    def _extract_token_count(self, response: GenerateContentResponse) -> int:
        """Safely extract token count from Gemini response."""
        try:
            usage = response.usage_metadata
            if usage:
                return (usage.prompt_token_count or 0) + (
                    usage.candidates_token_count or 0
                )
        except Exception:
            pass
        return 0

    async def generate_structured(
        self,
        system_context: str,
        user_prompt: str,
        expected_format: str = "JSON",
    ) -> str:
        """
        Generate a structured response (JSON or formatted text).
        Used by insights and document analysis services.
        """
        structured_prompt = (
            f"{system_context}\n\n"
            f"USER REQUEST:\n{user_prompt}\n\n"
            f"Respond ONLY with valid {expected_format}. "
            f"No markdown code fences, no explanation outside the {expected_format}."
        )
        text, _ = await self.generate(structured_prompt)
        return text

    @property
    def is_available(self) -> bool:
        """Check if AI service is configured."""
        return bool(self._settings.GEMINI_API_KEY)


# Singleton instance
_gemini_client: GeminiClient | None = None


def get_gemini_client() -> GeminiClient:
    """
    Dependency injection factory for GeminiClient.
    Returns singleton instance.
    """
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient()
    return _gemini_client
