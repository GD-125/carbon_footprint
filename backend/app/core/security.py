"""
Security utilities for CarbonWise AI.
Covers input validation, prompt injection protection, file validation,
security headers, and OWASP API Security Top 10 mitigations.
"""
import hashlib
import re
from typing import Any

from fastapi import HTTPException, Request, UploadFile, status
from fastapi.responses import Response

from app.core.logging import get_logger

logger = get_logger(__name__)

# ── Prompt Injection Detection ─────────────────────────────────────────────────

# Common prompt injection patterns – tuned to avoid blocking legitimate queries
INJECTION_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"ignore\s+(all\s+)?(previous|above|prior)\s+instructions?", re.I),
    re.compile(r"forget\s+(everything|all|your)\s+(above|previous|prior)", re.I),
    re.compile(r"you\s+are\s+now\s+a?\s*", re.I),
    re.compile(r"act\s+as\s+a(n)?\s+(?!sustainability|carbon|eco)", re.I),
    re.compile(r"disregard\s+(your|all|previous)\s+(instructions?|guidelines?)", re.I),
    re.compile(r"(system\s*prompt|system\s*message)\s*:", re.I),
    re.compile(r"reveal\s+(your|the)\s+(instructions?|prompt|system)", re.I),
    re.compile(r"pretend\s+(you\s+are|to\s+be)", re.I),
    re.compile(r"do\s+not\s+follow\s+", re.I),
    re.compile(r"override\s+(your|previous|all)\s+", re.I),
    re.compile(r"new\s+(instructions?|commands?|directives?)\s*:", re.I),
    re.compile(r"<\s*(system|instruction|prompt|command)\s*>", re.I),
    re.compile(r"\[\s*system\s*\]", re.I),
]

# Allowed MIME types for document upload
ALLOWED_MIME_TYPES: frozenset[str] = frozenset(
    [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
    ]
)

# Max file size: 10 MB
MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024


def sanitize_text_input(text: str, max_length: int = 2000) -> str:
    """
    Sanitize free-text user input.

    - Strip leading/trailing whitespace
    - Truncate to max_length
    - Remove null bytes and control characters (except newline/tab)
    """
    # Remove null bytes
    text = text.replace("\x00", "")
    # Remove control characters except \n, \r, \t
    text = re.sub(r"[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    # Trim
    text = text.strip()[:max_length]
    return text


def detect_prompt_injection(text: str) -> bool:
    """
    Detect likely prompt injection attempts.

    Returns True if injection is suspected.
    """
    for pattern in INJECTION_PATTERNS:
        if pattern.search(text):
            return True
    return False


def validate_user_message(message: str, max_length: int = 2000) -> str:
    """
    Full validation pipeline for copilot messages.

    Raises HTTPException on violation.
    Returns sanitized message.
    """
    if not message or not message.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message cannot be empty.",
        )

    sanitized = sanitize_text_input(message, max_length)

    if len(sanitized) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message contains no valid content after sanitization.",
        )

    if detect_prompt_injection(sanitized):
        logger.warning("prompt_injection_detected", message_preview=sanitized[:100])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message contains disallowed content.",
        )

    return sanitized


# ── File Validation ────────────────────────────────────────────────────────────


async def validate_upload_file(file: UploadFile) -> bytes:
    """
    Validate an uploaded file for size, type, and content safety.

    Returns raw bytes of the file.
    Raises HTTPException on any violation.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file has no filename.",
        )

    # Read file content
    content = await file.read()

    # Size check
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // 1024 // 1024}MB.",
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    # MIME type check from Content-Type header
    content_type = file.content_type or ""
    # Normalize e.g. "image/jpeg; charset=..." → "image/jpeg"
    mime_type = content_type.split(";")[0].strip().lower()

    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{mime_type}' is not supported. Allowed: {sorted(ALLOWED_MIME_TYPES)}",
        )

    # Magic bytes validation (basic check)
    _validate_magic_bytes(content, mime_type)

    logger.info(
        "file_validated",
        filename=file.filename,
        size_bytes=len(content),
        mime_type=mime_type,
    )

    return content


def _validate_magic_bytes(content: bytes, declared_mime: str) -> None:
    """
    Basic magic-byte validation to detect MIME spoofing.
    Raises HTTPException if magic bytes don't match declared MIME.
    """
    magic_map: dict[str, list[bytes]] = {
        "application/pdf": [b"%PDF"],
        "image/jpeg": [b"\xff\xd8\xff"],
        "image/jpg": [b"\xff\xd8\xff"],
        "image/png": [b"\x89PNG"],
        "image/gif": [b"GIF87a", b"GIF89a"],
        "image/webp": [b"RIFF"],
    }

    if declared_mime not in magic_map:
        return  # Can't validate, allow

    expected_signatures = magic_map[declared_mime]
    for sig in expected_signatures:
        if content[: len(sig)] == sig:
            return

    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail="File content does not match declared MIME type. Possible file spoofing.",
    )


# ── Security Headers Middleware ────────────────────────────────────────────────


async def security_headers_middleware(request: Request, call_next: Any) -> Response:
    """
    Add OWASP-recommended security headers to all responses.
    """
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'none'; "
        "object-src 'none'; "
        "frame-ancestors 'none';"
    )
    return response


def compute_file_hash(content: bytes) -> str:
    """Compute SHA-256 hash of file content for deduplication / audit."""
    return hashlib.sha256(content).hexdigest()
