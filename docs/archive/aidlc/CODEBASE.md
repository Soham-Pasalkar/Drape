# DRAPE — Codebase Understanding (Phase 0, AR try-on focus)

Branch `ar-cleanup` @ `0cc7bec` · written 2026-11-07 · mode: manual AI-DLC (no ai-dlc skill installed).
Evidence key: **[run]** = command executed this session with real output · **[code]** = read from source, not
runtime-verified · **[unverified]** = claim from earlier sessions, not re-checked.

## 1. Repository at a glance

| Area | What it is | Connection to try-on |
|---|---|---|
| `backend/` | FastAPI modular monolith (auth, cart, checkout, orders, payments, products, users, wardrobe), Alembic, 95 pytest tests | None. AR runs fully client-side; the only AR network fetch is same-origin static `simulation-data.json` (`three-scene.ts:225`) [code] |
| `frontend/src/app/*` | Next.js 14 App Router pages (shop, cart, checkout, account, wardrobe, `try-on`) | `/try-on/page.tsx` dynamically imports `VirtualTryOnExperience` (ssr: false) |
| `frontend/src/components/*` | Site UI; `VirtualTryOnPreview.tsx` is a marketing card (no AR imports) | Links to `/try-on` only |
| `frontend/src/lib/ar/` | AR engine (24 files incl. `debug/`) | The runtime pipeline |
| `frontend/src/components/try-on/` | Try-on UI (5 components) | Hosts video/canvas, HUD, controls |
| `frontend/scripts/` | Garment generator, asset validator, AR test suites + runner, Node GLB loader | Tests compile `lib/ar/*.ts` (not `debug/`, `three-scene`, `pose-tracker`) |
| `frontend/public/garments/` | 8 procedural garments: `model.glb`, `metadata.json`, `simulation-data.json`, thumbnail (108–256 KB each) | Loaded at runtime |
| `frontend/public/models`, `public/wasm` | `pose_landmarker_lite.task` (6.4 MB, sha256 `59929e1d…`), MediaPipe WASM (byte-identical to npm `@mediapipe/tasks-vision` 1.2.2) | Pose inference |
| `docs/aidlc`, `docs/architecture` (ADR-001…007), `docs/research` | Earlier planning artifacts from other agents | ADR-004 says pose runs in a **Web Worker**; code runs it on the main thread (divergence) |
| CI | **None** (no `.github/`) | Gates are local only |

## 2. Module map (`frontend/src/lib/ar`, `components/try-on`)

All files below except those marked *dead* are reachable from `app/try-on/page.tsx` at runtime [code: importer grep].

| File (lines) | Purpose / key exports | Runtime |
|---|---|---|
| `camera.ts` (112) | `CameraManager.startCamera` → `getUserMedia` 1280×720 ideal, `facingMode` | yes |
| `coordinates.ts` (243) | display transform (object-fit), image↔display↔NDC, pinhole, `buildProjectionMatrix` | yes |
| `camera-calibration.ts` (178) | intrinsics K (65° HFOV prior, card), version counter | yes |
| `distance-estimator.ts` (290) | shoulder-span Z(t)=Z0·S0/S, auto reference, modes | yes |
| `pose-tracker.ts` (269) | MediaPipe PoseLandmarker (lite, GPU→CPU), rVFC scheduling, stats | yes (main thread) |
| `landmark-smoother.ts` (233) / `one-euro-filter.ts` (254) | 1€ filters on image + world landmarks, `BodyKeypoints` | yes |
| `fitting-engine.ts` (438) | per pose frame: span, yaw, distance, proportions, measurements, ease, PnP, limbs, framing | yes |
| `robust-pnp.ts` (328) | LM + Huber (δ 8 px, 10 it), rotation/depth/temporal priors | yes |
| `personalized-body-shape.ts` (262) | measurements from fixed anthropometric ratios; `solveShapeParameters` + hand-typed Jacobian | ratios yes; **solver dead** |
| `garment-ease.ts` (171), `operating-modes.ts` (134) | ease/strain verdict; framing mode/guidance | yes |
| `mhr-body-proxy.ts` (457) | ellipse-stack torso + capsules: occluder, SDF, correspondence surface | yes |
| `garment-registry.ts` (442) | catalogue metadata (`scaleMultipliers`/`yOffset` fields **never read**) | yes |
| `garment-rig.ts` (301) | anchor from GLB geometry, rest transforms, sleeve articulation | yes |
| `garment-instance.ts` (685) | hierarchy wrapper(a_B,S)→anchorGroup(−a_G)→GLB; deformation; XPBD binding; diagnostics | yes |
| `garment-correspondence.ts` (630) | BVH nearest triangle, push-out deformer, seam normal weld | yes |
| `xpbd-cloth-solver.ts` (484) | XPBD on the whole body panel (not only loose regions), main thread | yes |
| `three-scene.ts` (588) | renderer, projection, `setPose()` (single writer), garment load, Stage-1/1b probes | yes |
| `fabric-materials.ts` (108) | MeshPhysical + sheen + procedural normal map, DoubleSide | yes |
| `environmental-lighting.ts` (104) | video-driven lights | **dead since 7ab407d** (call removed) |
| `skeletal-skinning.ts` (189) | LBS weights | **dead** (no importer) |
| `debug/stage1-probe.ts` (139) | axes+F gizmo, face-colour/mid-grey materials, orientation & pixel probes | yes (debug) |
| `types.ts` (311) | shared types | yes |
| `VirtualTryOnExperience.tsx` (1050) | page + **render/tracking loop + diagnostics assembly** (maths in a component) | yes |
| `CameraViewport.tsx` (287) | mirrored layer stack (video, WebGL, 2D canvases), skeleton | yes |
| `DeveloperDiagnosticOverlay.tsx` (469) | HUD + 2D registration canvas | yes (debug) |
| `TrackingStatusBanner.tsx` (190), `GarmentSelector.tsx` (129) | status pills, garment picker | yes |

## 3. Runtime path of one frame [code]

1. `VirtualTryOnExperience.tsx:397` → `camera.ts:40` `getUserMedia({facingMode:'user', 1280×720 ideal})`; aspect from `videoWidth` (falls back to 1280×720 if 0, `camera.ts:55`).
2. **Mirror decision**: `camera.ts:28` stores the *requested* facingMode; `VirtualTryOnExperience.tsx:400,705` → `isMirrored = facingMode==='user'`. **`track.getSettings()` is never consulted.**
3. Display: `CameraViewport.tsx:163` container `aspectRatio` = camera aspect; single CSS `scaleX(-1)` wrapper holds `<video object-cover, objectPosition 50% 50%>`, WebGL div, 2D canvases.
4. Container size via `ResizeObserver` (`VirtualTryOnExperience.tsx:170`); per rAF: `computeVideoDisplayTransform(vW,vH,cw,ch,'cover')` (:444) → `setProjection(K, display)` (:451) → `buildProjectionMatrix` (`three-scene.ts:212`). Renderer DPR capped at 2 (`three-scene.ts:167`).
5. Pose: `startTracking` (:382) → rVFC schedules `detectForVideo` on the **main thread**; model `pose_landmarker_lite` (`pose-tracker.ts:70`), GPU delegate, conf 0.5, **no segmentation** (:76). The **live `<video>` is displayed, not the inferred frame** → pose lags the image during motion.
6. `landmark-smoother.ts`: 1€ (fMin 1.2, β 0.015); frame rejected only if a **shoulder** visibility < 0.35 (:97). **No in-frame check on any landmark.**
7. `fitting-engine.processFrame` (:459 call): span (:211) → distance (:230) → proportions from **hips if visibility ≥ 0.5** (:243, threshold :52) → measurements from fixed ratios (:247) → ease (:267) → PnP with L/R shoulder + **L/R hip weighted by visibility only** (:285, `MIN_WEIGHT` 0.5) → rotation prior from world landmarks (:288) → limb directions (:324) → limb joints re-projected through observed pixels (:375) → framing (:382).
8. `three-scene.setFrameTarget` (:461 call) stores target; `render` → `setPose()` (`three-scene.ts:452`, the only bodyRoot writer, call :488) → `garmentInstance.update` (:506) → deformation rebuild on change (`garment-instance.ts:461`) → XPBD step (:481) → `renderer.render` (`three-scene.ts:520`).
9. HUD at 10 Hz from `buildDiagnostics` in the component.

## 4. Conventions actually used [code + run]

Camera space +X right, +Y up, −Z forward; image u right, v down, unmirrored; projection unmirrored, mirror = one CSS flip; body-local origin = torso centre, +X wearer's left, +Z out of chest; garment-local = GLB root, front +Z (GLB: 99.5–100 % CCW-outward triangles [run, Stage 1]). Anchors: shoulder-seam midpoint (tops/dress), waistband top ring (skirts), computed from geometry.

## 5. Known defects and risks (with evidence level)

| # | Finding | Evidence |
|---|---|---|
| D1 | No in-frame gating: off-frame hips with visibility ≥ 0.5 enter PnP and the torso-length ratio — matches "garment low / offset when cropped at waist" | [code] only; not reproduced (rig always had hips in frame) |
| D2 | Displayed video ≠ inferred frame → garment trails body during motion (25–34 px raw lag measured after a 620 px jump) | [run, Stage 1b fake video] |
| D3 | Mirror decided from requested facingMode, not `getSettings()` | [code]; Safari behaviour **unverified** |
| D4 | Safari never tested (object-cover, DPR, rVFC, getSettings) | not run |
| D5 | Garment pose shown at user-reported wrong place in Safari/Chrome live | user recording; **not reproduced on ar-cleanup**; cause unknown |
| D6 | Measurements from invented ratios; hand-typed Jacobian (dead) | [code] `personalized-body-shape.ts:17-23,48` |
| D7 | Fit verdict / strain shown in UI from prior-based numbers (labelled "indicative") | [code] |
| D8 | XPBD and pose on main thread; ADR-004 requires a Worker | [code] |
| D9 | Rigid sleeves pivot 3.7 cm inside the shoulder seam; wing-like look | [run, GLB dump] |
| D10 | Dependencies caret-ranged (`tasks-vision ^1.2.2`, `three ^0.187.0`); lockfile pins; model file has no recorded source/checksum check | [run] |
| D11 | Dead code: `skeletal-skinning.ts`, `environmental-lighting.ts`, `solveShapeParameters`, registry `scaleMultipliers/yOffset` | [code] |
| D12 | Maths lives in `VirtualTryOnExperience.tsx` (1050 lines) | [code] |

## 6. Build / test commands [run 2026-11-07]

| Command (dir) | Result |
|---|---|
| `npx tsc --noEmit -p .` (frontend) | exit 0 |
| `npx next lint` (frontend) | no warnings or errors |
| `npm run test:ar` (frontend) | 227 passed, 0 failed (7 suites) — **unit/synthetic only; no live-camera coverage** |
| `npm run build` (frontend) | compiled, 17/17 static pages |
| `.venv/bin/pytest -q` (backend) | 95 passed |

## 7. Unknowns

What browser/build produced the user's recordings; Safari `videoWidth` timing, `getSettings().facingMode` and object-cover behaviour; MediaPipe visibility values for off-frame landmarks on a waist-cropped user; real inference latency on the user's laptop; whether the network stays silent at runtime (not checked).
