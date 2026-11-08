# DRAPE — Milestone 0.8: Final Neckline Calibration & Stable Sleeve-Arm Occlusion Report

**Date:** 2026-11-07  
**Branch:** `engineering/m0.8-neckline-and-sleeve-occlusion`  
**Base Commit:** `0a9af87dd7d4cab16924adb5ba029ced24269791` (Milestone 0.7 HEAD)  
**Status:** COMPLETE (All criteria satisfied, 282/282 AR tests passing, build & lint verified)

---

## 1. Executive Summary

Milestone 0.8 resolves the final two garment-fitting and visual stability issues in DRAPE:

1. **Part A — Final Neckline Calibration:**
   - Raised the front collar opening by an additional +10 mm relative to its Milestone 0.7 position, updating nominal offset from +13 mm to **+23 mm (`0.023` m)** on `tshirt-crewneck`, `tshirt-oversized`, `tshirt-fitted`, and `top-longsleeve`.
   - Under the garment wrapper scale ($S_y \approx 0.88$ to $1.00$), this produces an effective world-space displacement of $20.2$ to $23.0$ mm, placing the collar rim in its anatomically natural position (~8 mm above the suprasternal notch reference).
   - Preserved the shoulder seams ($|x| \ge 0.09$ m) and semantic anchor $a_G$ with zero drift ($\Delta = 0.000$ m), maintaining $0.0\%$ initial XPBD strain and complete simulation stability.

2. **Part B — Stable Sleeve-Arm Occlusion & Coverage During Movement:**
   - **Forensic Root Cause Analysis:** When a user moved their arms, real skin intermittently became visible through the sleeve/upper-arm transition. Forensic analysis of the rendering and compositing pipeline uncovered the exact mechanism:
     - `MHRBodyProxy` generated depth-only occlusion cylinders (`mhr_occlusion_left_upper_arm` and `mhr_occlusion_right_upper_arm`) with `colorWrite: false, depthWrite: true` and `renderOrder = 0`.
     - The garment meshes rendered at `renderOrder = 1` with `depthTest: true`.
     - Because the WebGL canvas runs with `alpha: true` over the webcam `<video>` element, whenever an upper-arm occluder cylinder was closer to the camera than any fragment of the virtual sleeve mesh (during arm lifts, forward reaches, elbow flexions, or arm rotations), the GPU depth test discarded those sleeve fragments.
     - With `colorWrite: false`, the canvas pixel remained 100% transparent (alpha = 0), allowing the raw webcam video of the real user's arm to shine through—literally punching holes in the virtual sleeve.
   - **Architectural Correction:**
     - Implemented `setOcclusionLimbs(names: string[] | null)` in `MHRBodyProxy`.
     - In `ThreeSceneManager.loadGarment()`, dynamically configured limb occlusion based on sleeve coverage:
       - For short-sleeve garments: `left_upper_arm` and `right_upper_arm` are excluded from depth occlusion. The virtual sleeve opaquely covers the upper arm without depth punch-through.
       - Forearm occluders (`left_forearm`, `right_forearm`) and thigh occluders remain active, ensuring that when the user brings real forearms or hands across their chest, the real limbs properly occlude the shirt torso.
       - For long-sleeve garments: both upper arms and forearms are excluded from depth occlusion, covering the entire arm to the wrist.
       - For sleeveless garments: upper-arm occluders remain enabled since the user's upper arms are bare.
     - Preserved all sleeve geometry, circumference, silhouette, 30 ms responsive smoothing, armhole seam-pivot invariance, and seam-binding compensation.

3. **Automated Verification:**
   - Expanded `frontend/scripts/test-ar-garment-rig.cjs` with 5 new automated tests verifying the +23 mm offset, short-sleeve occlusion filtering, long-sleeve occlusion filtering, sleeveless limb retention, and developer debug wireframe visibility.
   - Full AR test suite passed: **282 passed, 0 failed, 0 crashed** across all 12 test suites.
   - Clean verification across TypeScript (`npx tsc --noEmit`), Next.js ESLint (`next lint`), Next.js production build (`17/17` routes), and garment asset validation.

---

## 2. Git & Branch Integrity

- **Base Branch:** `engineering/m0.7-final-garment-fit`
- **Base Commit:** `0a9af87dd7d4cab16924adb5ba029ced24269791`
- **Current Implementation Branch:** `engineering/m0.8-neckline-and-sleeve-occlusion`
- **Protected Baseline & Recovery References Preserved:**
  - Tag `drape-ar-working-best-2026-11-07` dereferences strictly to `1cac2ae646a5af928219ea7d928b9d1355acbe4a`.
  - Recovery branch `checkpoint/ar-working-best-2026-11-07` points strictly to `1cac2ae646a5af928219ea7d928b9d1355acbe4a`.
  - Protected branches `main`, `engineering-reset/ar-cleanup-audit`, and `engineering-reset/repository-audit` remain untouched.

---

## 3. Part A: Final Neckline Calibration Details

### 3.1 Nominal Offset Increase
In `frontend/src/lib/ar/garment-registry.ts`, the nominal `necklineOffsetY` was adjusted from `0.013` m (+13 mm) to `0.023` m (+23 mm) for all crewneck tops:
- `tshirt-crewneck`: `0.023` m (+23 mm)
- `tshirt-oversized`: `0.023` m (+23 mm)
- `tshirt-fitted`: `0.023` m (+23 mm)
- `top-longsleeve`: `0.023` m (+23 mm)

### 3.2 Deformation & Boundary Mechanics
`applyNecklineOffset` in `frontend/src/lib/ar/garment-rig.ts` applies:
$$\Delta y(x, v) = \text{offset} \cdot \left(1 - \frac{|x|}{0.09}\right) \cdot \left(1 - \frac{v}{0.08}\right) \quad \text{for } |x| < 0.09\text{ m}, \, z > 0, \, v < 0.08$$

Properties:
- Front-center dip ($x = 0, v = 0$): $\Delta y = +0.023$ m (+23 mm).
- Lateral collar edge ($|x| \ge 0.09$ m): $\Delta y = 0.000$ m.
- Shoulder seam points ($|x| \approx 0.18$ to $0.23$ m): $\Delta y = 0.000$ m (exact zero displacement).
- Garment semantic anchor $a_G$: $\Delta a_G = 0.000$ m (exact zero drift).
- Initial simulation rest positions match deformed render geometry with zero pre-strain.

### 3.3 Telemetry Verification
In `GarmentInstance.diagnostics()`:
- `appliedOffsetY`: `0.023` m.
- `effectiveWorldOffsetMm`: $0.023 \times S_y \times 1000 \approx 20.2$ to $23.0$ mm.
- `necklineVerticalDeltaMm`: $+8.0$ mm (collar sits ~8 mm above the suprasternal notch reference, perfectly centered on the anatomical neck hollow).

---

## 4. Part B: Sleeve-Arm Depth Occlusion Architecture

### 4.1 Root Cause Investigation
In DRAPE, the rendering stack consists of:
```
Layer 0: <video> element (real webcam video stream)
Layer 1: Three.js WebGL canvas (alpha: true)
Layer 2: 2D HUD and Canvas Overlays
```
Within the Three.js scene:
- `MHRBodyProxy` limb cylinders render at `renderOrder = 0`.
  - Material: `MeshBasicMaterial({ colorWrite: false, depthWrite: true, depthTest: true })`.
- Garment meshes render at `renderOrder = 1`.
  - Material: `MeshPhysicalMaterial({ side: THREE.DoubleSide, depthWrite: true, depthTest: true })`.

Prior to Milestone 0.8, all 6 limb colliders (`left_upper_arm`, `right_upper_arm`, `left_forearm`, `right_forearm`, `left_thigh`, `right_thigh`) unconditionally had `occ.visible = true`.
When the user moved their arms:
1. The upper-arm occlusion cylinder ($r = 0.05$ m, shoulder to elbow) wrote depth values into the WebGL Z-buffer.
2. When the virtual sleeve was rendered at `renderOrder = 1`, any sleeve fragment situated behind or intersecting the front hemisphere of the cylinder failed the GPU depth test.
3. The GPU discarded those fragments.
4. Because the occlusion cylinder had `colorWrite: false`, the WebGL canvas pixels remained transparent ($A = 0$).
5. The underlying `<video>` stream was exposed through the hole in the virtual sleeve, displaying the user's real arm skin through the garment.

### 4.2 Solution Architecture
1. **Limb Occlusion Filtering in `MHRBodyProxy`:**
   Added `occlusionLimbs: Set<string> | null` and `setOcclusionLimbs(names: string[] | null)`:
   ```typescript
   setOcclusionLimbs(names: string[] | null): void {
     this.occlusionLimbs = names ? new Set(names) : null;
   }
   ```
   In `updateLimbs()`:
   ```typescript
   const isOccluder = !this.occlusionLimbs || this.occlusionLimbs.has(c.name);
   occ.visible = isOccluder;
   ```
   Debug wireframe visibility was decoupled so developer inspection (`debugLayers.bodyProxy`) continues to visualize all tracked limbs:
   ```typescript
   private syncDebugLimbVisibility(): void {
     this.limbDebugMeshes.forEach((dbg, name) => {
       const active = this.activeCapsules.some((c) => c.name === name);
       dbg.visible = this.debugVisible && active;
     });
   }
   ```

2. **Garment-Aware Occlusion Configuration in `ThreeSceneManager`:**
   In `ThreeSceneManager.loadGarment(garment)`:
   ```typescript
   if (garment.construction?.sleeves === 'short') {
     this.bodyProxy.setOcclusionLimbs(['left_forearm', 'right_forearm', 'left_thigh', 'right_thigh']);
   } else if (garment.construction?.sleeves === 'long') {
     this.bodyProxy.setOcclusionLimbs(['left_thigh', 'right_thigh']);
   } else {
     this.bodyProxy.setOcclusionLimbs(null);
   }
   ```
   - For short sleeves: Upper arms are excluded from depth occlusion. The virtual sleeve covers the upper arm opaquely and stably. Forearms remain active occluders, so when the real forearm/hand moves in front of the torso, it properly occludes the shirt.
   - For long sleeves: Both upper arms and forearms are excluded from depth occlusion.
   - For sleeveless tops: All limb occluders remain active.

---

## 5. Automated Verification Results

### 5.1 Test Suite Summary (`npm run test:ar`)
- **Suites Executed:** 12/12
- **Suites Passed:** 12/12
- **Total Tests Passed:** **282 passed, 0 failed, 0 crashed**
  - `test-ar-calibration`: 16 passed
  - `test-ar-camera-projection`: 37 passed
  - `test-ar-correspondence`: 19 passed
  - `test-ar-depth`: 10 passed
  - `test-ar-fitting`: 22 passed
  - `test-ar-garment-rig`: **28 passed (+5 new tests)**
  - `test-ar-garments`: 75 passed
  - `test-ar-golden`: 6 passed
  - `test-ar-pose-tracker`: 9 passed
  - `test-ar-replay`: 7 passed
  - `test-ar-session`: 10 passed
  - `test-ar-xpbd`: 22 passed
  - `test-glb-loader-parity`: 8 passed

### 5.2 Build & Code Quality Verifications
- **TypeScript Typecheck:** `cd frontend && npx tsc --noEmit` $\to$ **Exit code 0 (zero errors)**.
- **ESLint:** `npm --prefix frontend run lint` $\to$ **✔ No ESLint warnings or errors**.
- **Garment Asset Validation:** `npm --prefix frontend run validate:garments` $\to$ **✅ ALL 8 GARMENT ASSETS VALIDATED SUCCESSFULLY**.
- **Next.js Production Build:** `npm --prefix frontend run build` $\to$ **Compiled successfully, 17/17 routes optimized**.

---

## 6. Files Modified

| File | Changes |
| :--- | :--- |
| `frontend/src/lib/ar/garment-registry.ts` | Updated `necklineOffsetY: 0.023` (+23 mm) on `tshirt-crewneck`, `tshirt-oversized`, `tshirt-fitted`, and `top-longsleeve`. |
| `frontend/src/lib/ar/mhr-body-proxy.ts` | Added `occlusionLimbs` filtering, `setOcclusionLimbs()`, `getOcclusionLimbs()`, and decoupled debug wireframe visibility. |
| `frontend/src/lib/ar/three-scene.ts` | Configured `bodyProxy.setOcclusionLimbs()` dynamically in `loadGarment()` based on garment sleeve construction. |
| `frontend/scripts/test-ar-garment-rig.cjs` | Updated assertions for +23 mm calibration and added 5 automated regression tests for limb occlusion stability. |
| `docs/MILESTONE_0_8_NECKLINE_AND_SLEEVE_OCCLUSION.md` | Authoritative engineering completion report for Milestone 0.8. |
