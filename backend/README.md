# CarbonWise AI — Backend

> **AI-Powered Carbon Footprint Awareness Platform**
> Production-grade FastAPI backend powered by Google Gemini 2.5 Flash

[![CI](https://github.com/your-org/carbonwise/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/your-org/carbonwise/actions)
[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)](https://fastapi.tiangolo.com)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-orange)](https://ai.google.dev)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Testing](#testing)
- [Security](#security)
- [Assumptions](#assumptions)
- [Future Improvements](#future-improvements)

---

## Overview

**Chosen Vertical:** AI-Powered Carbon Footprint Awareness Platform

**Approach:** AI Sustainability Copilot — an intelligent backend that answers sustainability questions, calculates personalized carbon footprints, generates contextual recommendations, simulates lifestyle changes, and analyzes documents for carbon impact.

### How It Works

```
Frontend (Next.js 15)
        │
        ▼
┌─────────────────────────────────┐
│     FastAPI Backend             │
│  ┌─────────────────────────┐   │
│  │   Security Layer         │   │
│  │  (Rate limiting, OWASP) │   │
│  └──────────┬──────────────┘   │
│             │                   │
│  ┌──────────▼──────────────┐   │
│  │   API Routes (v1)        │   │
│  │  /copilot /profile       │   │
│  │  /recommendations        │   │
│  │  /simulate /insights     │   │
│  │  /document               │   │
│  └──────────┬──────────────┘   │
│             │                   │
│  ┌──────────▼──────────────┐   │
│  │   Service Layer          │   │
│  │  CarbonCalcEngine        │   │
│  │  RecommendationEngine    │   │
│  │  SimulationEngine        │   │
│  │  InsightsEngine          │   │
│  │  DocumentAnalyzer        │   │
│  └──────────┬──────────────┘   │
│             │                   │
│  ┌──────────▼──────────────┐   │
│  │   AI Layer               │   │
│  │  Gemini 2.5 Flash        │   │
│  │  (chat + vision)         │   │
│  └──────────┬──────────────┘   │
│             │                   │
│  ┌──────────▼──────────────┐   │
│  │   Data Layer             │   │
│  │  emission_factors.json   │   │
│  │  (DB-ready interface)    │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

---

## Architecture

### Clean Architecture Layers

| Layer | Location | Responsibility |
|---|---|---|
| **API** | `app/api/v1/routes/` | HTTP request/response handling |
| **Services** | `app/services/` | Business logic orchestration |
| **AI** | `app/ai/` | Gemini 2.5 Flash integration |
| **Carbon** | `app/carbon/` | Emission calculation engine |
| **Simulations** | `app/simulations/` | Scenario modeling |
| **Insights** | `app/insights/` | AI + rule-based analytics |
| **Documents** | `app/documents/` | OCR + document analysis |
| **Schemas** | `app/schemas/` | Pydantic v2 contracts |
| **Core** | `app/core/` | Config, logging, security, metrics |
| **Data** | `data/` | Static emission factor datasets |

### Design Principles

- **SOLID**: Single responsibility per module, dependency injection throughout
- **Clean Architecture**: Dependencies point inward; data layer is DB-swappable
- **Type Safety**: 100% type hints with Pydantic v2 validation
- **Observability**: Structured JSON logging, request tracing, metrics endpoint
- **Security**: OWASP API Top 10 compliance, prompt injection protection

---

## Features

### 1. 🤖 AI Sustainability Copilot
**`POST /api/copilot/chat`**

Chat with an AI sustainability expert powered by Gemini 2.5 Flash.
- Sustainability-specific system prompt
- Source citation extraction (IPCC, DEFRA, IEA)
- Topic-aware follow-up suggestions
- Prompt injection protection
- Streaming-ready architecture

### 2. 📊 Carbon Profile Engine
**`POST /api/profile/analyze`**

Calculate your personalized monthly carbon footprint.
- 6 emission categories: transport, food, energy, shopping, travel, waste
- Peer-reviewed emission factors (DEFRA 2023, IEA 2023, Oxford 2023)
- 0-100 carbon score with category labels
- Paris Agreement compliance check
- Comparison vs. global, US, UK averages

### 3. 💡 Recommendation Engine
**`POST /api/recommendations`**

Context-aware sustainability recommendations.
- 10 templates covering all emission categories
- Calculated CO2 savings (not generic estimates)
- Quick wins highlighted (low effort, meaningful impact)
- Focus area filtering (transport, food, energy, etc.)
- Implementation tips per recommendation

### 4. 🔮 Scenario Simulator
**`POST /api/simulate`**

Simulate the impact of specific lifestyle changes.

| Scenario | Typical Saving |
|---|---|
| Electric Vehicle | 100-200 kg CO₂/month |
| Vegetarian Diet | 50-80 kg CO₂/month |
| Vegan Diet | 80-130 kg CO₂/month |
| Remote Work | 30-120 kg CO₂/month |
| Solar Power | 50-200 kg CO₂/month |
| Reduced Flights (-75%) | 50-300 kg CO₂/month |
| LED Lighting | 5-15 kg CO₂/month |
| Plant-Based Meals (7/wk) | 20-40 kg CO₂/month |

### 5. 🧠 Insights Engine
**`POST /api/insights`**

Hybrid AI + rule-based sustainability insights.
- Category-specific observations (positive/neutral/warning/critical)
- AI-generated personalised narrative (Gemini 2.5 Flash)
- Peer comparison vs. 4 benchmarks
- Single highest-priority action

### 6. 📄 Document Analyzer
**`POST /api/document/analyze`**

Upload documents for carbon impact estimation.
- **Supported**: PDF, JPEG, PNG, WebP, GIF (max 10MB)
- **Document types**: Receipt, Utility Bill, Flight Ticket, Generic
- **OCR**: Gemini Vision (pluggable — swap for Tesseract, AWS Textract)
- **Estimation**: AI-powered carbon calculation per document type

---

## Quick Start

### Prerequisites
- Python 3.12+
- Google Gemini API key ([Get one free](https://aistudio.google.com/app/apikey))

### 1. Install Dependencies

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set your GEMINI_API_KEY
```

```env
GEMINI_API_KEY=your_actual_api_key_here
ENVIRONMENT=development
LOG_FORMAT=console
```

### 3. Run the Server

```bash
# Option A: Direct
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Option B: Script
bash scripts/start_dev.sh

# Option C: Docker
docker compose up api-dev --profile dev
```

### 4. Explore the API

- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health**: http://localhost:8000/health

---

## API Reference

### Base URL
```
http://localhost:8000/api
```

### Endpoints

#### AI Copilot Chat
```http
POST /api/copilot/chat
Content-Type: application/json

{
  "message": "Compare train and flight travel emissions",
  "context": {"commute": "car", "food": "mixed"}  // optional
}
```

**Response:**
```json
{
  "answer": "Flying produces ~0.255 kg CO2/km vs trains at 0.041 kg/km...",
  "sources": ["DEFRA 2023", "ICAO 2023"],
  "suggestions": ["What is the carbon footprint of an EV?"],
  "tokens_used": 512
}
```

#### Carbon Profile Analysis
```http
POST /api/profile/analyze
Content-Type: application/json

{
  "commute": "car",
  "commute_km_per_day": 20.0,
  "food": "mixed",
  "travel": "monthly",
  "work": "office",
  "home_size": "apartment_medium",
  "shopping_habit": "average",
  "renewable_energy": false,
  "num_people_household": 2
}
```

**Response:**
```json
{
  "carbon_score": 72,
  "category": "Average Urban",
  "estimated_monthly_emissions": 430.5,
  "breakdown": {
    "transport": 149.3,
    "food": 171.1,
    "energy": 62.4,
    "shopping": 65.0,
    "travel": 75.0,
    "waste": 10.6
  },
  "comparison": {
    "vs_global_average_pct": 7.6,
    "is_paris_compliant": false
  }
}
```

#### Recommendations
```http
POST /api/recommendations
Content-Type: application/json

{
  "profile": { "commute": "car", "food": "mixed", ... },
  "max_recommendations": 5,
  "focus_areas": ["transport", "food"]  // optional
}
```

#### Scenario Simulation
```http
POST /api/simulate
Content-Type: application/json

{
  "profile": { "commute": "car", "food": "mixed", ... },
  "scenario": "electric_vehicle"
}
```

**Response:**
```json
{
  "before_kg_month": 430.5,
  "after_kg_month": 290.1,
  "saved_kg_month": 140.4,
  "saved_kg_year": 1684.8,
  "reduction_percentage": 32.6,
  "assumptions": ["Assumed 1200 km driven per month", ...],
  "equivalent_context": ["Equivalent to planting 77 trees per year", ...]
}
```

#### Document Analysis
```http
POST /api/document/analyze
Content-Type: multipart/form-data

file: <your_document.pdf>
```

---

## Deployment

### Railway

1. Connect your GitHub repository
2. Set environment variables:
   ```
   GEMINI_API_KEY=your_key
   ENVIRONMENT=production
   LOG_FORMAT=json
   PORT=8000
   ```
3. Deploy — Railway auto-detects the `Dockerfile`

### Render

1. Create a new **Web Service**
2. Point to your repository
3. Set **Build Command**: `pip install -r backend/requirements.txt`
4. Set **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables in the dashboard

### Azure App Service

```bash
# Build and push container
docker build -t carbonwise-api ./backend
docker tag carbonwise-api yourregistry.azurecr.io/carbonwise-api:latest
docker push yourregistry.azurecr.io/carbonwise-api:latest

# Deploy to App Service
az webapp create \
  --resource-group carbonwise-rg \
  --plan carbonwise-plan \
  --name carbonwise-api \
  --deployment-container-image-name yourregistry.azurecr.io/carbonwise-api:latest
```

### Environment Variables (All Platforms)

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | — | Google Gemini 2.5 Flash API key |
| `ENVIRONMENT` | No | `production` | `development`/`staging`/`production` |
| `LOG_FORMAT` | No | `json` | `json` (prod) or `console` (dev) |
| `ALLOWED_ORIGINS` | No | `localhost:3000` | JSON array of allowed CORS origins |
| `MAX_FILE_SIZE_MB` | No | `10` | Max upload file size |
| `RATE_LIMIT_COPILOT` | No | `20/minute` | AI chat rate limit |

---

## Testing

### Run All Tests

```bash
cd backend
pytest tests/ -v
```

### With Coverage Report

```bash
pytest tests/ --cov=app --cov-report=html
open htmlcov/index.html
```

### Test Categories

| File | Coverage |
|---|---|
| `tests/test_carbon_calculator.py` | Carbon engine, scoring, breakdowns |
| `tests/test_api.py` | All 6 API endpoints, security, edge cases |
| `tests/conftest.py` | Shared fixtures, mocks |

### Mock AI in Tests

All tests mock the Gemini API so no real API key is needed:

```python
from unittest.mock import AsyncMock, patch

with patch("app.ai.gemini_client.GeminiClient.generate", new_callable=AsyncMock) as mock:
    mock.return_value = ("AI response text", 256)
    # ... your test
```

---

## Security

### Implemented Measures

| Threat | Mitigation |
|---|---|
| **API3: Excessive Data Exposure** | Pydantic v2 response models filter fields |
| **API4: Lack of Rate Limiting** | SlowAPI rate limiting per IP per endpoint |
| **API7: Security Misconfiguration** | OWASP security headers on all responses |
| **Prompt Injection** | Pattern matching + input sanitization |
| **MIME Spoofing** | Magic-byte validation for file uploads |
| **File Size Attacks** | 10MB limit enforced before reading |
| **Information Disclosure** | Docs disabled in production |
| **Container Security** | Non-root user in Docker |

### Security Headers Applied
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Cache-Control: no-store
Content-Security-Policy: default-src 'self'
```

---

## Assumptions

### Emission Factors
- **Transport**: UK DEFRA 2023 factors (globally applicable with ±20% variance)
- **Food**: Oxford University 2023 diet studies — per-day kg CO2 by diet type
- **Aviation**: ICAO 2023 factors; radiative forcing multiplier (1.9x) included in document analysis
- **Energy**: Global IEA 2023 average grid (0.475 kg/kWh) as default; renewable = 0.020 kg/kWh
- **Shopping**: WRAP 2023 UK consumer spending data

### Calculation Assumptions
- **Commute**: 22 working days/month, return trip (2x one-way distance)
- **Hybrid work**: 50% office days
- **Energy per person**: Home kWh ÷ household size
- **Flights monthly average**: Annual flights ÷ 12
- **Average flight**: 2,000 km at 0.225 kg/km

### Data Storage
- No database used — all data is in-memory or JSON files
- Emission factors in `data/emission_factors.json` (can be updated without code changes)
- Interface designed for database migration: `EmissionFactorRepository` protocol

---

## Future Improvements

### Near-term
- [ ] **PostgreSQL integration** — Add user profiles and history
- [ ] **WebSocket streaming** — Stream copilot responses token-by-token
- [ ] **Redis caching** — Cache expensive AI calls
- [ ] **Langchain integration** — RAG over sustainability literature

### Medium-term
- [ ] **User authentication** — JWT-based auth with profile persistence
- [ ] **Carbon tracker** — Daily/weekly emission logging over time
- [ ] **Offset marketplace** — Verified carbon offset recommendations
- [ ] **Team dashboard** — Organizational carbon tracking

### Long-term
- [ ] **IoT integration** — Smart meter and EV charger data
- [ ] **Supply chain analysis** — Scope 3 emissions for businesses
- [ ] **Regulatory compliance** — GHG Protocol reporting tools
- [ ] **Multi-region emission factors** — Country-specific grid data

---

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── routes/
│   │       │   ├── copilot.py      # POST /api/copilot/chat
│   │       │   ├── profile.py      # POST /api/profile/analyze
│   │       │   ├── recommendations.py  # POST /api/recommendations
│   │       │   ├── simulate.py     # POST /api/simulate
│   │       │   ├── insights.py     # POST /api/insights
│   │       │   ├── document.py     # POST /api/document/analyze
│   │       │   └── health.py       # GET /health, GET /metrics
│   │       └── router.py           # Route aggregator
│   ├── core/
│   │   ├── config.py               # Pydantic Settings
│   │   ├── logging.py              # structlog setup
│   │   ├── exceptions.py           # Exception hierarchy
│   │   ├── security.py             # OWASP security utilities
│   │   └── metrics.py              # Runtime metrics
│   ├── ai/
│   │   └── gemini_client.py        # Gemini 2.5 Flash client
│   ├── carbon/
│   │   ├── calculator.py           # Emission calculation engine
│   │   └── emission_repository.py  # Data access layer
│   ├── services/
│   │   ├── copilot_service.py      # Chat orchestration
│   │   └── recommendation_service.py  # Rec engine
│   ├── simulations/
│   │   └── simulation_engine.py    # Scenario simulator
│   ├── insights/
│   │   └── insights_engine.py      # AI + rule insights
│   ├── documents/
│   │   └── document_analyzer.py    # OCR + carbon pipeline
│   ├── schemas/
│   │   └── schemas.py              # Pydantic v2 models
│   └── main.py                     # FastAPI app factory
├── tests/
│   ├── conftest.py                 # Fixtures
│   ├── test_carbon_calculator.py   # Unit tests
│   └── test_api.py                 # Integration tests
├── data/
│   ├── emission_factors.json       # Emission factor dataset
│   └── sustainability_knowledge.json  # Knowledge base
├── scripts/
│   └── start_dev.sh               # Dev startup script
├── .env.example                   # Environment template
├── Dockerfile                     # Multi-stage container
├── docker-compose.yml             # Container orchestration
├── pyproject.toml                 # Ruff + Black + pytest config
├── requirements.txt               # Python dependencies
└── README.md                      # This file
```

---

## License

MIT License — see [LICENSE](../LICENSE)

---

*Built with 🌿 for a sustainable future.*
