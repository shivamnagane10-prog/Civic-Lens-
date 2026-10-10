# CivicLens AI — Municipal Intelligence & Rapid Dispatch Monorepo

CivicLens AI is an AI-assisted municipal spatial monitoring, issue classification, and rapid crew dispatch platform designed to modernize civic governance across municipal wards.

---

## 🏛️ Architecture Overview

- **Backend API (`apps/api`)**: Python 3.11+ / FastAPI, SQLAlchemy, SQLite/PostgreSQL/PostGIS, WebSockets for live telemetry, JWT Authentication (Role-based: `citizen`, `admin`, `engineer`, `crew`), and ML Diagnostic inference.
- **Web Dashboard (`apps/web`)**: Next.js 14 (App Router) + TypeScript + Tailwind CSS, featuring:
  - Interactive Ward Spatial Map with real-time PostGIS layers, Issue pins, and live Crew GPS markers.
  - Smart Prioritization Queue (rules-based scoring: water safety > traffic hazard > quality-of-life).
  - AI Diagnostic Card Inspector with mandatory labeled estimates (`[ESTIMATE]`).
  - One-Click Dispatch with nearest-crew recommendation (distance & ETA).
  - Citizen Portal with offline-first local queue and report status timeline.
  - Public Transparency Portal (`/public/[ward]`) with zero PII and zero crew tracking data.
  - Live WebSocket event subscriptions for real-time synchronization.
- **Mobile Client (`apps/mobile`)**: Expo React Native + TypeScript with offline-first caching, camera simulation, GPS auto-tagging, and crew GPS update broadcaster.
- **Shared Types (`packages/shared-types`)**: Single source of truth for TypeScript interfaces across web and mobile.
- **Infra (`infra/`)**: Docker Compose for PostgreSQL 15 + PostGIS, Redis, and API containers, plus GitHub Actions CI pipeline.
- **Docs (`docs/`)**: OpenAPI Specification in YAML (`docs/api-spec.yaml`) and JSON (`docs/api-spec.json`).

---

## 🚀 Quickstart Guide

### 1. Start the FastAPI Backend
```powershell
# From the project root:
$env:PYTHONPATH="apps/api"
.\apps\api\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```
- API Health: `http://localhost:8000/health`
- Interactive Swagger Docs: `http://localhost:8000/docs`
- Live WebSocket Stream: `ws://localhost:8000/ws`

### 2. Start the Next.js Web Dashboard
```bash
cd apps/web
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Run Test Suite
```powershell
$env:PYTHONPATH="apps/api"
.\apps\api\.venv\Scripts\pytest apps/api/tests/test_api.py -v
```

### 4. Run System Verification
```powershell
$env:PYTHONPATH="apps/api"
.\apps\api\.venv\Scripts\python scripts/verify_system.py
```

### 5. Run with Docker Compose (PostgreSQL+PostGIS & Redis)
```bash
docker-compose -f infra/docker-compose.yml up -d
```
