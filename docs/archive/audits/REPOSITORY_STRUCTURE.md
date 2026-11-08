# DRAPE Repository Structure & Architectural Boundaries

**Date:** November 2026  
**Status:** Canonical Reference (Milestone 0)  
**Branch:** `engineering-reset/ar-cleanup-audit`  

---

## 1. High-Level Repository Architecture

DRAPE is structured as a full-stack e-commerce and spatial computing platform, divided into three primary tiers:
1. **Frontend (`frontend/`):** Next.js 14 (App Router) luxury fashion storefront and client-side AR virtual try-on engine.
2. **Backend (`backend/`):** FastAPI asynchronous REST API following hexagonal / ports-and-adapters architecture for catalog, checkout, orders, payments, and customer wardrobes.
3. **Documentation & Assets (`docs/`, `Images/`):** Architectural specifications, engineering decisions, and fashion brand assets.

```
DRAPE/
├── frontend/                     # Next.js 14 Frontend & Client AR Engine
│   ├── public/                   # Static assets (3D GLB garments, icons, images)
│   ├── src/
│   │   ├── app/                  # Next.js App Router (Routes & Pages)
│   │   ├── components/           # UI Presentation Components (Domain-partitioned)
│   │   ├── hooks/                # Custom React Hooks (UI, State, Cart)
│   │   ├── lib/                  # Core Libraries & AR Engine
│   │   │   ├── api.ts            # REST API Client (Backend communication)
│   │   │   └── ar/               # DRAPE Spatial Atelier (AR Virtual Try-On)
│   │   └── types/                # Domain Data Types (E-commerce, User, Catalog)
│   ├── scripts/                  # AR Test Execution & Build Scripts
│   ├── tests/ar/                 # AR Subsystem Automated Verification Suites
│   ├── package.json              # Frontend Node Dependencies
│   └── tsconfig.json             # TypeScript Configuration
│
├── backend/                      # FastAPI Python Asynchronous Backend
│   ├── alembic/                  # Database Migrations (PostgreSQL)
│   ├── app/
│   │   ├── api/v1/               # HTTP Route Endpoints & Pydantic Schemas
│   │   ├── core/                 # Configuration, Security & DB Engine Setup
│   │   ├── domain/               # Core Business Entities & Port Interfaces
│   │   ├── infrastructure/       # SQLAlchemy Database Adapters & Repositories
│   │   └── models/               # SQLAlchemy ORM Model Definitions
│   ├── tests/                    # Pytest Asynchronous Backend Test Suite
│   ├── requirements.txt          # Python Production Dependencies
│   └── main.py                   # Backend Application Entrypoint
│
└── docs/                         # Canonical Architectural Documentation
    ├── CALIBRATION_AND_BODY_MODEL_RESEARCH.md
    ├── GARMENT_ASSET_PIPELINE.md
    ├── REVISED_AR_ARCHITECTURE.md
    ├── AR_TECHNOLOGY_EVALUATION.md
    ├── IMPLEMENTATION_ROADMAP.md
    ├── ARCHITECTURAL_DECISIONS_PENDING.md
    ├── CODEBASE_HYGIENE_AUDIT.md
    ├── REPOSITORY_STRUCTURE.md
    ├── DEPENDENCY_CLEANUP_REPORT.md
    └── REFACTORING_CHANGELOG.md
```

---

## 2. Frontend Structure & Domain Partitioning

### 2.1 Route Entrypoints (`frontend/src/app/`)

Routes follow Next.js 14 App Router conventions. Every route is dedicated to a distinct customer journey:

| Route Path | Description | Access Tier |
| :--- | :--- | :--- |
| `/` | Editorial Home & Hero Fashion Showcase | Public |
| `/collections` | Catalog Root & Trend Collections | Public |
| `/collections/[category]` | Filtered Category Catalog (e.g. outerwear, tops, skirts) | Public |
| `/products/[slug]` | Product Detail Page (PDP) with 3D Try-On CTA | Public |
| `/try-on` | DRAPE Spatial Atelier (Full-Screen AR Experience) | Public |
| `/cart` | Interactive Shopping Cart & Line Item Management | Public / Guest |
| `/checkout` | Multi-step Shipping, Tax & Payment Authorization | Public / Guest |
| `/checkout/success` | Order Confirmation & Receipt | Customer |
| `/checkout/failure` | Payment Recovery & Error Handling | Customer |
| `/login` | Customer Authentication Entrypoint | Guest |
| `/register` | New Customer Registration | Guest |
| `/account` | Customer Profile, Shipping Addresses & Security | Authenticated |
| `/orders` | Order History & Tracking Status | Authenticated |
| `/orders/[id]` | Granular Order Invoice & Fulfillment Tracking | Authenticated |
| `/wardrobe` | Digital Wardrobe & Saved Outfits | Authenticated |
| `/wardrobe/add` | Manual Garment Addition to Personal Wardrobe | Authenticated |
| `/wardrobe/outfits` | Curated Lookbook & Outfit Builder | Authenticated |
| `/wardrobe/outfits/[id]` | Look Detail & Outfit Virtual Try-On Launcher | Authenticated |

### 2.2 Presentation Components (`frontend/src/components/`)

Components are organized strictly by functional domain rather than a single flat directory:

- **`account/`**: Address cards, profile settings, login forms.
- **`cart/`**: Cart drawer, line item summary, subtotal calculation.
- **`checkout/`**: Address form, payment selection, order review.
- **`layout/`**: Luxury header, editorial navigation, footer, brand marquees.
- **`orders/`**: Order card list, order status badges, invoice breakdown.
- **`products/`**: Product card, image zoom, size selector, PDP layout.
- **`try-on/`**:
  - `VirtualTryOnExperience.tsx`: Orchestration container for AR tracking, canvas, and UI controls.
  - `CameraViewport.tsx`: Responsive video view layer with mirroring support.
  - `GarmentSelector.tsx`: Horizontal luxury carousel for switching garments during live try-on.
  - `TrackingStatusBanner.tsx`: Studio guidance on user distance, lighting, and body visibility.
  - `CalibrationModal.tsx`: ISO ID-1 reference card metric calibration modal.
  - `TryOnInfoModal.tsx`: Atelier technical specification and privacy dossier.
  - `DeveloperDiagnosticOverlay.tsx`: Real-time FPS, pose metrics, depth, and debug layers.
- **`ui/`**: Primitives (buttons, inputs, spinners, modal backdrops).
- **`wardrobe/`**: Wardrobe grid, outfit composer, category filters.

### 2.3 AR Subsystem Architecture (`frontend/src/lib/ar/`)

The AR engine is treated as an independent spatial computing subsystem. Following Milestone 0 cleanup, it exposes a single public barrel (`frontend/src/lib/ar/index.ts`) across 8 decoupled architectural layers:

```
frontend/src/lib/ar/
├── index.ts                     # Public AR API Barrel
├── types.ts                     # AR Domain Types (Intrinsics, Poses, Diagnostics)
│
├── camera.ts                    # Video Stream Acquisition & Mirror Resolution
├── camera-calibration.ts        # Pinhole Intrinsics (Prior & ISO Card Calibration)
│
├── pose-tracker.ts              # MediaPipe Pose Landmarker Wrapper
├── landmark-smoother.ts         # Multi-joint 1€ Filter Pipeline
├── one-euro-filter.ts           # Casiez et al. 2012 Low-Pass Filter Implementation
│
├── coordinates.ts               # Video-to-Display, NDC, Image, and Camera Math
├── distance-estimator.ts        # Temporal Shoulder Span Depth Estimator
├── operating-modes.ts           # Framing Guidance & Mode Detection (Bust vs Full)
│
├── mhr-body-proxy.ts            # Parametric Elliptical Torso & Capsule Proxy
├── personalized-body-shape.ts   # Anthropometric Proportion Extraction
├── robust-pnp.ts                # Orthogonal Procrustes Torso PnP Solver
│
├── garment-registry.ts          # Catalog of 8 Procedural GLB Assets
├── garment-instance.ts          # 3D Garment Scene Node, Deformer & Rig Manager
├── garment-rig.ts               # Rigid Sleeve Articulation & Semantic Anchors
├── garment-ease.ts              # Torso Clearance & Garment Fit Calculation
├── garment-correspondence.ts    # Torso Surface Closest-Point Correspondence
├── fabric-materials.ts          # Three.js MeshStandardMaterial Custom Shaders
│
├── xpbd-cloth-solver.ts         # CPU XPBD Secondary Cloth Physics Engine
├── three-scene.ts               # Three.js Scene, Camera, Lighting & Compositor
├── fitting-engine.ts            # High-Level Pose-to-Garment Orchestration Engine
│
├── debug/                       # Verification Tools & Stage Probes
│   ├── debug-report.ts          # Telemetry JSON Export
│   ├── frame-diag.ts            # Per-frame Timing & Metric Accumulator
│   ├── registration.ts          # 9-point Screen Registration Validator
│   └── stage1-probe.ts          # Material & Depth Debug Overrides
├── pipeline/
│   └── frame-step.ts            # Discrete Frame Step Pipeline Contract
└── session/
    ├── recorder.ts              # Session JSON Capture Engine
    ├── schema.ts                # Session Schema Definitions
    └── snapshot.ts              # Frame Snapshot State Serializer
```

---

## 3. Backend Structure & Hexagonal Boundaries

The backend strictly separates domain logic from infrastructure adapters:

```
backend/
├── app/
│   ├── api/v1/                  # Primary Adapters (HTTP Driving Layer)
│   │   ├── endpoints/           # FastAPI Route Handlers (auth, cart, checkout, products, etc.)
│   │   └── schemas/             # Pydantic v2 Request/Response Data Transfer Objects
│   │
│   ├── domain/                  # Hexagonal Domain Core (Business Logic)
│   │   ├── models/              # Pure Domain Entities
│   │   ├── ports/               # Driven Ports (Abstract Repository Interfaces)
│   │   │   ├── catalog_sync_port.py
│   │   │   ├── identity_port.py
│   │   │   └── tax_calculation_port.py
│   │   └── services/            # Domain Services (Pricing, Fit Recommendation)
│   │
│   ├── infrastructure/          # Secondary Adapters (Driven Infrastructure)
│   │   ├── adapters/            # Concrete Database & External Service Implementations
│   │   └── repositories/        # SQLAlchemy Async Database Repositories
│   │
│   ├── models/                  # SQLAlchemy ORM Database Mappings
│   └── core/                    # Cross-cutting Concerns (Settings, Security, DB Engine)
│
├── alembic/                     # Database Schema Migrations
├── tests/                       # Pytest Asynchronous Verification Suite
└── main.py                      # Application Factory & ASGI Server Entrypoint
```

---

## 4. Test Suite Boundaries

| Test Location | Framework | Focus Area |
| :--- | :--- | :--- |
| `frontend/tests/ar/` | Node.js CommonJS runner | AR math, calibration, PnP, correspondence, ease, deformation, XPBD |
| `backend/tests/` | Pytest + pytest-asyncio | Authentication, cart atomicity, inventory locking, checkout, orders |

All test scripts execute independently of external networks, using deterministic synthetic feeds, recorded session replays, and in-memory test databases.

