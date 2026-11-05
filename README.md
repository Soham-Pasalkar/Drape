# DRAPE — Web-First Global Fashion E-Commerce & Virtual Try-On

[![Milestone](https://img.shields.io/badge/Milestone-M1%20Scaffold%20%26%20Environment-blue)](docs/aidlc/PRD.md)
[![Architecture](https://img.shields.io/badge/Architecture-Modular%20Monolith%20%2B%20Hexagonal%20Ports-black)](docs/architecture/SYSTEM_ARCHITECTURE.md)
[![Python](https://img.shields.io/badge/Python-3.12%2B-blue)](backend/)
[![Next.js](https://img.shields.io/badge/Next.js-14%20App%20Router-black)](frontend/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#)

DRAPE is a web-first global luxury fashion platform integrating curated commerce with hybrid virtual try-on, an intelligent digital wardrobe, and a generative AI fashion stylist.

---

## The Four Product Pillars

1. **Fashion E-Commerce:** High-performance catalog discovery, relational inventory reservation, shopping cart, and multi-currency checkout.
2. **Hybrid Virtual Try-On:** Real-time 3D camera garment drape (client-side WebGL 2.0 / WASM pose tracking with zero video transmission) combined with asynchronous generative AI try-on previews.
3. **Smart Digital Wardrobe:** Personal clothing vault to catalog owned garments, assemble multi-layer outfits, and store consented try-on looks with multi-tenant row-level security.
4. **AI Fashion Stylist:** Personalized outfit recommendations, silhouette matching, and occasion-based curation operating under strict unit-economics guardrails.

> **Truthfulness & Visual Preview Posture:** All virtual try-on representations are explicitly classified as **bounded visual previews**, not physical tailoring, metric sizing, or fit guarantees.

---

## Architectural Foundation (Milestone 1)

DRAPE is engineered as a **modular monolith** with decoupled domain ports (hexagonal architecture):

* **Frontend:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide icons.
* **Backend:** FastAPI, Python 3.12+, Pydantic Settings, AsyncIO, structured JSON logging, RFC 9457 Problem Details error formatting.
* **Database & Migrations:** PostgreSQL 16+ (asyncpg driver), SQLAlchemy 2.0 Async, Alembic migrations.
* **Domain Ports:** Six provider-agnostic domain interfaces (`IdentityPort`, `ObjectStoragePort`, `InferenceJobPort`, `PaymentGatewayPort`, `TaxCalculationPort`, `CatalogSyncPort`) with mock adapters for isolated local development.

---

## Local Development Quickstart

### Prerequisites

* **Node.js:** v20.0.0 or higher (v25+ supported)
* **npm:** v10.0.0 or higher
* **Python:** 3.12 or higher (3.14 supported)
* **PostgreSQL (Optional for local dev):** PostgreSQL 16+ running on `localhost:5432`. If PostgreSQL is not running, the backend still boots cleanly: `/healthz` succeeds (liveness), and `/readyz` safely reports database standby.

---

### 1. Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create Python virtual environment
python3 -m venv .venv

# 3. Activate virtual environment
source .venv/bin/activate
# (On Windows: .venv\Scripts\activate)

# 4. Install backend dependencies
pip install -r requirements.txt

# 5. Copy environment variables template
cp .env.example .env

# 6. Run test suite (verifies config, healthz, readyz, RFC 9457 errors, and all 6 domain ports)
PYTHONPATH=. pytest tests

# 7. Start FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

### 2. Frontend Setup

In a new terminal window:

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install frontend dependencies
npm install

# 3. Copy environment variables template
cp .env.example .env.local

# 4. Run TypeScript and linter checks
npm run lint

# 5. Start Next.js development server
npm run dev
```

---

## Local URLs & Endpoints

| Component | URL | Description |
|---|---|---|
| **Frontend Web App** | [http://localhost:3000](http://localhost:3000) | Editorial homepage, navigation, 4 pillars presentation, live backend probe |
| **Backend API Base** | [http://localhost:8000](http://localhost:8000) | Root FastAPI ASGI application |
| **Liveness Probe** | [http://localhost:8000/healthz](http://localhost:8000/healthz) | Process health check (independent of backing databases) |
| **Readiness Probe** | [http://localhost:8000/readyz](http://localhost:8000/readyz) | Backing store connectivity probe (PostgreSQL) |
| **API Documentation (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive OpenAPI 3.1 UI |
| **API Documentation (ReDoc)** | [http://localhost:8000/redoc](http://localhost:8000/redoc) | Alternate structured documentation view |

---

## Hexagonal Domain Ports

DRAPE isolates core business domains behind hexagonal ports:

1. **`IdentityPort`** (`app/domain/ports/identity_port.py`): User authentication, JWT verification, and session revocation.
2. **`ObjectStoragePort`** (`app/domain/ports/object_storage_port.py`): Presigned PUT/GET URLs and multi-version asset purge.
3. **`InferenceJobPort`** (`app/domain/ports/inference_job_port.py`): Asynchronous AI try-on job dispatch, polling, best-effort cancellation, and deletion verification.
4. **`PaymentGatewayPort`** (`app/domain/ports/payment_gateway_port.py`): Payment sessions, capture, refund, timeout reconciliation, and HMAC webhook validation with duplicate & out-of-order event defense.
5. **`TaxCalculationPort`** (`app/domain/ports/tax_calculation_port.py`): Automated sales tax, VAT, and fiscal nexus calculation.
6. **`CatalogSyncPort`** (`app/domain/ports/catalog_sync_port.py`): Ingestion and synchronization of SKUs, stock deltas, and product media links.

Mock adapters for all six ports are available in `app/infrastructure/adapters/` for offline unit testing without external cloud credentials.

---

## Verification & Testing Commands

```bash
# Backend unit & contract tests
cd backend && ../backend/.venv/bin/pytest tests

# Alembic migration verification
cd backend && ../backend/.venv/bin/alembic heads

# Frontend linting
npm --prefix frontend run lint

# Frontend production build verification
npm --prefix frontend run build
```

---

## Repository Structure

```text
Drape/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── middleware/      # CORS, RFC 9457 exception handlers, logging
│   │   │   └── v1/
│   │   │       ├── endpoints/   # /healthz, /readyz
│   │   │       └── router.py
│   │   ├── core/                # Pydantic Settings, async SQLAlchemy engine, structured logging
│   │   ├── domain/
│   │   │   └── ports/           # Six hexagonal domain ports & DTOs
│   │   ├── infrastructure/
│   │   │   └── adapters/        # Mock/local domain adapters
│   │   └── main.py              # Application entrypoint & factory
│   ├── alembic/                 # Async database migration environment
│   ├── tests/                   # Pytest suite
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js 14 App Router layout & page
│   │   ├── components/          # Header, Hero, PillarsSection, BackendStatusBanner, Footer
│   │   └── lib/                 # Typed API integration client
│   ├── public/                  # Static assets
│   ├── package.json
│   ├── tailwind.config.ts
│   └── .env.example
│
├── docs/                        # Authoritative AIDLC governance, research & architecture
├── prototype.html               # Untracked pre-existing prototype (reference-only)
├── .gitignore
├── .env.example
└── README.md
```

