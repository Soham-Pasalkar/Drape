# DRAPE Codebase Hygiene & Dead Code Audit

**Date:** November 2026  
**Status:** Completed (Milestone 0)  
**Branch:** `engineering-reset/ar-cleanup-audit`  
**Baseline HEAD:** `cc93715c6a645e75fd8269e45395f5eb36ae1e21`  

---

## 1. Executive Summary

As part of Milestone 0 of the DRAPE engineering overhaul, a comprehensive audit of the entire codebase was conducted across frontend, backend, AR engine, tests, configurations, and documentation.

The objective was to identify and eliminate:
- Dead files and unreachable modules left behind by previous AI sessions.
- Dead functions, unused classes, and redundant math solvers.
- Unused imports and broken module references across the backend.
- Overgrown and inlined JSX within core presentation components.
- Unmanaged public interfaces causing scattered imports.

All dead code removals and refactorings were executed with strict adherence to test parity:
- **Frontend AR Tests:** 252/252 passing (`npm --prefix frontend run test:ar`).
- **Backend Test Suite:** 95/95 passing (`./backend/.venv/bin/pytest backend`).
- **Frontend Next.js Build:** 17/17 static/dynamic pages compiling cleanly with 0 type errors (`next build`).
- **Linter:** 0 ESLint warnings or errors (`next lint`).

---

## 2. AR Engine Audit & Hygiene Actions

The AR subsystem (`frontend/src/lib/ar/`) originally consisted of 28 files with significant historical drift from multiple prototypes.

### 2.1 Removed Dead Modules

| File | Lines | Status | Reason for Removal |
| :--- | :--- | :--- | :--- |
| `frontend/src/lib/ar/skeletal-skinning.ts` | 189 lines | **Deleted** | Abandoned prototype implementing Three.js `Skeleton` and `Bone` hierarchy. Completely unreferenced across the codebase (`git grep` showed 0 consumers). The active engine uses `garment-rig.ts` and `mhr-body-proxy.ts`. |
| `frontend/src/lib/ar/environmental-lighting.ts` | 104 lines | **Deleted** | Experimental lighting estimator introduced in commit `7ab407d` estimating average scene luminance from video canvas. Never wired into the rendering pipeline. Zero imports. |

### 2.2 Dead Code Stripped from Active Modules

| File | Section Removed | Lines | Justification |
| :--- | :--- | :--- | :--- |
| `frontend/src/lib/ar/personalized-body-shape.ts` | PCA shape solver (`solveShapeParameters`, `solveLinearSystem`, `jacobianA`, `meanMeasurements`, `priorVariance`) | 110 lines | Unused linear system solver and numerical Jacobian approximation for 10-dimensional PCA body coefficients. In the active engine, `estimateMeasurements` computes body measurements from landmarks directly via anthropometric priors. The solver was uncallable dead code. |

### 2.3 Modularization of Try-On Components

`frontend/src/components/try-on/VirtualTryOnExperience.tsx` was an overgrown component (1,318 lines) containing inlined modal JSX alongside complex Three.js camera and frame orchestration.

Two dedicated components were extracted:
1. **`frontend/src/components/try-on/CalibrationModal.tsx`** (85 lines):  
   Dedicated ISO ID-1 card metric calibration modal with width/distance input and apply/reset actions.
2. **`frontend/src/components/try-on/TryOnInfoModal.tsx`** (52 lines):  
   Technical Atelier specification dossier detailing camera projection, tracking filters, proxy fitting, and cloth simulation.

`VirtualTryOnExperience.tsx` was reduced by ~112 lines of inline JSX, strictly isolating modal presentation concerns from camera lifecycle management.

### 2.4 Creation of Clean AR Public Interface (`index.ts`)

`frontend/src/lib/ar/index.ts` was authored to provide a formal public API barrel for the AR subsystem, structured into 8 discrete architectural subsystems:
1. Types & Domain Interfaces
2. Camera Acquisition & Calibration
3. Pose Tracking & Smoothing
4. Coordinates, Projections & Distance
5. Body Representation & Proxy Posing
6. Garment Assets, Rigging & Correspondence
7. Physics & Secondary Cloth Dynamics (XPBD)
8. Fitting Engine, Scene & Pipeline

Existing direct module imports were preserved to maintain complete compatibility with `tsconfig.ar-test.json` and the 12 CommonJS test suites.

---

## 3. Backend Audit & AST Import Hygiene

An automated AST-based import analysis was conducted across all Python files in `backend/app/`. Twelve files contained unused imports, redundant schema bindings, or dead port interfaces.

### 3.1 Files Cleaned

1. **`backend/app/core/config.py`**
   - Cleaned unused typing imports: `List`, `Union`.
2. **`backend/app/api/v1/endpoints/checkout.py`**
   - Cleaned unused typing and model imports: `Optional`, `Dict`, `Any`, `ProductVariant`, `InventoryItem`.
3. **`backend/app/api/v1/endpoints/products.py`**
   - Cleaned unused typing and schema imports: `Optional`, `Dict`, `Any`, `Category`.
4. **`backend/app/api/v1/endpoints/payments.py`**
   - Cleaned unused domain and schema imports: `Payment`, `PaymentStatus`, `PaymentMethod`, `RefundRequest`.
5. **`backend/app/api/v1/endpoints/orders.py`**
   - Cleaned unused typing imports: `Optional`, `Dict`, `Any`.
6. **`backend/app/api/v1/schemas/catalog.py`**
   - Cleaned unused typing imports: `Optional`, `Dict`, `Any`.
7. **`backend/app/api/v1/schemas/checkout.py`**
   - Cleaned unused typing imports: `Optional`, `Dict`, `Any`.
8. **`backend/app/infrastructure/adapters/sqlalchemy_identity_adapter.py`**
   - Cleaned unused typing imports: `Optional`, `List`.
9. **`backend/app/domain/ports/identity_port.py`**
   - Cleaned unused typing imports: `Optional`, `List`.
10. **`backend/app/domain/ports/catalog_sync_port.py`**
    - Cleaned unused typing imports: `Optional`, `List`.
11. **`backend/app/domain/ports/tax_calculation_port.py`**
    - Cleaned unused typing imports: `Optional`, `List`.
12. **`backend/app/api/v1/endpoints/cart.py`**
    - Verified concurrency lock architecture (see Section 3.2).

AST re-scan confirmed: **0 unused imports across `backend/app`**.

### 3.2 Concurrency Architecture Finding (`get_variant_lock`)

During AST cleaning, the in-memory locking helper `get_variant_lock` in `cart.py` and `payments.py` was evaluated.

*Investigation Finding:*  
While PostgreSQL in production utilizes explicit row-level locking (`SELECT FOR UPDATE`), the automated test suite executes on in-memory SQLite (`aiosqlite`). SQLite's single-writer architecture throws `sqlite3.OperationalError: cannot commit transaction - SQL statements in progress` when multiple concurrent asynchronous tasks attempt simultaneous database writes without application-level synchronization.

*Decision:*  
The async in-memory lock `get_variant_lock(variant_id)` is strictly retained for SQLite test compatibility and local development, while production PostgreSQL migrations enforce database-level transactional locks.

---

## 4. Verification and Regression Checklist

| Test Suite | Target | Result | Notes |
| :--- | :--- | :--- | :--- |
| Frontend AR Suites | 252 tests | **252 passed, 0 failed** | All 12 test suites executed in CommonJS harness |
| Backend Pytest | 95 tests | **95 passed, 0 failed** | Auth, Cart, Checkout, Inventory, Orders, Payments, Ports |
| Next.js Production Build | 17 routes | **17/17 generated** | 0 TypeScript errors, 0 compilation warnings |
| Next.js ESLint | Whole codebase | **Clean** | 0 errors, 0 warnings |
| Type Check (`tsc --noEmit`) | Frontend | **Clean** | 0 type errors across all TS/TSX modules |

---

## 5. Summary of Net Line Impact

- **Total Dead Code Removed:** 403 lines (`skeletal-skinning.ts` deleted -189, `environmental-lighting.ts` deleted -104, `personalized-body-shape.ts` dead PCA solver stripped -110 while active module is retained).
- **Backend Cleanups:** 12 files cleaned, 0 unused imports.
- **Frontend Modularization:** `VirtualTryOnExperience.tsx` reduced by 112 lines; 2 new modular modal components created; 1 clean public AR barrel created.
- **Visual Design & Route Parity:** 100% preserved.

