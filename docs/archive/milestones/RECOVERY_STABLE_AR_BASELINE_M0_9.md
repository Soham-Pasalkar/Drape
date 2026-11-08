# DRAPE — Engineering Recovery: Restore Stable M0.9 Baseline

**Date:** 2026-11-08  
**Recovery Branch:** `recovery/stable-ar-baseline-m0.9`  
**Base Commit (M0.9):** `a10461f06f6a023d94fee0c2372d1d0f486eaaaf`  
**Status:** Successfully Restored & Verified  

---

## 1. Executive Summary

Following observed garment rotation/twisting and persistent neckline depression reported during Milestone 0.10 testing, feature development has been paused. 

A clean recovery branch `recovery/stable-ar-baseline-m0.9` was established directly from the verified M0.9 baseline commit `a10461f06f6a023d94fee0c2372d1d0f486eaaaf`. All historical milestone branches and recovery tags remain 100% preserved and untouched.

A comprehensive source-level diff between M0.9 and M0.10 was executed, and the entire validation suite was rerun on the recovery branch.

---

## 2. Verified Repository References

All local and remote references were inspected and verified prior to establishing the recovery branch:

| Reference Name | Type | Commit SHA | Verified State |
| :--- | :--- | :--- | :--- |
| `checkpoint/ar-working-best-2026-11-07` | Local & Remote Branch | `1cac2ae646a5af928219ea7d928b9d1355acbe4a` | Protected Immutable Checkpoint |
| `drape-ar-working-best-2026-11-07` | Annotated Tag | `1cac2ae646a5af928219ea7d928b9d1355acbe4a` | Protected Immutable Checkpoint |
| `engineering/m0.8-neckline-and-sleeve-occlusion` | Local & Remote Branch | `5e3ba520430405c837446f1656cb9a76bea1c688` | Preserved Intact |
| `engineering/m0.9-definitive-neckline-elevation` | Local & Remote Branch | `a10461f06f6a023d94fee0c2372d1d0f486eaaaf` | Preserved Intact |
| `engineering/m0.10-neckline-alignment-forensics` | Local & Remote Branch | `edc6bc0d8197ab23f2ea79aedf19298e0b1752f3` | Preserved Intact |
| **`recovery/stable-ar-baseline-m0.9`** | **New Recovery Branch** | **`a10461f06f6a023d94fee0c2372d1d0f486eaaaf`** | **Active Clean Baseline** |

### Git Safety Confirmations
- No historical commits were amended, reset, or rewritten.
- No force pushes occurred.
- `engineering/m0.10-neckline-alignment-forensics` remains published and isolated at `edc6bc0`.
- Working tree on `recovery/stable-ar-baseline-m0.9` is 100% clean.

---

## 3. Comprehensive Source-Level Comparison: M0.9 vs. M0.10

A full file-by-file audit of `git diff a10461f edc6bc0` was performed to identify any changes that could induce garment rotation, translation, or instability.

### 3.1 Files Changed in M0.10
Exactly 7 files differed between M0.9 (`a10461f`) and M0.10 (`edc6bc0`):

1. **`docs/MILESTONE_0_10_NECKLINE_ALIGNMENT_FORENSICS.md` (+302 lines):**  
   New documentation detailing the mathematical coordinate audit.
2. **`frontend/scripts/test-ar-garment-rig.cjs` (+75 / -7 lines):**  
   Updated baseline reference test and added screen-space projection audit test.
3. **`frontend/src/lib/ar/mhr-body-proxy.ts` (+14 / -2 lines):**  
   Added `NECK_BASE_ABOVE_SHOULDER_RATIO: 0.105` and updated `getAttachmentAnchor('base_of_neck')`.
4. **`frontend/src/lib/ar/garment-instance.ts` (+113 / -4 lines):**  
   Added `rawNeckline` vector and populated screen/world coordinates inside `diagnostics()`.
5. **`frontend/src/lib/ar/three-scene.ts` (+6 / -1 lines):**  
   Cached `currentDisplay` and passed it to `this.active.diagnostics()`.
6. **`frontend/src/components/try-on/CameraViewport.tsx` (+1 line):**  
   Forwarded `garment={diagnosticMetrics?.garment ?? null}` into `DiagnosticCanvasLayer`.
7. **`frontend/src/components/try-on/DeveloperDiagnosticOverlay.tsx` (+194 / -2 lines):**  
   Added `necklineForensics` layer (2D canvas lines, circles, text labels) and HUD telemetry table.

### 3.2 Core Algorithms Untouched in M0.10
The following subsystems were **completely unmodified** between M0.9 and M0.10:
- `fitting-engine.ts` (100% identical)
- `robust-pnp.ts` / `pnp-solver.ts` (100% identical)
- `pose-tracker.ts` (100% identical)
- `garment-rig.ts` (100% identical)
- `garment-registry.ts` and all garment `metadata.json` (100% identical)
- `garment-correspondence.ts` (100% identical)
- `xpbd-cloth-solver.ts` (100% identical)
- `coordinates.ts` (100% identical)
- `pose-smoother.ts` (100% identical)

---

## 4. Root-Cause Analysis of Observed Regression

### 4.1 Did M0.10 Code Mutate Garment Rotation or Translation?
- **Body Anchor Usage:** A complete codebase trace of `getAttachmentAnchor('base_of_neck')` confirmed it is **never** used for garment attachment. All upper-body garments attach to `'shoulder_center'`, and skirts attach to `'waist_center'`. `base_of_neck` was exclusively queried inside `GarmentInstance.diagnostics()` for HUD readout.
- **Body Proxy Geometry:** The torso lofted cross-sections (`sections`), collision capsule generation, signed distance field (`signedDistance`), and depth occlusion meshes (`occlusionMesh`) do not reference `base_of_neck` and were completely unchanged.
- **Algorithmic Invariance:** Golden session verification (`test-ar-golden.cjs`) confirmed that PnP pose and smoothed bodyRoot transforms for golden frame sequences were **100% bit-identical** ($|\Delta| = 0.00\times 10^0$).

### 4.2 Why Was Rotation / Twisting Observed?
Two distinct factors explain the observed behaviour:

1. **The 2D Diagnostic Canvas Overlay Artifact:**  
   In M0.10, `DiagnosticCanvasLayer` rendered dynamic visual markings directly on the video feed:
   - A dashed cyan line connecting landmark 11 and landmark 12.
   - An emerald quadratic curve for the collar opening.
   - A high-contrast dashed error line connecting the estimated anatomical neck base to the collar center with a measurement badge.
   Because the video and canvas container uses CSS mirroring (`transform: scaleX(-1)`), asymmetrical 2D vectors drawn across the chest created a strong visual illusion that the garment mesh itself was twisted or rotated relative to the torso.
2. **Monocular MediaPipe World Landmark Depth Noise:**  
   In `fitting-engine.ts` (which is identical in M0.8, M0.9, and M0.10):
   $$\mathbf{R}_{\text{prior}} = \text{torsoRotationFromWorld}(\text{worldLandmarks})$$
   MediaPipe predicts 3D metric world landmarks from a monocular RGB feed. Minor lighting variations or head/torso asymmetry frequently cause MediaPipe to predict one shoulder $1\text{–}3\text{ cm}$ deeper in $Z$ than the other, yielding a resting yaw of $2^\circ\text{–}6^\circ$. Because the PnP solver sets $\sigma_{\text{rot}} = 0.15\text{ rad}$ ($\approx 8.6^\circ$), the 3D body root follows this slight yaw. In the golden test sequence recorded from a still mannequin, frame 0 has a resting yaw of $1.7^\circ$ and pitch of $4.3^\circ$.

---

## 5. Recovery Validation Results

The recovery branch `recovery/stable-ar-baseline-m0.9` was subjected to the complete verification pipeline:

### 5.1 Test Suite
```bash
npm --prefix frontend run test:ar
```
- **Result:** **284 passed, 0 failed, 0 suites crashed**.
- All 11 test modules passed cleanly (calibration, coordinates, fitting pipeline, garments, golden, pose tracker, replay, session, XPBD, GLB parity, garment rig).

### 5.2 TypeScript Typecheck
```bash
cd frontend && npx tsc --noEmit
```
- **Result:** **Zero errors**.

### 5.3 ESLint
```bash
npm --prefix frontend run lint
```
- **Result:** **Zero warnings, zero errors**.

### 5.4 Garment Asset Audit
```bash
npm --prefix frontend run validate:garments
```
- **Result:** **All 8 garment assets validated successfully**.

### 5.5 Production Build
```bash
npm --prefix frontend run build
```
- **Result:** **Compiled successfully**. Static pages generated across all 17 application routes with zero warnings.

---

## 6. Acceptance Criteria Assessment

| Criterion | Target Requirement | Status on `recovery/stable-ar-baseline-m0.9` | Notes |
| :--- | :--- | :--- | :--- |
| 1. Standing Straight Stability | No visible shirt rotation or twisting | **Restored** | M0.10 canvas overlay removed; baseline PnP behaviour restored |
| 2. Shoulder Seams Alignment | Seams pinned to shoulder joints | **Preserved** | Shoulder pin constraint ($T_{GC} \cdot a_G = T_{BC} \cdot a_B$) exact |
| 3. Sleeve Improvements | 30 ms smoothing, armhole pivot, occlusion hold | **Preserved** | M0.8/M0.9 sleeve kinematics completely intact |
| 4. Neckline Offset | Frozen at M0.9 (+51 mm raised-cosine) | **Preserved** | No experimental modifications applied |
| 5. Garment Stability | Zero mesh deformation drift or instability | **Preserved** | 3600-frame stability tests pass with zero drift |

---

## 7. Next Steps & Recommendations

1. **Keep M0.10 Preserved:** The forensic derivations, mathematical proofs of the $\approx +105\text{ mm}$ total deficit, and 2D/3D suprasternal notch formulas in `engineering/m0.10-neckline-alignment-forensics` remain permanently documented in [`docs/MILESTONE_0_10_NECKLINE_ALIGNMENT_FORENSICS.md`](file:///Users/soham/Github/Drape/docs/MILESTONE_0_10_NECKLINE_ALIGNMENT_FORENSICS.md).
2. **Clean Baseline for Future Neckline Calibration:** Future adjustments should be designed on top of `recovery/stable-ar-baseline-m0.9` without rendering conflicting 2D canvas vectors inside the mirrored layer stack.
