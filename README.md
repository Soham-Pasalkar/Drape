 <div align="center">

# DRAPE

**A Fashion E-Commerce Platform with 3D Virtual Try-On and an Intelligent Digital Wardrobe**

A full-stack fashion platform combining online shopping, real-time 3D garment visualization, personalized wardrobe management, and outfit recommendations.

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

[![Backend Tests](https://img.shields.io/badge/Backend-109_tests_passed-success)](#testing)
[![AR Tests](https://img.shields.io/badge/AR-282_tests_passed-success)](#testing)
[![Commerce Tests](https://img.shields.io/badge/Commerce-21_tests_passed-success)](#testing)

[**Repository**](https://github.com/Soham-Pasalkar/Drape) · [**Documentation**](docs/) · [**System Architecture**](docs/architecture/SYSTEM_ARCHITECTURE.md)

</div>

---

## Overview

DRAPE is a web-first fashion e-commerce application designed to make online clothing discovery and personal styling more interactive.

Traditional fashion e-commerce platforms primarily rely on static product images. DRAPE extends that experience by integrating browser-based 3D virtual try-on, a personal digital wardrobe, and an outfit recommendation engine into a single application.

Customers can browse clothing, manage their wardrobe, visualize supported garments in a 3D environment, receive outfit recommendations, and maintain a history of outfits they have worn.

The platform is built using **Next.js, TypeScript, FastAPI, and PostgreSQL**, with a modular backend architecture and a browser-based 3D rendering pipeline.

## Features

### E-Commerce

- Curated catalog containing 18 clothing styles.
- Product categories, variants, and color-aware product photography.
- Product discovery, filtering, and sorting.
- Shopping cart and checkout workflows.
- Customer registration, authentication, and account management.
- Inventory-aware order processing.
- Order history and payment integration interfaces.
- Integer-based monetary calculations for pricing accuracy.

### 3D Virtual Try-On

- Live camera input and body pose tracking.
- MediaPipe-based landmark detection.
- Camera calibration and metric depth estimation.
- 3D garment positioning and deformation.
- XPBD-based cloth simulation.
- Body-aware depth and occlusion handling.
- GLB/glTF garment asset loading and validation.
- Interactive browser-based rendering using Three.js.

The virtual try-on system provides a visual representation of supported garments. It is not a substitute for physical fitting, precise body measurements, or guaranteed clothing-size accuracy.

### Smart Digital Wardrobe

- Personal digital collection of clothing.
- Interactive, furniture-inspired walnut armoire.
- Garment inspection and product information.
- Manual wardrobe item management.
- Integration with eligible purchased products.
- Outfit creation and organization.
- Garment-level wear statistics.

### DRAPE Studio

A personal styling engine that uses wardrobe information and wear history to generate outfit recommendations.

- Daily outfit recommendations.
- Category compatibility and color harmony scoring.
- Occasion-based recommendations.
- Personal style preferences and feedback.
- Wear diary with historical outfit records.
- Garment rotation analytics.
- Recently worn outfit suppression.
- Future outfit planning.
- Wardrobe gap analysis and catalog suggestions.

Recommendations are generated through a deterministic, explainable scoring model rather than relying on an external generative AI service.

---

## Application Preview

<div align="center">

| Application | Description |
|---|---|
| **Collections** | Browse and discover clothing products. |
| **Virtual Try-On** | Visualize supported garments using the 3D fitting experience. |
| **Digital Wardrobe** | Manage personal clothing in an interactive virtual armoire. |
| **DRAPE Studio** | Discover personalized outfit combinations. |
| **Wear Diary** | Review outfit history and garment usage. |
| **Outfit Planner** | Schedule and manage future outfits. |

</div>

*Screenshots and demonstration recordings can be added here as the project presentation assets are prepared.*

---

## Technology Stack

| Category | Technology |
|---|---|
| Frontend Framework | Next.js 14 |
| UI Library | React 18 |
| Programming Language | TypeScript |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Backend Framework | FastAPI |
| Backend Language | Python 3.12+ |
| Data Validation | Pydantic |
| Database | PostgreSQL |
| ORM | SQLAlchemy 2.0 Async |
| Migrations | Alembic |
| Computer Vision | MediaPipe Tasks Vision |
| 3D Rendering | Three.js / WebGL |
| 3D Asset Format | GLB / glTF |
| Cloth Simulation | XPBD |
| Testing | Pytest, Node.js test runners |

---

## Architecture

DRAPE uses a **modular monolith architecture** with Hexagonal Architecture principles on the backend.

The frontend and backend are separate applications communicating through a versioned REST API. Business domains are organized into modules, while external infrastructure integrations are isolated behind domain ports.

```mermaid
flowchart TB
    Client["Customer Browser"]

    subgraph Frontend["Frontend · Next.js / React"]
        Store["E-Commerce"]
        TryOn["3D Virtual Try-On"]
        Wardrobe["Digital Wardrobe"]
        Studio["DRAPE Studio"]
        Account["Customer Account"]
    end

    subgraph Backend["Backend · FastAPI"]
        Identity["Identity & Authentication"]
        Catalog["Catalog & Inventory"]
        Commerce["Cart, Orders & Payments"]
        Fitting["Virtual Try-On Services"]
        Closet["Wardrobe Services"]
        Stylist["Stylist & Recommendation Engine"]
    end

    subgraph Persistence["Persistence Layer"]
        Database[("PostgreSQL")]
    end

    subgraph Ports["Domain Integration Ports"]
        P1["IdentityPort"]
        P2["ObjectStoragePort"]
        P3["InferenceJobPort"]
        P4["PaymentGatewayPort"]
        P5["TaxCalculationPort"]
        P6["CatalogSyncPort"]
    end

    Client --> Frontend
    Frontend <-->|"REST API · JSON · Cookies"| Backend

    Store --> Catalog
    Store --> Commerce
    TryOn --> Fitting
    Wardrobe --> Closet
    Studio --> Stylist
    Account --> Identity

    Backend --> Database
    Identity --> P1
    Fitting --> P2
    Fitting --> P3
    Commerce --> P4
    Commerce --> P5
    Catalog --> P6
```

### Backend architecture

The backend separates application logic from infrastructure dependencies through six domain interfaces:

| Domain Port | Responsibility |
|---|---|
| `IdentityPort` | Authentication, identity verification, and session management |
| `ObjectStoragePort` | File storage and asset access |
| `InferenceJobPort` | Asynchronous AI inference job execution |
| `PaymentGatewayPort` | Payment sessions, capture, refunds, and webhook validation |
| `TaxCalculationPort` | Tax calculation and fiscal rules |
| `CatalogSyncPort` | Product and inventory synchronization |

This separation makes it possible to change infrastructure providers without coupling core business logic to a particular implementation.

### Virtual try-on pipeline

The 3D fitting pipeline processes camera input and garment geometry through a sequence of computer vision and simulation stages.

```mermaid
flowchart TD
    A["Camera Input"] --> B["Pose Landmark Detection"]
    B --> C["Camera Calibration"]
    C --> D["Depth Estimation"]
    D --> E["Body Proxy & Anchor Mapping"]
    E --> F["Garment Positioning"]
    F --> G["Garment Deformation"]
    G --> H["XPBD Cloth Simulation"]
    H --> I["Depth & Occlusion"]
    I --> J["Three.js Rendering"]
    J --> K["Virtual Try-On Preview"]
```

---

## Project Structure

```text
Drape/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── middleware/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       └── router.py
│   │   │
│   │   ├── core/
│   │   ├── domain/
│   │   │   └── ports/
│   │   ├── infrastructure/
│   │   │   └── adapters/
│   │   └── main.py
│   │
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── public/
│   │   └── images/
│   │       └── products/
│   │
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   └── lib/
│   │
│   ├── scripts/
│   ├── package.json
│   └── .env.example
│
├── docs/
│   ├── architecture/
│   │   └── adr/
│   ├── research/
│   ├── aidlc/
│   ├── DRAPE_STUDIO_DOCUMENTATION.md
│   ├── FINAL_PROJECT_COMPLETION_REPORT.md
│   └── FINAL_REPOSITORY_RELEASE_REPORT.md
│
├── .env.example
├── .gitignore
└── README.md
```

---

## Getting Started

Follow these steps to run DRAPE locally.

### Prerequisites

Make sure the following software is installed:

| Dependency | Version |
|---|---|
| Node.js | 20 or later |
| npm | 10 or later |
| Python | 3.12 or later |
| PostgreSQL | 16 or later |

### 1. Clone the repository

```bash
git clone https://github.com/Soham-Pasalkar/Drape.git

cd Drape
```

### 2. Configure PostgreSQL

Create a PostgreSQL database and a database user with appropriate permissions.

For example:

```sql
CREATE USER drape_app WITH PASSWORD 'your_password';

CREATE DATABASE drape_db OWNER drape_app;
```

Use the database credentials in the backend environment configuration.

### 3. Set up the backend

```bash
cd backend

python3 -m venv .venv
```

Activate the virtual environment.

**macOS / Linux**

```bash
source .venv/bin/activate
```

**Windows**

```powershell
.venv\Scripts\activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Create the backend environment file:

```bash
cp .env.example .env
```

Update `DATABASE_URL` and the authentication secrets in `.env`.

Example database configuration:

```env
DATABASE_URL=postgresql+asyncpg://drape_app:your_password@localhost:5432/drape_db
```

**Important:** The supplied environment templates contain development placeholders. Replace them with your own values. Never use development secrets in a public or production deployment.

Run database migrations:

```bash
alembic upgrade head
```

Start the backend:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at:

- API: http://localhost:8000
- Swagger documentation: http://localhost:8000/docs
- Liveness endpoint: http://localhost:8000/healthz
- Readiness endpoint: http://localhost:8000/readyz

### 4. Set up the frontend

Open a separate terminal from the repository root:

```bash
cd frontend

npm install
```

Create the frontend environment file:

```bash
cp .env.example .env.local
```

Configure the API URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=DRAPE
```

Start the frontend:

```bash
npm run dev
```

The frontend will be available at:

**http://localhost:3000**

### 5. Application routes

| Route | Description |
|---|---|
| `/` | Main storefront |
| `/collections` | Product collections |
| `/try-on` | 3D virtual try-on |
| `/wardrobe` | Digital wardrobe |
| `/wardrobe/studio` | Personal stylist |
| `/wardrobe/history` | Wear diary |
| `/wardrobe/planner` | Outfit planner |
| `/account` | Customer account |

Some features require a configured database, authenticated customer session, compatible 3D garment assets, or browser camera permissions.

---

## API

The backend exposes a versioned REST API under:

```text
/api/v1
```

The main API domains include:

| Domain | Responsibility |
|---|---|
| Authentication | Registration, login, sessions, and customer identity |
| Catalog | Products, variants, and inventory |
| Cart | Cart items and cart management |
| Checkout | Order creation and checkout |
| Payments | Payment verification and payment lifecycle |
| Wardrobe | Clothing items and outfit management |
| Stylist | Outfit recommendations and style preferences |
| Wear Diary | Wear logs and garment rotation |
| Outfit Planner | Scheduled outfits and wear conversion |

The interactive OpenAPI documentation is available at:

```text
http://localhost:8000/docs
```

### Selected DRAPE Studio endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/wardrobe/stylist/daily` | Retrieve daily recommendations |
| GET | `/api/v1/wardrobe/wear-logs` | Retrieve wear history |
| POST | `/api/v1/wardrobe/wear-logs` | Record a worn outfit |
| GET | `/api/v1/wardrobe/rotation` | Retrieve garment rotation analytics |
| GET | `/api/v1/wardrobe/planner` | Retrieve outfit plans |
| POST | `/api/v1/wardrobe/planner` | Create an outfit plan |
| PATCH | `/api/v1/wardrobe/planner/{id}` | Update an outfit plan |
| POST | `/api/v1/wardrobe/planner/{id}/mark-worn` | Convert a planned outfit into a wear record |
| GET | `/api/v1/wardrobe/style-profile` | Retrieve the customer style profile |

Refer to Swagger UI for request schemas, authentication requirements, and response definitions.

---

## DRAPE Studio Recommendation Model

DRAPE Studio uses a weighted scoring model to evaluate outfit combinations.

\[
S = 0.25C + 0.20H + 0.20O + 0.15P + 0.15R + 0.05N
\]

Where:

| Variable | Meaning | Weight |
|---|---|---:|
| \(C\) | Category compatibility | 25% |
| \(H\) | Color harmony | 20% |
| \(O\) | Occasion suitability | 20% |
| \(P\) | Personal preference | 15% |
| \(R\) | Wardrobe rotation health | 15% |
| \(N\) | Novelty and feedback | 5% |

The engine also supports three rotation strategies:

- **Balanced:** Balances outfit compatibility with garment usage.
- **Avoid Recent:** Penalizes recently worn combinations.
- **Maximum Variety:** Prioritizes diversity across recommendations.

The recommendation engine is designed to be explainable and grounded in the customer's actual wardrobe data.

---

## Testing

The project includes automated test suites for the backend, commerce functionality, and 3D virtual try-on system.

### Backend tests

```bash
cd backend

.venv/bin/pytest tests
```

### Commerce tests

```bash
npm --prefix frontend run test:commerce
```

### Virtual try-on tests

```bash
npm --prefix frontend run test:ar
```

### 3D garment asset validation

```bash
npm --prefix frontend run validate:garments
```

### Frontend linting

```bash
npm --prefix frontend run lint
```

### Production build

```bash
npm --prefix frontend run build
```

### Final release verification

The final repository release report records these results:

| Test Suite | Result |
|---|---:|
| Backend | 109 passed |
| Commerce | 21 passed |
| AR virtual try-on | 282 passed |
| GLB asset validation | 8 validated |
| Frontend lint | 0 errors, 0 warnings |
| Production build | 23 routes compiled |
| Database migrations | Up to `0007_wear_logs_and_planner` |

---

## Security and Privacy

Security and privacy are considered throughout the application's architecture.

Implemented engineering measures include:

- Password hashing and persistent authentication.
- HTTP-only cookie-based session handling.
- Session lifecycle and revocation checks.
- User-scoped authorization for personal resources.
- Environment-based configuration for secrets.
- Exclusion of environment files from version control.
- Browser-local processing as the preferred approach for live camera-based tracking.
- Explicit consent boundaries for remote customer-media processing.
- Historical snapshots for persistent wear records.

### Camera and virtual try-on data

The live camera-based experience is designed around browser-side processing. Camera access requires explicit browser permission.

Virtual try-on output is a visual preview, not a guarantee of physical garment fit or sizing accuracy.

---

## Documentation

Additional engineering documentation is available in the [`docs/`](docs/) directory.

| Document | Description |
|---|---|
| [System Architecture](docs/architecture/SYSTEM_ARCHITECTURE.md) | System architecture and technical design |
| [DRAPE Studio Documentation](docs/DRAPE_STUDIO_DOCUMENTATION.md) | Stylist engine, wear tracking, and outfit planning |
| [Final Project Completion Report](docs/FINAL_PROJECT_COMPLETION_REPORT.md) | Project implementation and verification summary |
| [Final Repository Release Report](docs/FINAL_REPOSITORY_RELEASE_REPORT.md) | Repository release and publication details |
| [Architecture Decision Records](docs/architecture/adr/) | Architecture decisions and rationale |
| [Research](docs/research/) | Technical research and evaluations |
| [AIDLC](docs/aidlc/) | Requirements, planning, and engineering documentation |

---

## Limitations

- Virtual try-on is currently available only for products mapped to compatible 3D garment assets.
- The visual simulation does not guarantee real-world clothing fit or exact sizing.
- The application requires a configured backend and database for persistent customer functionality.
- Browser camera permissions and compatible hardware are required for live camera-based try-on.
- Production cloud hosting and infrastructure provisioning are separate from the published source-code release.

---

## Contributing

Contributions, bug reports, and technical suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run the relevant test suites.
5. Submit a pull request with a clear description of the changes.

For significant architectural changes, review the existing architecture documentation and decision records before implementation.

---

## License

The repository currently does not include a standalone `LICENSE` file. All rights are reserved by the project owner unless a separate license is explicitly provided.

Do not assume that the source code is open-source or available for redistribution.

---

<div align="center">

**DRAPE**

*Fashion meets technology.*

[GitHub Repository](https://github.com/Soham-Pasalkar/Drape)

</div>