# CarbonWise AI 🌿

> An AI-powered sustainability intelligence platform that helps you track, understand, and reduce your personal carbon footprint — powered by **Google Gemini 2.5 Flash** and **FastAPI**.

![CarbonWise AI](public/placeholder.svg)

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://typescriptlang.org)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?logo=google)](https://aistudio.google.com)
[![Tests](https://img.shields.io/badge/Tests-38_passing-22c55e?logo=pytest)](./backend/tests)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## ✨ Features

| Feature | Description | Status |
|---|---|---|
| 🤖 **AI Copilot** | Chat with Gemini 2.5 Flash about your carbon footprint | ✅ Live |
| 📊 **Carbon Dashboard** | Real-time emissions breakdown with DEFRA 2023 factors | ✅ Live |
| 💡 **AI Insights** | Personalised sustainability insights + peer comparison | ✅ Live |
| 🔬 **Scenario Simulator** | What-if modelling for EVs, vegan diet, solar, remote work | ✅ Live |
| 📄 **Document Analyser** | Upload receipts/bills — Gemini Vision estimates CO₂ impact | ✅ Live |
| 🎯 **Challenges** | Gamified sustainability challenges with progress tracking | ✅ Live |
| 🔐 **Security** | OWASP Top 10, prompt injection protection, rate limiting | ✅ Live |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CarbonWise AI                            │
├─────────────────────────┬───────────────────────────────────┤
│   Frontend (Next.js 16) │   Backend (FastAPI + Python 3.12) │
│   TypeScript · Zustand  │   Gemini 2.5 Flash · Pydantic v2  │
│   Tailwind · Recharts   │   DEFRA/IEA/ICAO Emission Factors  │
│                         │                                   │
│  /dashboard  ──────────►│  POST /api/profile/analyze        │
│  /copilot    ──────────►│  POST /api/copilot/chat           │
│  /simulator  ──────────►│  POST /api/simulate               │
│  /insights   ──────────►│  POST /api/insights               │
│  /documents  ──────────►│  POST /api/document/analyze       │
└─────────────────────────┴───────────────────────────────────┘
```

The frontend uses **Next.js API rewrites** to proxy all `/api/*` calls server-side — no CORS issues on any environment.

---

## 📁 Project Structure

```
carbon_footprint/
├── 📂 app/                          # Next.js 16 App Router pages
│   ├── layout.tsx                   # Root layout (SEO, fonts, viewport)
│   ├── globals.css                  # Design tokens & Tailwind config
│   ├── page.tsx                     # Landing / marketing page
│   ├── onboarding/
│   │   └── page.tsx                 # 5-step profile onboarding
│   ├── dashboard/
│   │   ├── layout.tsx               # Dashboard SEO metadata
│   │   └── page.tsx                 # Carbon metrics, charts, breakdown
│   ├── copilot/
│   │   ├── layout.tsx               # Copilot SEO metadata
│   │   └── page.tsx                 # Gemini AI chat interface
│   ├── simulator/
│   │   ├── layout.tsx               # Simulator SEO metadata
│   │   └── page.tsx                 # Lifestyle scenario simulations
│   ├── insights/
│   │   ├── layout.tsx               # Insights SEO metadata
│   │   └── page.tsx                 # AI-generated sustainability insights
│   ├── documents/
│   │   ├── layout.tsx               # Documents SEO metadata
│   │   └── page.tsx                 # Document upload & carbon analysis
│   ├── challenges/
│   │   └── page.tsx                 # Gamified sustainability challenges
│   └── settings/
│       └── page.tsx                 # Preferences, export, theme
│
├── 📂 components/
│   ├── app-layout.tsx               # Shared sidebar + layout wrapper
│   ├── navigation.tsx               # Sidebar navigation with icons
│   ├── backend-status.tsx           # Live API health indicator
│   └── ui/
│       └── button.tsx               # ShadCN base button
│
├── 📂 lib/
│   ├── types.ts                     # TypeScript contracts (mirrors Pydantic schemas)
│   ├── api-client.ts                # Axios instance (retry, typed errors, proxy)
│   ├── adapters.ts                  # Onboarding→API enum maps, kg↔tonnes convert
│   ├── store.ts                     # Zustand store (async actions, selectors)
│   ├── utils.ts                     # Utility helpers
│   └── services/
│       ├── copilot.service.ts       # POST /api/copilot/chat
│       ├── profile.service.ts       # POST /api/profile/analyze
│       ├── recommendation.service.ts# POST /api/recommendations
│       ├── simulation.service.ts    # POST /api/simulate
│       ├── insight.service.ts       # POST /api/insights
│       ├── document.service.ts      # POST /api/document/analyze
│       └── health.service.ts        # GET /health
│
├── 📂 public/
│   ├── site.webmanifest             # PWA manifest
│   ├── icon.svg                     # App icon
│   └── apple-icon.png               # Apple touch icon
│
├── 📂 backend/                      # FastAPI backend (Python 3.12)
│   ├── 📂 app/
│   │   ├── main.py                  # FastAPI app factory
│   │   ├── 📂 api/v1/
│   │   │   ├── router.py            # API v1 router (/api prefix)
│   │   │   └── routes/
│   │   │       ├── copilot.py       # POST /api/copilot/chat
│   │   │       ├── profile.py       # POST /api/profile/analyze
│   │   │       ├── recommendations.py # POST /api/recommendations
│   │   │       ├── simulate.py      # POST /api/simulate
│   │   │       ├── insights.py      # POST /api/insights
│   │   │       ├── document.py      # POST /api/document/analyze
│   │   │       └── health.py        # GET /health, GET /metrics, GET /
│   │   ├── 📂 ai/
│   │   │   └── gemini_client.py     # Gemini 2.5 Flash client
│   │   ├── 📂 carbon/
│   │   │   ├── calculator.py        # CarbonCalculationEngine
│   │   │   └── emission_repository.py # JSON emission factor loader
│   │   ├── 📂 services/
│   │   │   ├── copilot_service.py   # AI copilot orchestration
│   │   │   └── recommendation_service.py
│   │   ├── 📂 simulations/
│   │   │   └── simulation_engine.py # 8-scenario simulation engine
│   │   ├── 📂 insights/
│   │   │   └── insights_engine.py   # Hybrid AI+rule insights
│   │   ├── 📂 documents/
│   │   │   └── document_analyzer.py # Gemini Vision OCR pipeline
│   │   ├── 📂 schemas/
│   │   │   └── schemas.py           # Pydantic v2 request/response models
│   │   └── 📂 core/
│   │       ├── config.py            # Pydantic Settings (env vars)
│   │       ├── exceptions.py        # Typed exception handlers
│   │       ├── logging.py           # structlog structured logging
│   │       ├── metrics.py           # AppMetrics singleton
│   │       └── security.py          # Security headers middleware
│   ├── 📂 data/
│   │   ├── emission_factors.json    # DEFRA/IEA/ICAO emission factors
│   │   └── sustainability_knowledge.json # AI knowledge base
│   ├── 📂 tests/
│   │   ├── conftest.py              # Pytest fixtures
│   │   ├── test_api.py              # API integration tests (38 tests)
│   │   └── test_carbon_calculator.py# Unit tests for carbon engine
│   ├── 📂 scripts/
│   │   └── start_dev.sh             # Dev startup script
│   ├── Dockerfile                   # Multi-stage production image
│   ├── docker-compose.yml           # Local orchestration
│   ├── pyproject.toml               # Poetry/pytest/ruff config
│   ├── requirements.txt             # pip dependencies
│   └── .env.example                 # Environment variable template
│
├── 📂 .github/workflows/
│   └── backend-ci.yml               # CI: lint, typecheck, security, tests
├── .env.example                     # Frontend env template
├── next.config.mjs                  # Next.js config + API rewrites
├── vercel.json                      # Vercel deployment config
├── tsconfig.json                    # TypeScript config
└── package.json                     # Frontend dependencies
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18.17+ |
| Python | 3.12+ |
| npm | 9+ |
| Git | Any |

### 1 — Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/carbonwise-ai.git
cd carbonwise-ai

# Frontend
npm install

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2 — Configure Environment

**Frontend** — copy `.env.example` → `.env.local`:
```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_TIMEOUT=60000
```

**Backend** — copy `backend/.env.example` → `backend/.env`:
```bash
cp backend/.env.example backend/.env
```

```env
GEMINI_API_KEY=AIzaSy...your_key_here    # Get free key: aistudio.google.com
ENVIRONMENT=development
LOG_FORMAT=console
ALLOWED_ORIGINS=["http://localhost:3000"]
```

> **Get a free Gemini API key:** Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) → Sign in → "Create API key" — free tier gives 10 req/min, 500 req/day. No credit card needed.

### 3 — Run

```bash
# Terminal 1 — Backend (from /backend directory)
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend (from root directory)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

**Verify backend:**
```bash
curl http://localhost:8000/          # API directory
curl http://localhost:8000/health   # Health check
curl http://localhost:8000/docs     # Swagger UI
```

---

## 🔌 API Reference

All endpoints are prefixed with `/api`. The frontend proxies these via Next.js rewrites.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API info directory |
| `GET` | `/health` | Health check + component status |
| `GET` | `/metrics` | Runtime metrics (uptime, req/min) |
| `GET` | `/docs` | Swagger UI (development only) |
| `POST` | `/api/copilot/chat` | Gemini AI sustainability chat |
| `POST` | `/api/profile/analyze` | Carbon footprint analysis |
| `POST` | `/api/recommendations` | Personalised recommendations |
| `POST` | `/api/simulate` | Lifestyle scenario simulation |
| `POST` | `/api/insights` | AI-generated insights |
| `POST` | `/api/document/analyze` | Receipt/bill/ticket OCR + CO₂ |

### Example: Carbon Profile Analysis

```bash
curl -X POST http://localhost:8000/api/profile/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "commute": "car",
    "commute_km_per_day": 20,
    "food": "mixed",
    "travel": "rarely",
    "work": "office",
    "home_size": "apartment_medium",
    "shopping_habit": "average",
    "renewable_energy": false,
    "num_people_household": 2
  }'
```

**Response:**
```json
{
  "carbon_score": 47,
  "category": "Average Urban",
  "estimated_monthly_emissions": 566.32,
  "breakdown": {
    "transport": 149.6,
    "food": 171.15,
    "energy": 95.0,
    "shopping": 65.0,
    "travel": 75.0,
    "waste": 10.57
  },
  "comparison": {
    "global_monthly_avg_kg": 500.0,
    "paris_target_monthly_kg": 167.0,
    "is_paris_compliant": false
  }
}
```

---

## 🧪 Testing

```bash
cd backend
source .venv/bin/activate

# Run all tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=app --cov-report=html

# Just unit tests
pytest tests/test_carbon_calculator.py -v

# Just API tests
pytest tests/test_api.py -v
```

**Result: 38/38 tests passing** ✅

---

## 🐳 Docker

```bash
cd backend

# Build and run
docker-compose up --build

# Production image only
docker build -t carbonwise-api .
docker run -p 8000:8000 --env-file .env carbonwise-api
```

---

## ☁️ Deployment

### Frontend → Vercel

```bash
# 1. Push to GitHub
git push origin main

# 2. Import at vercel.com/new
# 3. Set environment variables in Vercel dashboard:
#    NEXT_PUBLIC_API_URL  → https://your-backend.railway.app
#    NEXT_PUBLIC_APP_URL  → https://your-app.vercel.app

# 4. Deploy — done in ~90 seconds
```

### Backend → Railway (Free Tier)

```bash
npm install -g @railway/cli
railway login
cd backend
railway init && railway up

# Set env vars
railway variables set GEMINI_API_KEY=AIza...
railway variables set ENVIRONMENT=production
railway variables set ALLOWED_ORIGINS='["https://your-app.vercel.app"]'
```

### Backend → Render (Free Tier)

1. New Web Service → connect GitHub repo
2. Root Directory: `backend/`
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add env vars in Render dashboard

---

## 🛠 Tech Stack

### Frontend
| Library | Version | Purpose |
|---|---|---|
| Next.js | 16.2 | App Router, SSR, API rewrites |
| TypeScript | 5.7 | Type safety |
| Tailwind CSS | 4.2 | Utility-first styling |
| Zustand | 5.0 | State management + persistence |
| Axios | 1.x | HTTP client with retry logic |
| Framer Motion | 12.x | Animations & transitions |
| Recharts | 3.x | Carbon metrics charts |
| Lucide React | 1.x | Icon system |
| Zod | 4.x | Schema validation |

### Backend
| Library | Version | Purpose |
|---|---|---|
| FastAPI | 0.115 | Async REST API framework |
| Python | 3.12 | Runtime |
| Pydantic v2 | 2.x | Data validation & serialisation |
| google-generativeai | Latest | Gemini 2.5 Flash integration |
| structlog | Latest | Structured JSON logging |
| SlowAPI | Latest | Rate limiting |
| uvicorn | Latest | ASGI server |
| pytest | Latest | Testing framework |

### Data Sources
| Source | Data |
|---|---|
| DEFRA 2023 | UK transport & energy emission factors |
| IEA 2023 | Global electricity grid intensity |
| ICAO 2023 | Aviation emission factors |
| Oxford University 2023 | Dietary footprint analysis |
| Poore & Nemecek 2018 | Food systems lifecycle analysis |
| IPCC AR6 2022 | Solar/wind lifecycle emissions |

---

## 🔒 Security

- ✅ **CORS**: Strict origin allowlist per environment
- ✅ **Rate Limiting**: Copilot 20/min, Analysis 30/min, Document 10/min
- ✅ **Prompt Injection**: Input sanitisation + pattern detection
- ✅ **File Validation**: Magic-byte checks + MIME type + size limits
- ✅ **Security Headers**: `X-Frame-Options`, `X-Content-Type-Options`, CSP
- ✅ **No Secrets in Code**: All keys via environment variables only
- ✅ **Input Validation**: Pydantic v2 strict mode on all request bodies

---

## 🎨 Design System

| Token | Value | Use |
|---|---|---|
| `--primary` | `#22c55e` | Actions, highlights |
| `--accent` | `#14b8a6` | Secondary highlights |
| `--background` | `#020617` | Page background |
| `--card` | `#0f172a` | Card surfaces |
| `--foreground` | `#f8fafc` | Text |
| `--border` | `rgba(255,255,255,0.1)` | Glass borders |

**Effects:** Glassmorphism · Smooth gradients · Framer Motion micro-animations · 60fps

---

## 🗺 Roadmap

- [ ] JWT authentication & user accounts
- [ ] PostgreSQL database (replace JSON data layer)
- [ ] WebSocket streaming for copilot responses
- [ ] Carbon credit marketplace integration
- [ ] Mobile app (React Native)
- [ ] Household/team tracking
- [ ] Smart home device integration
- [ ] AWS Textract enhanced OCR

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

© 2025 CarbonWise AI

---

## 🙏 Acknowledgements

- [Google DeepMind](https://deepmind.google) for Gemini 2.5 Flash
- [DEFRA](https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting) for greenhouse gas conversion factors
- [IEA](https://www.iea.org) for electricity grid emission factors
- [Oxford University](https://www.ox.ac.uk) for dietary footprint research
