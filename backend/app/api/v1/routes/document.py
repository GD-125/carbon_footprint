"""
Document Analysis API router.
POST /api/document/analyze — Document OCR and carbon impact analysis.
"""
from fastapi import APIRouter, Depends, File, UploadFile

from app.core.logging import get_logger
from app.core.security import validate_upload_file
from app.documents.document_analyzer import DocumentAnalyzer, get_document_analyzer
from app.schemas.schemas import DocumentAnalysisResponse

router = APIRouter(prefix="/document", tags=["Document Analyzer"])
logger = get_logger(__name__)


@router.post(
    "/analyze",
    response_model=DocumentAnalysisResponse,
    summary="Analyze Document for Carbon Impact",
    description=(
        "Upload a PDF, image, receipt, utility bill, or flight ticket for carbon impact analysis. "
        "The AI extracts structured data using OCR and estimates the carbon footprint. "
        "Supported formats: PDF, JPEG, PNG, WebP, GIF. Maximum file size: 10MB."
    ),
    response_description="Document type, extracted data, and estimated CO2 emissions",
)
async def analyze_document(
    file: UploadFile = File(
        ...,
        description="Document file to analyze (PDF, JPEG, PNG, WebP, GIF). Max 10MB.",
    ),
    analyzer: DocumentAnalyzer = Depends(get_document_analyzer),
) -> DocumentAnalysisResponse:
    """
    Document Analysis endpoint.

    Pipeline:
    1. File validation (size, MIME type, magic bytes)
    2. OCR text extraction via Gemini Vision
    3. Document type classification
    4. AI structured data extraction
    5. Carbon impact estimation

    The OCR provider is pluggable — can be swapped for
    Tesseract, AWS Textract, or Google Document AI.
    """
    logger.info(
        "document_analyze_endpoint_called",
        filename=file.filename,
        content_type=file.content_type,
    )

    # Validate and read file
    content = await validate_upload_file(file)
    mime_type = (file.content_type or "application/octet-stream").split(";")[0].strip()

    return await analyzer.analyze(
        content=content,
        filename=file.filename or "unknown",
        mime_type=mime_type,
    )
