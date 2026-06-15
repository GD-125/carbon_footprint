# ── CarbonWise AI Backend Dockerfile ───────────────────────────────────────────
# Multi-stage build for minimal production image

# ── Stage 1: Builder ───────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir --target=/deps -r requirements.txt

# ── Stage 2: Production ────────────────────────────────────────────────────────
FROM python:3.12-slim AS production

# Create non-root user for security
RUN groupadd -r carbonwise && useradd -r -g carbonwise -d /app carbonwise

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /deps /usr/local/lib/python3.12/site-packages

# Copy application code
COPY app/ ./app/
COPY data/ ./data/
COPY main.py .

# Set ownership
RUN chown -R carbonwise:carbonwise /app

# Switch to non-root user
USER carbonwise

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" \
    || exit 1

# Expose port
EXPOSE 8000

# Run application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--log-config", "null"]
