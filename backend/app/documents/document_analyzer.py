"""
Document Analysis Pipeline.
Pluggable OCR + AI extraction for PDFs, images, receipts, utility bills, flight tickets.
Uses Gemini Vision for content extraction and carbon impact estimation.
"""
import base64
import io
import json
import re
import time
from pathlib import Path
from typing import Any, Protocol

from app.ai.gemini_client import GeminiClient, get_gemini_client
from app.core.exceptions import DocumentProcessingError
from app.core.logging import get_logger
from app.core.security import compute_file_hash
from app.schemas.schemas import (
    DocumentAnalysisResponse,
    DocumentEmissions,
    DocumentType,
    ExtractedDocumentData,
)

logger = get_logger(__name__)


# ── OCR Provider Protocol ──────────────────────────────────────────────────────

class OCRProvider(Protocol):
    """
    Protocol for OCR providers.
    Implement this to swap in Tesseract, AWS Textract, Google Vision, etc.
    """
    async def extract_text(self, content: bytes, mime_type: str) -> str:
        """Extract text from document bytes."""
        ...


# ── Gemini Vision OCR Provider ─────────────────────────────────────────────────

class GeminiVisionProvider:
    """
    OCR provider using Gemini 2.5 Flash Vision capabilities.
    Extracts structured text from images and PDFs.
    """

    def __init__(self, ai_client: GeminiClient) -> None:
        self._ai = ai_client

    async def extract_text(self, content: bytes, mime_type: str) -> str:
        """Extract text from document using Gemini Vision."""
        try:
            import google.generativeai as genai
            from app.core.config import get_settings

            settings = get_settings()
            genai.configure(api_key=settings.GEMINI_API_KEY)

            # Encode content as base64
            b64_content = base64.b64encode(content).decode("utf-8")

            model = genai.GenerativeModel(
                model_name=settings.GEMINI_MODEL,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,  # Low temp for extraction accuracy
                    max_output_tokens=2048,
                ),
            )

            # Create multipart request with image/PDF
            parts = [
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": b64_content,
                    }
                },
                {
                    "text": (
                        "Extract all text from this document. "
                        "Include all numbers, dates, amounts, and structured data. "
                        "Preserve the document structure. Output raw extracted text only."
                    )
                },
            ]

            response = await model.generate_content_async(parts)
            return response.text

        except Exception as exc:
            logger.warning("gemini_vision_ocr_failed", error=str(exc))
            return ""  # Graceful degradation


# ── Document Classifier ────────────────────────────────────────────────────────

def classify_document(
    filename: str, mime_type: str, extracted_text: str
) -> DocumentType:
    """
    Classify document type from filename, MIME type, and extracted text.

    Args:
        filename: Original filename
        mime_type: MIME type
        extracted_text: OCR-extracted text

    Returns:
        DocumentType classification
    """
    text_lower = extracted_text.lower()
    fname_lower = filename.lower()

    # Flight ticket detection
    flight_keywords = ["boarding pass", "flight", "airline", "airport", "seat", "gate", "depart", "arrival"]
    if any(kw in text_lower for kw in flight_keywords):
        return DocumentType.flight_ticket

    # Utility bill detection
    utility_keywords = ["electricity", "gas", "water", "kwh", "units consumed", "meter reading", "tariff"]
    if any(kw in text_lower for kw in utility_keywords):
        return DocumentType.utility_bill

    # Receipt detection
    receipt_keywords = ["receipt", "total", "subtotal", "tax", "vat", "payment", "amount due"]
    if any(kw in text_lower for kw in receipt_keywords):
        return DocumentType.receipt

    # MIME-based fallback
    if mime_type == "application/pdf":
        return DocumentType.pdf
    elif mime_type.startswith("image/"):
        return DocumentType.image

    return DocumentType.unknown


# ── Carbon Impact Estimators ───────────────────────────────────────────────────

async def estimate_flight_emissions(
    extracted_data: dict[str, Any], ai_client: GeminiClient
) -> DocumentEmissions:
    """Estimate CO2 from flight ticket data."""
    try:
        prompt = f"""From this flight ticket data, estimate the CO2 emissions.

Extracted data: {json.dumps(extracted_data, indent=2)}

Calculate:
1. Flight distance (km) based on origin/destination if available
2. kg CO2 per passenger (use ICAO factor: 0.255 kg/km for short-haul, 0.195 for long-haul)
3. Include radiative forcing multiplier of 1.9 for high-altitude effects

Respond with JSON only:
{{
  "total_kg_co2": <number>,
  "breakdown": {{
    "direct_co2_kg": <number>,
    "radiative_forcing_kg": <number>
  }},
  "methodology": "<brief explanation>",
  "notes": ["<note1>", "<note2>"]
}}"""

        response = await ai_client.generate_structured(
            system_context="You are an aviation carbon calculator. Use ICAO emission factors.",
            user_prompt=prompt,
        )
        return _parse_emissions_response(response)
    except Exception:
        # Fallback estimate: ~450 kg for average flight
        return DocumentEmissions(
            total_kg_co2=450.0,
            breakdown={"estimated_flight_co2": 450.0},
            methodology="Default estimate for average short-haul flight (ICAO 2023)",
            notes=["Unable to extract specific flight details — using average estimate"],
        )


async def estimate_utility_emissions(
    extracted_data: dict[str, Any], ai_client: GeminiClient
) -> DocumentEmissions:
    """Estimate CO2 from utility bill data."""
    try:
        prompt = f"""From this utility bill data, estimate the CO2 emissions.

Extracted data: {json.dumps(extracted_data, indent=2)}

Use these emission factors:
- Electricity: 0.233 kg CO2/kWh (UK grid average) or 0.386 (US average)
- Natural gas: 0.203 kg CO2/kWh
- If kWh not available, estimate from cost (UK: ~£0.28/kWh, US: ~$0.13/kWh)

Respond with JSON only:
{{
  "total_kg_co2": <number>,
  "breakdown": {{
    "electricity_kg": <number>,
    "gas_kg": <number>
  }},
  "methodology": "<brief explanation>",
  "notes": ["<note1>"]
}}"""

        response = await ai_client.generate_structured(
            system_context="You are a home energy carbon calculator. Use DEFRA/EPA emission factors.",
            user_prompt=prompt,
        )
        return _parse_emissions_response(response)
    except Exception:
        return DocumentEmissions(
            total_kg_co2=120.0,
            breakdown={"estimated_utility_co2": 120.0},
            methodology="Default estimate for average monthly utility bill",
            notes=["Unable to extract specific consumption data — using average estimate"],
        )


async def estimate_receipt_emissions(
    extracted_data: dict[str, Any], ai_client: GeminiClient
) -> DocumentEmissions:
    """Estimate CO2 from shopping receipt."""
    try:
        prompt = f"""From this shopping receipt, estimate the total CO2 footprint of the purchases.

Extracted data: {json.dumps(extracted_data, indent=2)}

Use these emission factors:
- Food items: 2-27 kg CO2/kg (varies by type)
- Clothing: ~10 kg CO2/item
- Electronics: 70-400 kg CO2/unit
- General retail: ~5 kg CO2 per £10 spent

Respond with JSON only:
{{
  "total_kg_co2": <number>,
  "breakdown": {{
    "food_kg": <number>,
    "non_food_kg": <number>
  }},
  "methodology": "<brief explanation>",
  "notes": ["<note1>"]
}}"""

        response = await ai_client.generate_structured(
            system_context="You are a product lifecycle carbon analyst. Estimate embedded carbon in purchases.",
            user_prompt=prompt,
        )
        return _parse_emissions_response(response)
    except Exception:
        return DocumentEmissions(
            total_kg_co2=25.0,
            breakdown={"estimated_purchase_co2": 25.0},
            methodology="Default estimate based on average receipt value",
            notes=["Unable to extract specific items — using average estimate"],
        )


def _parse_emissions_response(response_text: str) -> DocumentEmissions:
    """Parse AI emissions response JSON safely."""
    json_match = re.search(r"\{.*?\}", response_text, re.DOTALL)
    if json_match:
        data = json.loads(json_match.group())
        return DocumentEmissions(
            total_kg_co2=float(data.get("total_kg_co2", 0)),
            breakdown=data.get("breakdown", {}),
            methodology=data.get("methodology", "AI-estimated"),
            notes=data.get("notes", []),
        )
    raise ValueError("Could not parse emissions JSON from AI response")


# ── Main Document Analyzer ─────────────────────────────────────────────────────

class DocumentAnalyzer:
    """
    Pluggable document analysis pipeline.

    Pipeline:
    1. Validate file (handled in route layer)
    2. OCR/text extraction via provider
    3. Document classification
    4. Structured data extraction via AI
    5. Carbon impact estimation
    """

    def __init__(self, ai_client: GeminiClient | None = None) -> None:
        self._ai = ai_client or get_gemini_client()
        self._ocr_provider: OCRProvider = GeminiVisionProvider(self._ai)

    def set_ocr_provider(self, provider: OCRProvider) -> None:
        """Swap OCR provider (Tesseract, AWS Textract, etc.)."""
        self._ocr_provider = provider

    async def analyze(
        self,
        content: bytes,
        filename: str,
        mime_type: str,
    ) -> DocumentAnalysisResponse:
        """
        Full document analysis pipeline.

        Args:
            content: Raw file bytes
            filename: Original filename
            mime_type: Validated MIME type

        Returns:
            DocumentAnalysisResponse with extracted data and emissions
        """
        start_time = time.time()
        warnings: list[str] = []
        file_hash = compute_file_hash(content)

        logger.info(
            "document_analysis_started",
            filename=filename,
            mime_type=mime_type,
            size_bytes=len(content),
            file_hash=file_hash[:8],
        )

        # Step 1: OCR extraction
        extracted_text = ""
        try:
            extracted_text = await self._ocr_provider.extract_text(content, mime_type)
        except Exception as exc:
            logger.warning("ocr_extraction_failed", error=str(exc))
            warnings.append("Text extraction was limited — document may be image-only")

        # Step 2: Classify document
        doc_type = classify_document(filename, mime_type, extracted_text)

        # Step 3: AI structured extraction
        extracted_data = await self._extract_structured_data(
            extracted_text, doc_type, filename
        )
        extracted_data.raw_text = extracted_text[:500] if extracted_text else None

        # Step 4: Estimate carbon impact
        emissions = await self._estimate_emissions(extracted_data, doc_type)

        processing_ms = round((time.time() - start_time) * 1000)

        logger.info(
            "document_analysis_complete",
            doc_type=doc_type.value,
            total_co2=emissions.total_kg_co2,
            processing_ms=processing_ms,
        )

        return DocumentAnalysisResponse(
            document_type=doc_type,
            extracted_data=extracted_data,
            estimated_emissions=emissions,
            processing_time_ms=processing_ms,
            warnings=warnings,
        )

    async def _extract_structured_data(
        self,
        extracted_text: str,
        doc_type: DocumentType,
        filename: str,
    ) -> ExtractedDocumentData:
        """Use AI to extract structured fields from document text."""
        try:
            prompt = f"""Extract structured data from this {doc_type.value} document.

Document text:
{extracted_text[:3000] if extracted_text else "No text extracted"}

Respond with JSON only:
{{
  "document_subtype": "<specific type if known>",
  "date": "<date if found, ISO format>",
  "vendor": "<company/airline name if found>",
  "total_amount": <number or null>,
  "currency": "<currency code or null>",
  "items": [
    {{"name": "<item>", "quantity": <number>, "amount": <number>}}
  ],
  "flight_details": {{
    "origin": "<airport code>",
    "destination": "<airport code>",
    "flight_number": "<number>",
    "class": "<economy|business|first>"
  }},
  "utility_details": {{
    "electricity_kwh": <number or null>,
    "gas_kwh": <number or null>,
    "billing_period_days": <number or null>
  }},
  "confidence_score": <0.0-1.0>
}}"""

            response = await self._ai.generate_structured(
                system_context="You are a document data extraction specialist. Extract all available structured data.",
                user_prompt=prompt,
            )

            json_match = re.search(r"\{.*?\}", response, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return ExtractedDocumentData(
                    document_subtype=data.get("document_subtype"),
                    date=data.get("date"),
                    vendor=data.get("vendor"),
                    total_amount=data.get("total_amount"),
                    currency=data.get("currency"),
                    items=data.get("items", []),
                    flight_details=data.get("flight_details"),
                    utility_details=data.get("utility_details"),
                    confidence_score=float(data.get("confidence_score", 0.5)),
                )
        except Exception as exc:
            logger.warning("structured_extraction_failed", error=str(exc))

        return ExtractedDocumentData(confidence_score=0.2)

    async def _estimate_emissions(
        self,
        extracted_data: ExtractedDocumentData,
        doc_type: DocumentType,
    ) -> DocumentEmissions:
        """Route to appropriate emissions estimator by document type."""
        data_dict = extracted_data.model_dump(exclude={"raw_text"})

        if doc_type == DocumentType.flight_ticket:
            return await estimate_flight_emissions(data_dict, self._ai)
        elif doc_type == DocumentType.utility_bill:
            return await estimate_utility_emissions(data_dict, self._ai)
        elif doc_type == DocumentType.receipt:
            return await estimate_receipt_emissions(data_dict, self._ai)
        else:
            # Generic estimation
            return DocumentEmissions(
                total_kg_co2=0.0,
                methodology="Document type not recognised for carbon estimation",
                notes=["Upload a flight ticket, utility bill, or receipt for carbon estimation"],
            )


def get_document_analyzer() -> DocumentAnalyzer:
    """Dependency injection factory for DocumentAnalyzer."""
    return DocumentAnalyzer()
