<div align="center">

<br/>
<br/>

<h1 align="center">D&emsp;&emsp;R&emsp;&emsp;A&emsp;&emsp;P&emsp;&emsp;E</h1>

<p align="center">&mdash;&mdash;</p>

<p align="center"><sub>T H E &ensp; A R T &ensp; O F &ensp; P E R S O N A L &ensp; S T Y L E</sub></p>

<br/>

<br/>

**A web-first fashion house in code: curated commerce, an on-device 3D try-on, and a wardrobe that understands how you dress.**

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-14-1B1A18?style=flat-square&logo=next.js&logoColor=1B1A18&labelColor=F5F1EA&color=1B1A18)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-1B1A18?style=flat-square&logo=typescript&logoColor=1B1A18&labelColor=F5F1EA&color=1B1A18)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.12-1B1A18?style=flat-square&logo=fastapi&logoColor=1B1A18&labelColor=F5F1EA&color=1B1A18)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-1B1A18?style=flat-square&logo=postgresql&logoColor=1B1A18&labelColor=F5F1EA&color=1B1A18)](https://www.postgresql.org/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-1B1A18?style=flat-square&logo=three.js&logoColor=1B1A18&labelColor=F5F1EA&color=1B1A18)](https://threejs.org/)

<br/>

[**Explore the Atelier**](#the-atelier) &nbsp;·&nbsp; [**Architecture**](#architecture) &nbsp;·&nbsp; [**Get Started**](#get-started) &nbsp;·&nbsp; [**Documentation**](#documentation) &nbsp;·&nbsp; [**Source**](https://github.com/Soham-Pasalkar/Drape)

<p align="center">&middot;&ensp;&middot;&ensp;&middot;</p>

</div>

<br/>

## The Idea

Online fashion is still sold with flat photographs, while clothing is something you *wear*, *combine* and *live in*. Three things are missing from most storefronts:

| The gap | DRAPE's answer |
|---|---|
| You cannot picture a garment on yourself. | A browser-based **3D try-on** that renders real garment geometry, not a pasted photo. |
| What you own and what you buy never meet. | A **digital wardrobe** that links purchases to a virtual armoire. |
| "What should I wear today?" has no good tool. | **DRAPE Studio**, a deterministic, explainable outfit engine, not a black box. |

DRAPE joins these into one coherent product: *discover, try, own, style, repeat.*

> **Privacy by design.** Live camera tracking runs **in your browser**. Frames are not uploaded. Camera access always requires explicit browser permission.

<br/>

<p align="center">&middot;&ensp;&middot;&ensp;&middot;</p>

## At a Glance

| | |
|:---:|:---|
| **18** | curated clothing styles with colour-aware photography |
| **8** | validated GLB garments: tees, long-sleeve, sleeveless, skirts, dress |
| **6** | scoring dimensions behind every outfit recommendation |
| **6** | backend ports isolating payments, tax, storage, identity, inference and catalog sync |
| **109 / 21 / 282** | recorded release results: backend / commerce / AR tests |

*Test counts are recorded release results (see [Testing](#testing)), not a guarantee for every environment.*

<br/>

## The Atelier

### Storefront
- Curated catalogue with categories, variants and colour-aware photography
- Discovery, filtering and sorting
- Cart and checkout, inventory-aware order processing, order history and payments
- Registration, authentication and account management
- Integer-based money arithmetic, so prices never drift

### 3D Virtual Try-On <sub>PREVIEW</sub>
- Live camera input and pose tracking (MediaPipe Tasks Vision)
- Camera calibration, depth estimation and a body proxy for anchoring
- GLB/glTF garments rendered with Three.js, with fabric-aware materials
- XPBD cloth simulation, depth and occlusion handling

> **Honest status.** The try-on is the most ambitious module and is under active development. Tracking and rendering run on-device, but registering the garment to a moving body in live camera conditions is still being refined. It is a **visual preview**, not a guarantee of fit or sizing.

### Digital Wardrobe
- An interactive walnut armoire for your clothing
- Garment inspection, product details and manual item management
- Automatic integration with eligible purchased products
- Outfit creation and garment-level wear statistics

### DRAPE Studio
A personal stylist that reasons from your wardrobe and wear history:

- Daily recommendations, occasion-based looks and future outfit planning
- Category compatibility and colour-harmony scoring
- A wear diary with garment-rotation analytics and recently-worn suppression
- Wardrobe gap analysis with catalogue suggestions

Recommendations come from a **deterministic, explainable model**, not an external generative service:

$$
S = 0.25\,C + 0.20\,H + 0.20\,O + 0.15\,P + 0.15\,R + 0.05\,N
$$

| Term | Meaning | Weight |
|:---:|---|---:|
| $C$ | Category compatibility | 25% |
| $H$ | Colour harmony | 20% |
| $O$ | Occasion suitability | 20% |
| $P$ | Personal preference | 15% |
| $R$ | Wardrobe rotation health | 15% |
| $N$ | Novelty and feedback | 5% |

Rotation strategies: `balanced`, `avoid_recent`, `max_variety`. Historical wear records keep garment **snapshots**, so your diary stays meaningful even if an item is later edited or deleted.

<br/>

<p align="center">&middot;&ensp;&middot;&ensp;&middot;</p>

## Architecture

A **modular monolith** with hexagonal principles on the backend. Frontend and backend are separate applications talking over a versioned REST API; external services sit behind domain ports.

```mermaid
flowchart TB
    Client["Customer Browser"]

    subgraph Frontend["Frontend · Next.js / React"]
        Store["Storefront"]
        TryOn["3D Try-On"]
        Wardrobe["Digital Wardrobe"]
        Studio["DRAPE Studio"]
        Account["Account"]
    end

    subgraph Backend["Backend · FastAPI"]
        Identity["Identity & Auth"]
        Catalog["Catalog & Inventory"]
        Commerce["Cart, Orders & Payments"]
        Closet["Wardrobe Services"]
        Stylist["Stylist Engine"]
    end

    DB[("PostgreSQL")]

    Client --> Frontend
    Frontend <-->|"REST · JSON · HTTP-only cookies"| Backend
    Backend --> DB
```

**Domain ports** keep business logic independent of providers:

| Port | Responsibility |
|---|---|
| `IdentityPort` | Authentication, identity verification, sessions |
| `ObjectStoragePort` | File storage and asset access |
| `InferenceJobPort` | Asynchronous AI inference jobs |
| `PaymentGatewayPort` | Payment sessions, capture, refunds, webhooks |
| `TaxCalculationPort` | Tax and fiscal rules |
| `CatalogSyncPort` | Product and inventory synchronisation |

### The try-on pipeline

```mermaid
flowchart LR
    A["Camera"] --> B["Pose landmarks"] --> C["Calibration"] --> D["Depth"] --> E["Body proxy"]
    E --> F["Garment placement"] --> G["Deformation"] --> H["XPBD cloth"] --> I["Occlusion"] --> J["Three.js render"]
```

<br/>

## Technology

| Layer | Stack |
|---|---|
| **Frontend** | Next.js 14 · React 18 · TypeScript · Tailwind CSS · Lucide |
| **Backend** | FastAPI · Python 3.12+ · Pydantic · SQLAlchemy 2.0 (async) · Alembic |
| **Data** | PostgreSQL |
| **Vision & 3D** | MediaPipe Tasks Vision · Three.js / WebGL · GLB (glTF 2.0) · XPBD |
| **Quality** | Pytest · Node test runners · ESLint |

<br/>

## Get Started

**Prerequisites:** Node.js 20+, npm 10+, Python 3.12+, PostgreSQL 16+.

```bash
git clone https://github.com/Soham-Pasalkar/Drape.git
cd Drape
```

<details>
<summary><b>1 · Database</b></summary>

```sql
CREATE USER drape_app WITH PASSWORD 'your_password';
CREATE DATABASE drape_db OWNER drape_app;
```
</details>

<details>
<summary><b>2 · Backend</b></summary>

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # set DATABASE_URL and secrets
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

```env
DATABASE_URL=postgresql+asyncpg://drape_app:your_password@localhost:5432/drape_db
```

| Service | URL |
|---|---|
| API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| Liveness / Readiness | `/healthz` · `/readyz` |

Development secrets in the templates are placeholders. Replace them, and never ship them to production.
</details>

<details>
<summary><b>3 · Frontend</b></summary>

```bash
cd frontend
npm install
cp .env.example .env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=DRAPE
```

```bash
npm run dev      # http://localhost:3000
```
</details>

| Route | Description |
|---|---|
| `/` | Storefront |
| `/collections` | Product collections |
| `/try-on` | 3D virtual try-on |
| `/wardrobe` · `/wardrobe/studio` | Armoire · Personal stylist |
| `/wardrobe/history` · `/wardrobe/planner` | Wear diary · Outfit planner |
| `/account` | Customer account |

Some features need a configured database, an authenticated session, a compatible 3D garment, or camera permission.

<br/>

## API

Versioned under `/api/v1`, with interactive docs at `http://localhost:8000/docs`.

| Domain | Responsibility |
|---|---|
| Authentication | Registration, login, sessions, identity |
| Catalog · Cart · Checkout · Payments | Commerce lifecycle |
| Wardrobe · Stylist · Wear Diary · Planner | Personal styling |

<details>
<summary><b>Selected DRAPE Studio endpoints</b></summary>

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/wardrobe/stylist/daily` | Daily recommendations |
| GET · POST | `/api/v1/wardrobe/wear-logs` | Wear history · record a worn outfit |
| GET | `/api/v1/wardrobe/rotation` | Garment rotation analytics |
| GET · POST | `/api/v1/wardrobe/planner` | Outfit plans |
| PATCH | `/api/v1/wardrobe/planner/{id}` | Update a plan |
| POST | `/api/v1/wardrobe/planner/{id}/mark-worn` | Convert a plan into a wear record |
| GET | `/api/v1/wardrobe/style-profile` | Customer style profile |
</details>

<br/>

## Testing

```bash
.venv/bin/pytest tests                 # backend   (from /backend)
npm --prefix frontend run test:commerce
npm --prefix frontend run test:ar
npm --prefix frontend run validate:garments
npm --prefix frontend run lint
npm --prefix frontend run build
```

| Suite | Recorded result |
|---|---:|
| Backend | 109 passed |
| Commerce | 21 passed |
| AR try-on | 282 passed |
| GLB asset validation | 8 validated |
| Lint | 0 errors, 0 warnings |
| Production build | 23 routes |
| Migrations | up to `0007_wear_logs_and_planner` |

> The AR suite checks the maths and the pipeline on synthetic input. Live-camera behaviour in real browsers is validated separately and is the active area of work.

<br/>

## Security & Privacy

- Password hashing; HTTP-only cookie sessions with lifecycle and revocation checks
- User-scoped authorisation on personal resources
- Secrets via environment configuration, kept out of version control
- **Camera processing in the browser**, with explicit consent boundaries for any remote media processing
- Immutable wear-log snapshots for historical integrity

<br/>

## Limitations

- Try-on is available only for products mapped to a compatible 3D garment (8 today).
- The try-on is a visual preview. It does not guarantee real-world fit or sizing.
- Live-camera garment registration is under active development.
- Persistent customer features need a configured backend and database.
- Production hosting and infrastructure are outside this source release.

<br/>

## Documentation

| | |
|---|---|
| [System Architecture](docs/architecture/SYSTEM_ARCHITECTURE.md) | Technical design |
| [DRAPE Studio](docs/DRAPE_STUDIO_DOCUMENTATION.md) | Stylist engine, wear tracking, planning |
| [Architecture Decisions](docs/architecture/adr/) | ADRs and rationale |
| [Research](docs/research/) | Technical research and evaluations |
| [AI-DLC](docs/aidlc/) | Requirements, planning, engineering records |
| [Project Completion Report](docs/FINAL_PROJECT_COMPLETION_REPORT.md) · [Release Report](docs/FINAL_REPOSITORY_RELEASE_REPORT.md) | Verification and release |

<br/>

## Contributing

Issues, bug reports and technical suggestions are welcome. Fork the repository, create a feature branch, run the relevant test suites, and open a pull request with a clear description. For architectural changes, read the ADRs first.

## License

No standalone `LICENSE` file is included. All rights are reserved by the project owner unless a license is explicitly provided. Do not assume the code is open source or free to redistribute.

<br/>

<div align="center">

<p align="center">&middot;&ensp;&middot;&ensp;&middot;</p>

**DRAPE** &nbsp;·&nbsp; *The Art of Personal Style*

<sub>Designed and built by <a href="https://github.com/Soham-Pasalkar">Soham Pasalkar</a></sub>

</div>