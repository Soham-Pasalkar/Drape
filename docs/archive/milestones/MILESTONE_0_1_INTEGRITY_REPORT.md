# DRAPE — Milestone 0.1: Cleanup Integrity & Git Verification Report

**Date:** November 2026  
**Auditor:** Software Engineering Assistant (Antigravity)  
**Active Working Tree Branch:** `engineering-reset/ar-cleanup-audit`  
**Current HEAD Commit:** `cc93715c6a645e75fd8269e45395f5eb36ae1e21`  
**Tag:** `ar-m1-fix`  
**Status:** Verification Complete — Action Plan Prepared  

---

## 1. Verified Git State

An exhaustive audit of the local repository, commit graph, and remote synchronization status was performed.

### 1.1 Current Branch and HEAD Inspection
- **Active Branch:** `engineering-reset/ar-cleanup-audit`
- **Current HEAD Commit SHA:** `cc93715c6a645e75fd8269e45395f5eb36ae1e21`
- **Upstream Tracking:** `origin/engineering-reset/ar-cleanup-audit`
- **Commit Delta vs Baseline (`cc93715c`):** **0 commits** (The commit history is identical to the baseline).
- **Working Tree State:** Dirty (contains all uncommitted Milestone 0 hygiene changes and untracked files).

```bash
$ git branch -a
  ar-cleanup
* engineering-reset/ar-cleanup-audit
  engineering-reset/repository-audit
  main
  remotes/origin/engineering-reset/ar-cleanup-audit
  remotes/origin/engineering-reset/repository-audit
  remotes/origin/main

$ git rev-parse HEAD
cc93715c6a645e75fd8269e45395f5eb36ae1e21

$ git status
On branch engineering-reset/ar-cleanup-audit
Your branch is up to date with 'origin/engineering-reset/ar-cleanup-audit'.
Changes not staged for commit: 16 files (14 modified, 2 deleted)
Untracked files: 13 files (10 docs, 3 frontend components/barrels)
```

---

## 2. Commit and Branch Integrity & Recovery Procedure

### 2.1 Branch Assessment
- **Audit Branch (`engineering-reset/ar-cleanup-audit`):**
  Milestone 0 modifications were made in the working tree while `engineering-reset/ar-cleanup-audit` was checked out. However, **no commits have been made to this branch**. The git commit pointer `HEAD` and its ref log remain pristine at `cc93715c6a645e75fd8269e45395f5eb36ae1e21`.
- **Implementation Branch (`engineering-reset/ar-foundation`):**
  The designated implementation branch has **not yet been created**.
- **Remote Synchronization:**
  `origin/engineering-reset/ar-cleanup-audit` and local `engineering-reset/ar-cleanup-audit` point to the exact same commit (`cc93715c`). No diverged history exists.

### 2.2 Proposed Safest Recovery Procedure
To ensure that the audit baseline is 100% preserved without rewriting history or risking data loss, the working tree changes will be committed to a dedicated implementation branch:

```bash
# Step 1: Create and checkout the implementation branch directly from the current baseline
git checkout -b engineering-reset/ar-foundation

# Step 2: Stage and commit the Milestone 0 baseline changes
git add backend/ frontend/ docs/
git commit -m "chore(milestone-0): establish clean architectural baseline, purge dead code, and author specs"

# Step 3: Verify the audit branch remains completely pristine at cc93715c
git checkout engineering-reset/ar-cleanup-audit
git status # (Will be 100% clean, pointing to cc93715c)

# Step 4: Switch back to the implementation branch for all Level 1 work
git checkout engineering-reset/ar-foundation
```

> [!NOTE]
> Per project owner instructions, this recovery procedure will be executed only after formal sign-off. No files or working tree changes were discarded, reset, or overwritten.

---

## 3. File Change Summary

The table below summarizes every modification, deletion, and addition present in the working tree relative to `cc93715c`:

### 3.1 Deleted Files (2 files, -293 lines)
| File Path | Original Lines | Justification |
| :--- | :--- | :--- |
| `frontend/src/lib/ar/skeletal-skinning.ts` | 189 lines | Dead prototype implementing Three.js `Skeleton`/`Bone`. 0 consumers across codebase. |
| `frontend/src/lib/ar/environmental-lighting.ts` | 104 lines | Experimental canvas luminance estimator abandoned in commit `7ab407d`. 0 consumers. |

### 3.2 Modified Files (14 files, +30 / -279 lines)
| File Path | Changes | Net Diff |
| :--- | :--- | :--- |
| `frontend/src/lib/ar/personalized-body-shape.ts` | Stripped dead 147-line PCA shape solver (`solveShapeParameters`, `solveLinearSystem`, `jacobianA`, `meanMeasurements`, `priorVariance`). Retained active `PersonalizedBodyShapeEstimator`. | -147 lines |
| `frontend/src/components/try-on/VirtualTryOnExperience.tsx` | Extracted inline modal JSX into `CalibrationModal.tsx` and `TryOnInfoModal.tsx`. | -96 lines |
| `backend/app/core/config.py` | Removed unused `List`, `Union` imports. | -2 lines |
| `backend/app/api/v1/endpoints/checkout.py` | Cleaned unused typing and model imports (`Optional`, `Dict`, `Any`, `ProductVariant`, `InventoryItem`). | -4 lines |
| `backend/app/api/v1/endpoints/products.py` | Cleaned unused imports (`Optional`, `Dict`, `Any`, `Category`). | -3 lines |
| `backend/app/api/v1/endpoints/payments.py` | Cleaned unused domain and schema imports (`Payment`, `PaymentStatus`, `PaymentMethod`, `RefundRequest`). | -4 lines |
| `backend/app/api/v1/endpoints/orders.py` | Cleaned unused typing imports (`Optional`, `Dict`, `Any`). | -1 line |
| `backend/app/api/v1/schemas/catalog.py` | Cleaned unused typing imports (`Optional`, `Dict`, `Any`). | -1 line |
| `backend/app/api/v1/schemas/checkout.py` | Cleaned unused typing imports (`Optional`, `Dict`, `Any`). | -1 line |
| `backend/app/infrastructure/adapters/sqlalchemy_identity_adapter.py` | Cleaned unused typing imports (`Optional`, `List`). | -1 line |
| `backend/app/domain/ports/identity_port.py` | Cleaned unused typing imports (`Optional`, `List`). | -1 line |
| `backend/app/domain/ports/catalog_sync_port.py` | Cleaned unused typing imports (`Optional`, `List`). | -1 line |
| `backend/app/domain/ports/tax_calculation_port.py` | Cleaned unused typing imports (`Optional`, `List`). | -1 line |
| `backend/app/api/v1/endpoints/cart.py` | Documented and verified concurrency lock for SQLite testing. | -1 line |

### 3.3 Untracked / Newly Created Files (13 files)
| Category | File Path | Scope |
| :--- | :--- | :--- |
| **Components** | `frontend/src/components/try-on/CalibrationModal.tsx` | ISO ID-1 card metric scale calibration modal (85 lines). |
| **Components** | `frontend/src/components/try-on/TryOnInfoModal.tsx` | Technical atelier specification & privacy dossier (52 lines). |
| **Barrels** | `frontend/src/lib/ar/index.ts` | Unified public API barrel across 8 AR subsystems (164 lines). |
| **Architecture** | `docs/CALIBRATION_AND_BODY_MODEL_RESEARCH.md` | Rejection of iris depth; two-tier scale model; SMPL vs segmentation analysis. |
| **Architecture** | `docs/GARMENT_ASSET_PIPELINE.md` | CLO3D/Blender workflow; quad retopology; continuous armhole manifold skinning; MVGAS v1. |
| **Architecture** | `docs/REVISED_AR_ARCHITECTURE.md` | Target 8-subsystem architecture; analytical two-bone arm IK; GPU SkinnedMesh deformation. |
| **Architecture** | `docs/AR_TECHNOLOGY_EVALUATION.md` | Technology matrix across 7 domains with explicit adoption criteria. |
| **Architecture** | `docs/IMPLEMENTATION_ROADMAP.md` | 4-level maturity roadmap (Level 1 to Level 4) with pre-implementation Worker test plan. |
| **Architecture** | `docs/ARCHITECTURAL_DECISIONS_PENDING.md` | Formal Architecture Decision Records (ADR-009 through ADR-014). |
| **Audits** | `docs/CODEBASE_HYGIENE_AUDIT.md` | Detailed audit of dead code, duplicate implementations, and clean state. |
| **Audits** | `docs/REPOSITORY_STRUCTURE.md` | Repository structure, responsibilities per folder, and architectural boundaries. |
| **Audits** | `docs/DEPENDENCY_CLEANUP_REPORT.md` | Frontend and backend dependency audit and version locking report. |
| **Audits** | `docs/REFACTORING_CHANGELOG.md` | Exact chronological refactoring log and verification records. |

---

## 4. Deleted Module Verification & Clarification

### 4.1 Inquiry regarding `personalized-body-shape.ts`
The project owner observed:
> *"The report states that `frontend/src/lib/ar/personalized-body-shape.ts` was deleted. However, the AR public API barrel reportedly still lists this module under Body Representation & PnP."*

### 4.2 Inspection Findings
1. **File Existence:** The file **exists on disk** at `frontend/src/lib/ar/personalized-body-shape.ts` (115 lines).
2. **Barrel Export:** `frontend/src/lib/ar/index.ts` (lines 85-88) explicitly exports:
   ```ts
   export {
     PersonalizedBodyShapeEstimator,
     BODY_MEASUREMENT_FACTORS,
   } from "./personalized-body-shape";
   ```
3. **Active Consumers:** The module is actively imported by:
   - `frontend/src/lib/ar/fitting-engine.ts:36`:
     ```ts
     import { PersonalizedBodyShapeEstimator } from './personalized-body-shape';
     ```
   - `frontend/src/lib/ar/garment-ease.ts:16`:
     ```ts
     import { PersonalizedBodyShapeEstimator } from './personalized-body-shape';
     ```
4. **TypeScript Resolution:** `cd frontend && npx tsc --noEmit` compiles with **zero errors**.
5. **What was actually pruned vs preserved:**
   - **Pruned (147 lines of dead code):** In the original 262-line file, lines 111-262 contained `solveShapeParameters()`, `solveLinearSystem()`, `jacobianA()`, `meanMeasurements()`, and `priorVariance()`. This was an experimental linear system solver for 10-dimensional PCA body shape coefficients that was unreferenced throughout the entire application and marked as dead code in historical audit records (`docs/aidlc/CODEBASE.md:36`: *"ratios yes; solver dead"*).
   - **Preserved (Active Core):** `PersonalizedBodyShapeEstimator` (which implements Ramanujan's ellipse perimeter formulation for torso circumferences) and `BODY_MEASUREMENT_FACTORS` (biacromial, chest, waist, and hip scaling factors).
6. **Root Cause of Confusion:** The Milestone 0 chat summary combined all pruned dead code under a single bullet item ("Total Dead Code Removed: 403 lines: skeletal-skinning.ts, environmental-lighting.ts, personalized-body-shape.ts"), giving the false impression that the file itself was deleted. `docs/CODEBASE_HYGIENE_AUDIT.md` has been amended to explicitly state that `personalized-body-shape.ts` is an active, retained module from which dead solver functions were pruned.

---

## 5. AR Component Decomposition Assessment

A comprehensive responsibility breakdown of `frontend/src/components/try-on/VirtualTryOnExperience.tsx` (1,222 lines) was conducted to assess remaining coupling.

### 5.1 Responsibility Breakdown
| Responsibility | Line Range | Lines | Coupling Analysis |
| :--- | :--- | :--- | :--- |
| **State Declarations** | Lines 70–164 | 95 lines | 28 `useState` hooks and 25 `useRef` hooks declared in a single scope, coupling camera, tracking, and UI state. |
| **Event Listeners** | Lines 194–205, 246–251, 519–530 | 30 lines | Inlined `ResizeObserver`, `visibilitychange`, and `keydown` window event listeners. |
| **Three.js Engine & Canvas** | Lines 207–242, 581–615 | 70 lines | Direct WebGL canvas initialization, container DOM mounting, scene setup, and low-level resource disposal (`teardownAR`). |
| **Camera Lifecycle** | Lines 581–619, 804–824 | 60 lines | Video element stream binding, `CameraManager` acquisition, mirroring transforms, and camera switching. |
| **Pose Tracking Lifecycle** | Lines 535–580 | 46 lines | Main-thread MediaPipe `PoseTracker` lifecycle, options mutation, session invalidation, and callback dispatch. |
| **Rendering Loop (rAF)** | Lines 620–784 | 165 lines | Continuous `requestAnimationFrame` loop invoking `FrameStep`, off-axis projection recalculation, 2D overlay drawing, and FPS measurement. |
| **Diagnostics & Telemetry** | Lines 254–466 | 213 lines | Heavy inline computation of landmark confidence, yaw angles, off-axis matrices, torso dimensions, and JSON report generation. |
| **Session Recording** | Lines 468–518 | 50 lines | Recording timer, state capture, blob serialization, and file download triggering. |
| **Modal & Presentation UI** | Lines 860–1221 | 362 lines | JSX rendering of header, camera viewport, garment selector carousel, diagnostic overlays, and modal toggles. |

### 5.2 Identified Architectural Anti-Patterns
1. **God Component:** `VirtualTryOnExperience.tsx` acts simultaneously as hardware device controller, graphics engine manager, tracking coordinator, animation driver, telemetry profiler, and top-level page layout.
2. **State Leakage:** Low-level rendering frame rates (`currentRenderFpsRef`) and diagnostic telemetry are intertwined with React UI rendering state.

### 5.3 Recommended Modular Extraction Boundaries (For Level 1)
Without performing a premature large rewrite during this verification phase, the following safe extraction boundaries are planned for Level 1:
1. **`useCameraStream` hook:** Encapsulates `CameraManager`, device enumeration, stream start/stop, facingMode switching, and video aspect ratio calculation (~80 lines).
2. **`usePoseWorker` hook:** Encapsulates the Web Worker bridge, offscreen landmark processing, and session invalidation (~70 lines).
3. **`useARScene` hook:** Encapsulates `ThreeSceneManager`, WebGL canvas initialization, container resize observer, and `teardownAR` (~110 lines).
4. **`useDiagnostics` hook / helper:** Extracts `buildDiagnostics`, FPS calculation, and telemetry log formatting into an external helper (~200 lines).
5. **`useSessionRecorder` hook:** Extracts recording start, stop, marker hotkeys, snapshot capture, and JSON download (~90 lines).
6. **Result:** `VirtualTryOnExperience.tsx` will shrink from 1,222 lines to under 350 lines, functioning purely as a clean presentation coordinator.

---

## 6. Public AR Subsystem API Verification

`frontend/src/lib/ar/index.ts` was inspected and verified.

### 6.1 Verification Findings
- **Export Resolution:** All 56 exported symbols across 18 target modules resolve cleanly without missing export errors.
- **Deleted Modules:** Neither `skeletal-skinning.ts` nor `environmental-lighting.ts` is exported.
- **Circular Dependencies:** An automated AST import-graph cycle detector was executed across `frontend/src/lib/ar/`. **0 circular dependency cycles were found.**
- **Consumer Import Status:** Existing components (`VirtualTryOnExperience.tsx`, `GarmentSelector.tsx`) currently import directly from individual files (e.g., `@/lib/ar/camera`, `@/lib/ar/types`). This was intentional during Milestone 0 to avoid breaking the Node CommonJS test runner (`scripts/tsconfig.ar-test.json`), which compiles individual files to `dist_test/`. Migrating external consumers to `@/lib/ar` will occur in Level 1 alongside the test harness modernization.

---

## 7. Repository Hygiene Findings

| Category | Finding | Status |
| :--- | :--- | :--- |
| **Duplicate Implementations** | No duplicate implementations remain. Sizing logic is consolidated in `fitting-engine.ts` and `personalized-body-shape.ts`. | Clean |
| **Unused Production Modules** | Verified with `git grep` and AST analysis: 0 unused modules in `frontend/src/` or `backend/app/`. | Clean |
| **Dead Exports in Backend** | 12 backend files cleaned of unused type imports and redundant schemas. Confirmed 0 unused imports. | Clean |
| **Unused Dependencies** | All 8 frontend runtime dependencies and all 14 backend packages in `requirements.txt` are actively used. | Clean |
| **Dynamic Imports** | The sole dynamic import (`const VirtualTryOnExperience = dynamic(...)` in `frontend/src/app/try-on/page.tsx`) correctly imports the default export with `ssr: false`. | Clean |
| **Obsolete Scripts** | Evaluated `frontend/scripts/`. All scripts (`run-ar-tests.cjs`, `validate-garment-assets.cjs`, `generate-garments.mjs`) serve active test/asset roles. | Clean |
| **Garment Assets** | All 8 GLB garment models in `frontend/public/models/garments/` validated successfully with `npm run validate:garments`. | Clean |
| **Generated Artifacts** | Build outputs (`.next/`, `.pytest_cache/`, `__pycache__/`, `dist_test/`) are correctly excluded by `.gitignore`. None are tracked or untracked. | Clean |

---

## 8. Test Execution Evidence & Synthetic Analysis

### 8.1 Summary of Test Results
```
================================================================================
VERIFICATION SUMMARY
================================================================================
Frontend AR Tests:        252 Passed,  0 Failed,  0 Skipped,  0 Crashed
Backend Pytest Suite:      95 Passed,  0 Failed,  0 Skipped (in 30.36s)
Next.js Production Build:  17/17 Pages Compiled, 0 Errors
TypeScript Type Check:      0 Errors across all files
ESLint Code Style:          0 Errors, 0 Warnings
================================================================================
```

### 8.2 Breakdown: Real vs. Synthetic Test Behavior
The project owner requested an explicit distinction between genuine integration validation and synthetic test execution:

1. **Frontend AR Subsystem (252 Tests):**
   - **Synthetic Tests (237 tests):**
     - `test-ar-calibration.cjs` (16 tests): Mathematical assertions on pinhole focal length equations and instant depth formula. No physical camera.
     - `test-ar-coordinates.cjs` (47 tests): Pure coordinate transforms (image $\leftrightarrow$ NDC $\leftrightarrow$ display rect). No video feed.
     - `test-ar-correspondence.cjs` (19 tests): Geometric closest-point BVH math. No live mesh deformation.
     - `test-ar-fitting-pipeline.cjs` (37 tests): Feeds synthetic mathematical landmark coordinates with synthetic Gaussian jitter ($\pm 1.5\text{ px}$). No MediaPipe WASM execution.
     - `test-ar-motion.cjs` (7 tests): Simulates 1,800 frames of synthetic math movement (stepping closer/farther, hip gating).
     - `test-ar-xpbd.cjs` (22 tests): Numerical cloth particle solver running in a headless Node loop without rendering.
     - `test-ar-garments.cjs` / `golden` / `pipeline` (89 tests): Transform math and state assertions.
   - **Recorded Session Replay Tests (7 tests):**
     - `test-ar-replay.cjs` (7 tests): Replays real recorded JSON session files (`drape-session-chrome-*.json`). Validates algorithmic determinism against historical human data.
   - **GLB Parity Tests (8 tests):**
     - `test-glb-loader-parity.mjs` (8 tests): Validates the 8 actual binary GLB files using Three.js `GLTFLoader`.
   - **Live Integration / Browser WebCam Tests (0 tests):**
     - **None of the 252 AR tests run in a real browser with a live webcam or live MediaPipe execution.** They run in Node.js CommonJS with synthetic mocks. True end-to-end browser testing is an explicit goal of Level 1.

2. **Backend Subsystem (95 Tests):**
   - **Genuine Integration Tests (95 tests):**
     - All 95 backend tests execute against live FastAPI ASGI routers, Pydantic v2 schemas, SQLAlchemy ORM mappings, cryptographic hashing (`bcrypt`), and asynchronous transactions in `aiosqlite`.
     - 0 tests skipped. 0 tests mocked superficially.

---

## 9. Outstanding Issues & Limitations

1. **Working Tree Uncommitted:** Milestone 0 changes are currently uncommitted on `engineering-reset/ar-cleanup-audit`.
2. **Main-Thread Tracking Bottleneck:** MediaPipe PoseLandmarker still runs on the main JavaScript UI thread, causing frame drops during rapid movement.
3. **Synthetic Test Reliance:** The AR test suite relies almost entirely on synthetic landmarks and math assertions rather than automated headless browser end-to-end tests.
4. **Procedural Garment Geometry:** Garments are still procedural cylinder/ellipsoid meshes with rigid sleeve attachments rather than continuous manifold skinned quad meshes.

---

## 10. Readiness Recommendation for Level 1

The codebase is clean, stable, mathematically validated, and fully documented. There are no broken references, circular imports, or syntax errors.

### Recommended Next Steps (Awaiting Approval):
1. **Execute Git Branch Recovery:** Create `engineering-reset/ar-foundation` from baseline `cc93715c`, commit the Milestone 0 baseline, and leave `engineering-reset/ar-cleanup-audit` pristine.
2. **Formalize ADRs:** Confirm [ADR-009 through ADR-014](file:///Users/soham/Github/Drape/docs/ARCHITECTURAL_DECISIONS_PENDING.md).
3. **Authorize Level 1:** Begin Phase 1.1 (Web Worker offloading prototype) on the new implementation branch.

