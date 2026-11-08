# DRAPE — Developer Onboarding & Local Environment Guide

Welcome to the DRAPE development environment. DRAPE is a modular full-stack fashion e-commerce and augmented reality platform consisting of a Next.js frontend, FastAPI backend, PostgreSQL database, and WebGL/XPBD 3D garment fitting engine.

---

## 1. Prerequisites

- **Node.js:** v18.17+ or v20+ (Node v20.x recommended)
- **Python:** v3.12+ (Python 3.12 or 3.14 verified)
- **PostgreSQL:** v15+ (Local or Docker container)
- **Package Managers:** `npm` (frontend), `pip` / virtualenv (backend)

---

## 2. Repository Structure

```text
Drape/
├── backend/            # FastAPI Python backend (modular monolith, ports & adapters)
│   ├── app/            # Application domain, models, schemas, and API endpoints
│   ├── alembic/        # Database migration versions (0001 through 0007)
│   ├── scripts/        # Database seeding utilities (demo products and wardrobe)
│   └── tests/          # Pytest test suite (109 tests)
├── frontend/           # Next.js 14 App Router (React 18, Tailwind CSS, Three.js)
│   ├── src/            # App routes, components, and AR fitting engine
│   ├── public/         # Static assets, product photography, and 3D GLB garments
│   └── scripts/        # Commerce, AR regression, and garment asset validation runners
└── docs/               # System architecture, feature specs, reports, and historical archive
```

---

## 3. Backend Setup

### A. Environment Configuration

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy the template environment configuration:
   ```bash
   cp .env.example .env
   ```
3. Generate secure local development secrets:
   ```bash
   openssl rand -hex 32
   ```
4. Configure `.env` with:
   - `DATABASE_URL`: `postgresql+asyncpg://drape_app:your_password@localhost:5432/drape_db`
   - `JWT_SECRET_KEY`: `<generated_secret>`
   - `ADMIN_API_KEY`: `<generated_admin_key>`

### B. Python Virtual Environment

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### C. Database Migrations

Apply the complete Alembic migration sequence:

```bash
cd backend
.venv/bin/alembic upgrade head
```

Verify migration status:
```bash
.venv/bin/alembic current
# Expected: 0007_wear_logs_and_planner (head)
```

### D. Starting Backend Server

```bash
cd backend
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Interactive API documentation will be available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## 4. Frontend Setup

### A. Environment Configuration

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Copy the template environment configuration:
   ```bash
   cp .env.example .env.local
   ```
   Default settings point to `NEXT_PUBLIC_API_URL=http://localhost:8000`.

### B. Dependencies & Build

```bash
cd frontend
npm install
npm run build
```

### C. Development Server

```bash
cd frontend
npm run dev -- -p 3000
```

The web application will be accessible at:
- Web App: `http://localhost:3000`
- Smart Wardrobe: `http://localhost:3000/wardrobe`
- DRAPE Studio: `http://localhost:3000/wardrobe/studio`
- 3D Try-On: `http://localhost:3000/try-on`

---

## 5. Development Utilities: Demo Wardrobe Seeding

To populate a local development user account with the 18 catalog garments (for testing the luxury walnut armoire, daily stylist recommendations, wear diary, and outfit planner):

```bash
cd backend
.venv/bin/python scripts/seed_demo_wardrobe.py --email customer@example.com --yes
```

**Safety Guarantees:**
- Strictly restricted to local development environments (`ENVIRONMENT=development`).
- Idempotent: Skips garments already present in the target account.
- Purely classified as `source="manual"` with zero fake purchases, orders, or payments.
