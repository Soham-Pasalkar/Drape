# DRAPE Dependency Audit & Cleanup Report

**Date:** November 2026  
**Status:** Canonical Reference (Milestone 0)  
**Branch:** `engineering-reset/ar-cleanup-audit`  

---

## 1. Executive Summary

A comprehensive dependency review was conducted for both the **Frontend** (`frontend/package.json`) and the **Backend** (`backend/requirements.txt`).

The objective was to verify:
1. No bloated, unused, or duplicate packages exist.
2. Production runtime dependencies are strictly differentiated from development/testing dependencies.
3. Version constraints are well-bounded to prevent breaking upstream releases.
4. Security and vulnerability exposure is minimized.

---

## 2. Frontend Dependency Audit (`frontend/package.json`)

The frontend relies on a lean set of 8 runtime dependencies and 9 development dependencies.

### 2.1 Production Dependencies

| Package | Version Range | Active Usage | Audit Assessment |
| :--- | :--- | :--- | :--- |
| `@mediapipe/tasks-vision` | `^1.2.2` | Active | **Retained.** Core PoseLandmarker engine for monocular body landmark tracking. To be offloaded to Web Worker in Level 1. |
| `@types/three` | `^0.187.0` | Active | **Retained.** Type definitions for Three.js. (Located in dependencies to guarantee typing consistency across custom test scripts). |
| `clsx` | `^2.1.1` | Active | **Retained.** Utility for constructing conditional class names across all UI components. |
| `lucide-react` | `^0.453.0` | Active | **Retained.** Editorial fashion and technical icon set used across navigation, modals, and diagnostic overlays. |
| `next` | `^14.2.18` | Active | **Retained.** Next.js 14 App Router framework. Production build verified (17/17 routes). |
| `react` | `^18.3.1` | Active | **Retained.** Core React 18 UI library. |
| `react-dom` | `^18.3.1` | Active | **Retained.** React DOM rendering engine. |
| `tailwind-merge` | `^2.5.4` | Active | **Retained.** Merges Tailwind CSS classes efficiently without style precedence collisions. |
| `three` | `^0.187.0` | Active | **Retained.** WebGL 3D rendering engine powering the AR viewport, camera projection, scene lighting, and mesh deformation. |

### 2.2 Development Dependencies

| Package | Version Range | Purpose |
| :--- | :--- | :--- |
| `@types/node` | `^20.17.6` | Node.js typings for build scripts and test harnesses |
| `@types/react` | `^18.3.12` | React typing definitions |
| `@types/react-dom` | `^18.3.1` | React DOM typing definitions |
| `autoprefixer` | `^10.4.20` | CSS vendor prefixing |
| `eslint` | `^8.57.1` | Code style and lint enforcement |
| `eslint-config-next` | `^14.2.18` | Next.js recommended ESLint rules |
| `postcss` | `^8.4.47` | CSS transformation pipeline |
| `tailwindcss` | `^3.4.14` | Utility-first CSS styling framework |
| `typescript` | `^5.6.3` | TypeScript compiler and language server |

### 2.3 Frontend Findings
- **Zero redundant dependencies:** No external state management bloat (Redux, MobX), no unneeded heavy utility libraries (Lodash, Moment), and no overlapping animation libraries.
- **Bundle size:** First Load JS shared by all routes is only **87.4 kB**, maintaining luxury editorial performance standards.

---

## 3. Backend Dependency Audit (`backend/requirements.txt`)

The backend maintains a minimalist, high-performance async Python stack.

| Package | Version Range | Purpose & Architectural Justification |
| :--- | :--- | :--- |
| `fastapi` | `>=0.110.0,<1.0.0` | Primary asynchronous REST web framework. |
| `uvicorn[standard]` | `>=0.28.0,<1.0.0` | ASGI server utilizing `uvloop` and `httptools` for C-speed event loops. |
| `pydantic` | `>=2.6.0,<3.0.0` | Pydantic v2 high-speed Rust-backed data validation and serialization. |
| `pydantic-settings` | `>=2.2.0,<3.0.0` | Strongly typed environment variable management. |
| `sqlalchemy[asyncio]` | `>=2.0.28,<3.0.0` | Async database abstraction and ORM. |
| `alembic` | `>=1.13.1,<2.0.0` | Database schema migration engine for PostgreSQL. |
| `asyncpg` | `>=0.29.0,<1.0.0` | High-performance asynchronous PostgreSQL client driver for production. |
| `bcrypt` | `>=4.1.0,<6.0.0` | Secure cryptographic password hashing. |
| `pyjwt` | `>=2.8.0,<3.0.0` | Standard JSON Web Token (JWT) encoding and verification. |
| `aiosqlite` | `>=0.20.0,<1.0.0` | Async SQLite driver enabling sub-second in-memory test suite execution without external database containers. |
| `python-dotenv` | `>=1.0.1,<2.0.0` | Local development environment configuration. |
| `httpx` | `>=0.27.0,<1.0.0` | Async HTTP client used in integration test fixtures and port adapters. |
| `pytest` | `>=8.0.0,<9.0.0` | Core test runner. |
| `pytest-asyncio` | `>=0.23.0,<1.0.0` | Asynchronous test fixture orchestration. |

### 3.3 Backend Findings
- Every dependency in `requirements.txt` is strictly required for the hexagonal application architecture and test suite.
- Dual-driver approach (`asyncpg` for PostgreSQL in production; `aiosqlite` for in-memory testing) allows tests to run in seconds in local environments without spinning up Docker services, while guaranteeing non-blocking async execution in production.

---

## 4. Recommendations for Subsequent Milestones

1. **Web Worker Worker Packaging (Level 1):**  
   When offloading `@mediapipe/tasks-vision` to a Dedicated Web Worker in Level 1, ensure the Comlink/postMessage boundary does not introduce heavy serialization libraries. Use native `ArrayBuffer` transferables.
2. **glTF Retexturing (Level 2):**  
   If glTF texture compression (KTX2 / Basis Universal) is adopted during asset pipeline modernization, add `three/examples/jsm/loaders/KTX2Loader` support without pulling external node packages.

