# DRAPE — Implementation Roadmap & Product Milestones

**Status:** Strategic Engineering Roadmap  
**Author:** DRAPE Core Engineering  
**Date:** November 2026  
**Target:** Phased Evolution from Prototype to Production Virtual Try-On

---

## 1. Executive Summary

This roadmap defines the transition of DRAPE from an experimental prototype into a production-grade luxury fashion virtual try-on platform. To manage technical risk and guarantee stability, implementation is organized into four sequential maturity levels:

```
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: Stable Visual Alignment & Architecture Decoupling            │
│ Target: Flawless torso tracking, zero camera lag, decoupled modules    │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 2: Articulated Skinned Garments & Web Worker Isolation           │
│ Target: SkinnedMesh arm articulation, zero seam tears, Worker Vision   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 3: Secondary Cloth Dynamics & Contour Occlusion                  │
│ Target: Hem drapery, physical inertia, silhouette-guided fit           │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 4: Production Sizing & Full E-Commerce Integration               │
│ Target: S/M/L/XL morph grading, catalog database linkage, mobile tuning│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Maturity Level Breakdown

### LEVEL 1: Stable Visual Alignment & Architecture Decoupling

#### Objective
Establish a clean, decoupled baseline where the garment sits stably on the user's torso, tracks lateral motion accurately without lateral hacks, and matches the video feed without temporal lag.

#### Scope & Components
1. **Module Decoupling:** Reorganize `frontend/src/lib/ar` into the 8 discrete subsystems defined in `REVISED_AR_ARCHITECTURE.md`.
2. **Deconstruct `VirtualTryOnExperience.tsx`:** Extract diagnostic HUD, recording engine, modal controls, and WebGL rendering into focused sub-components.
3. **Eradicate Coordinate Hacks:**
   - Remove the brute-force lateral shoulder pin translation override in `fitting-engine.ts`.
   - Implement verified PnP with a continuous 3D torso prior.
4. **Synchronized Video Presenter (`frame-presenter.ts`):** Render the video frame and 3D garment in the same render tick to eliminate the visual trailing lag.
5. **Backend Database Concurrency Fix:**
   - Eliminate the in-memory Python `_variant_locks` in `cart.py`.
   - Implement PostgreSQL row-level `SELECT ... FOR UPDATE` with sorted variant IDs to guarantee zero overselling.

#### Acceptance Criteria & Targets
- Zero visual trailing lag during rapid side-to-side torso movement ($\le 2\text{ px}$ alignment error).
- Frame rate $\ge 45\text{ fps}$ on standard desktop webcams.
- 100% of existing unit and regression tests pass or are updated to the decoupled API.
- Zero race conditions under 50 concurrent cart reservation checkout requests.

---

### LEVEL 2: Articulated Skinned Garments & Web Worker Isolation

#### Objective
Enable natural arm movement with genuine garment sleeves that articulate smoothly with the user's elbows and wrists, while moving neural inference off the browser main thread.

#### Scope & Components
1. **Web Worker Vision Pipeline:**
   - Execute MediaPipe PoseLandmarker inside a dedicated Web Worker via `OffscreenCanvas` and `ImageBitmap` transfer.
   - Implement automatic fallback to main-thread processing on browsers lacking full worker canvas support.
2. **Skinned Garment Pipeline:**
   - Author first 3 production-grade skinned garments (Crewneck T-shirt, Longsleeve Top, Tailored Blazer) in Blender according to `GARMENT_ASSET_PIPELINE.md`.
   - Implement Three.js `SkinnedMesh` loader and humanoid bone binding.
3. **Two-Bone Analytical Arm IK Solver:**
   - Solve upper-arm and forearm bone quaternions from shoulder, elbow, and wrist landmarks.
   - Bind sleeve bones directly to user arm motion.
4. **Retirement of Rigid Sleeve Compromise:**
   - Completely delete `SleeveRig([])` and barycentric torso seam welding.
   - The armhole seam is a continuous manifold; sleeve tearing is mathematically impossible.

#### Acceptance Criteria & Targets
- When the user raises their arms from $0^\circ$ to $90^\circ$, garment sleeves bend naturally with zero mesh tearing or armhole gaps.
- Main thread CPU utilization drops by $\ge 40\%$ due to Web Worker offloading.
- Three.js render loop maintains stable $60\text{ fps}$ during active motion.

---

### LEVEL 3: Secondary Cloth Dynamics & Contour Occlusion

#### Objective
Add physical realism through localized cloth simulation (draping hems, fabric sway) and seamless body occlusion.

#### Scope & Components
1. **Localized XPBD Physics Engine:**
   - Restrict XPBD cloth simulation to loose fabric areas: bottom hems of shirts, skirt panels, and dress bottoms.
   - Drive primary garment fit via GPU skinning; add XPBD displacements as secondary dynamic offsets.
2. **Body Depth Occluder (`body-avatar.ts`):**
   - Create a rigged humanoid proxy mesh rendered to the WebGL depth buffer (`colorWrite: false`).
   - Ensures the customer's real arms, chest, and neck naturally occlude the inner back lining of garments.
3. **MediaPipe Segmentation Silhouette Guidance:**
   - Utilize MediaPipe Selfie Segmentation mask to refine outer garment contour boundaries.

#### Acceptance Criteria & Targets
- Garment hems exhibit natural inertial lag and gravitational swing during movement.
- When the user places their hands or forearms in front of their chest, their real arm renders in front of the virtual garment (proper depth occlusion).
- Physics simulation overhead strictly capped at $\le 4\text{ ms}$ per frame.

---

### LEVEL 4: Production Sizing & Full E-Commerce Integration

#### Objective
Connect the AR virtual try-on engine directly to the DRAPE e-commerce product catalog, database, and customer sizing profiles.

#### Scope & Components
1. **Backend Schema Migration (`0006_ar_garment_assets.py`):**
   - Implement `garment_assets` table linked to products and variants.
   - Store sizing tables, morph targets, and CDN URLs for GLB assets.
2. **Morph Target Sizing Engine:**
   - Integrate S, M, L, XL shape keys in garment GLBs.
   - User-stated height and profile dimensions dynamically blend garment sizing morphs.
3. **Product Detail Page Full Integration:**
   - Replace hardcoded string checks on `/products/[slug]` with genuine API-driven asset hydration.
   - Display try-on button only for products with verified 3D assets.
4. **Mobile & Cross-Browser Optimization:**
   - Safari iOS and Android Chrome touch controls, orientation change handling, and thermal throttling mitigations.

#### Acceptance Criteria & Targets
- Real products in the catalog load their authentic 3D garment models.
- Changing size on the product page (e.g. S to XL) visually adjusts the garment fit in the AR viewport.
- Memory consumption $\le 250\text{ MB}$; zero WebGL memory leaks during multi-garment browsing sessions.

---

## 3. Pre-Implementation Feasibility Prototype: Web Worker Vision

Before undertaking a full codebase refactoring, a minimal, isolated feasibility prototype must validate Web Worker neural vision across target browsers.

### Prototype Specification
- **File:** `frontend/scripts/prototype-worker-vision.html` (Standalone, zero application footprint).
- **Execution:** Runs in Chrome, Safari, and mobile browsers.
- **Verification Matrix:**
  1. Does `new Worker()` successfully instantiate with `@mediapipe/tasks-vision` WASM?
  2. Does `createImageBitmap(video)` successfully transfer across the worker boundary via `postMessage([bitmap], [bitmap])` without memory leaks?
  3. Does Safari 17+ maintain stable 30 fps inference without WebGL context loss?
  4. Measure latency diff: Main-thread inference vs. Worker inference roundtrip.
- **Go / No-Go Decision Gate:** If Worker transfer latency $\le 2\text{ ms}$ on Safari and Chrome, proceed with Level 2 Worker architecture. If Safari fails, implement automatic main-thread fallback for WebKit.

