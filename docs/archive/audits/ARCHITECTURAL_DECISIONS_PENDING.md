# DRAPE — Pending Architectural Decisions Register

**Status:** Formal Review & Sign-Off Pending  
**Author:** DRAPE Core Engineering  
**Date:** November 2026  
**Target:** Architecture Validation Prior to Implementation Phase

---

## 1. Executive Summary

This register contains the six formal Architectural Decision Records (ADRs) that govern the modernization of DRAPE. Each ADR specifies the technical context, the decision, the trade-offs, and why alternative solutions were rejected. Implementation will commence only after project owner sign-off.

---

## ADR-009: Dedicated Web Worker for MediaPipe Neural Vision

### Context
MediaPipe PoseLandmarker currently executes on the browser's main thread via `requestVideoFrameCallback` or `requestAnimationFrame`. Neural inference requires $20 - 45\text{ ms}$ of compute per frame, competing directly with React UI updates, touch handling, and Three.js WebGL draw calls. This causes noticeable micro-stutter and frame drops, particularly on laptops and mobile devices.

### Decision
Move `@mediapipe/tasks-vision` WASM and neural model execution into a dedicated Web Worker. Video frames will be converted on the main thread via `createImageBitmap(video)` and transferred to the worker as zero-copy `Transferable` objects. A lightweight runtime capability check will automatically fall back to main-thread execution on legacy browsers lacking worker canvas support.

### Consequences
- **Positive:** Main thread CPU utilization reduced by $\ge 40\%$; Three.js rendering maintains smooth $60\text{ fps}$; user interface remains completely responsive during active tracking.
- **Negative:** Adds a small serialization latency ($1 - 2\text{ ms}$) for `ImageBitmap` transfer; requires careful memory lifecycle management to avoid memory leaks from undisposed bitmaps.

### Alternatives Rejected
1. *Keep inference on main thread:* Rejected due to unacceptable UI thread jank and frame drops.
2. *WebCodecs VideoDecoder in Worker:* Overly complex; requires manually handling container demuxing and camera streams in worker.

---

## ADR-010: SkinnedMesh Humanoid Armature for 3D Garment Deformation

### Context
The current AR implementation treats sleeves as separate rigid geometry bound to torso triangles via barycentric coordinates (`SleeveRig([])`). When the user moves their arms, sleeves do not bend; attempting to articulate them previously tore 6.4 cm holes in the armhole seams.

### Decision
Standardize all 3D garment assets on Three.js `SkinnedMesh` driven by a standard humanoid skeletal armature (`Spine`, `Chest`, `Clavicle`, `Shoulder`, `UpperArm`, `Forearm`). Sleeves and torso will be authored as a continuous manifold mesh with smooth vertex weight gradients across the armhole. Primary arm and torso deformation will execute entirely on the GPU vertex shader.

### Consequences
- **Positive:** Sleeves articulate naturally with elbows and wrists; armhole tearing is mathematically impossible; zero CPU vertex recalculation per frame; massive performance boost.
- **Negative:** Requires authoring authentic rigged 3D models in Blender/CLO3D rather than generating primitive procedural cylinders.

### Alternatives Rejected
1. *Procedural barycentric seam welding (Fix/5):* Rejected because it leaves sleeves completely rigid, failing basic virtual try-on realism.
2. *Full XPBD physical cloth on sleeves:* Rejected because CPU cloth simulation cannot keep up with rapid arm raises without severe latency and mesh distortion.

---

## ADR-011: Metric Sizing Strategy (User Height + Anthropometry vs. Iris Anchor)

### Context
The previous system assumed a single hardcoded 36 cm shoulder width for all humans, distorting distance and sizing. A subsequent proposal suggested using human iris diameter ($11.7\text{ mm}$) as an optical depth anchor.

### Decision
1. **Formally reject and withdraw the iris diameter proposal** due to extreme optical sensitivity ($\pm 19\text{ cm}$ depth error at $2.0\text{ m}$) and population biological variance ($\pm 12.5\%$).
2. Implement a two-tiered calibration model:
   - **Tier 1 (Standard):** User-stated height combined with statistical anthropometric regression (ANSUR II / CAESAR) to establish metric scale with $< 3.5\%$ variance.
   - **Tier 2 (Bespoke Optional):** Precision optical calibration using a standard bank card (ISO/IEC 7810 ID-1) held at arm's length for customers requesting tailored sizing verification.
3. Explicitly decouple real-time visual alignment (which prioritizes 60 fps projective stability) from physical size recommendation (which communicates statistical sizing confidence).

### Consequences
- **Positive:** Scientifically grounded; zero user friction for casual try-on; high-accuracy option for bespoke tailoring; eliminates all fictitious Jacobian math and hardcoded priors.
- **Negative:** Sizing advice without user-stated height remains indicative rather than exact.

---

## ADR-012: Hybrid Kinematic Skinning + Localized Secondary XPBD Physics

### Context
Simulating entire garments using CPU XPBD is computationally impossible at 60 fps on consumer devices, forcing previous agents to restrict simulation to a coarse torso mesh and freeze sleeves.

### Decision
Adopt a hybrid deformation architecture:
1. **Primary Motion (90% of visual result):** Handled by GPU `SkinnedMesh` Linear Blend Skinning. Follows the user's skeletal joints instantaneously with zero latency.
2. **Secondary Motion (10% of visual result):** Handled by localized XPBD cloth physics confined to loose, hanging fabric (skirt hems, dress bottoms, jacket tails). Pinned vertices attach directly to the skinned mesh.

### Consequences
- **Positive:** Combines instantaneous responsiveness during movement with realistic gravitational sway and cloth inertia at hems; CPU physics budget capped at $\le 4\text{ ms}$.
- **Negative:** Tight-fitting garments (e.g. compression tops) do not exhibit cloth wrinkles; requires authored vertex weight maps in asset metadata.

---

## ADR-013: PostgreSQL ACID Concurrency & Deterministic Lock Ordering

### Context
In `backend/app/api/v1/endpoints/cart.py`, inventory concurrency is managed via an in-memory Python dictionary of asyncio locks (`_variant_locks`). In a multi-worker production environment (e.g., Gunicorn/Uvicorn), this provides zero cross-process isolation, leading to overselling under load.

### Decision
1. Replace in-memory locks with PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) inside an ACID database transaction.
2. Enforce **deterministic lock ordering** by sorting variant IDs alphabetically before acquiring locks to prevent database deadlocks:
   ```python
   stmt = select(Inventory).where(Inventory.variant_id.in_(sorted_variant_ids)).with_for_update()
   ```
3. Implement `X-Idempotency-Key` tracking and database unique constraints on payment webhook events and order submissions to prevent duplicate order generation.

### Consequences
- **Positive:** Guaranteed zero race conditions or overselling across unlimited worker processes and containers; robust transactional rollback.
- **Negative:** Requires tuning PostgreSQL connection pools (`DATABASE_POOL_SIZE: 20`) to handle peak checkout surges.

---

## ADR-014: E-Commerce Catalog 3D Garment Asset Schema & Storage

### Context
The backend database has no concept of 3D garments, rigging metadata, or GLB assets. The frontend currently matches catalog products to procedural garments via naive substring searches on product names.

### Decision
Introduce a dedicated `garment_assets` table linked via foreign key to `products`:
```sql
CREATE TABLE garment_assets (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) REFERENCES products(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    model_glb_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500) NOT NULL,
    rig_type VARCHAR(50) DEFAULT 'skinned_humanoid_v1',
    metadata_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
Garment GLB files and textures will be hosted on high-speed CDN object storage (S3 / Cloud Storage). The frontend Product Detail Page will query this relationship to dynamically present the "Try On in 3D AR" experience only when verified 3D assets exist.

### Consequences
- **Positive:** Full alignment between e-commerce catalog and virtual try-on; enables real 3D assets for coats, trousers, and dresses; clean architectural boundary.
- **Negative:** Requires running Alembic database migration `0006_ar_garment_assets.py`.

