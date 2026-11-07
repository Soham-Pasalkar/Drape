# DRAPE AR Try-On — Requirements (Inception, gate G1)

Status: **APPROVED at G1** (2026-11-07, user: "approved G1" + amendments 1–4, applied below). Scope: the browser try-on (`/try-on`). Source: the engineering
decision in the user's AI-DLC brief (2026-11-07) and Phase 0 (`CODEBASE.md`). Phase-0 questions 1–8 resolved by
the user's reply "go" = recommended defaults (recorded in `STATE.md`).

Conventions: **MUST** = acceptance-tested; each requirement names its evidence (E: command, replay result,
screenshot). "Session" = a recording made with FR-18 in the user's own browser. "Settled frame" = a frame ≥ 0.5 s
after the last landmark moved > 20 px/frame. Targets marked *(provisional)* are re-confirmed at G3.

## 1. Functional requirements

### Camera and coordinates
| ID | Requirement | Acceptance criterion / evidence |
|---|---|---|
| FR-01 | Intrinsics K from a 65° HFOV prior on the *actual* `videoWidth/Height`; principal point at the source-frame centre; the object-fit: cover crop/scale is applied when mapping to the canvas. | 9-point test < 2 px for 16:9 video in 4:3, 16:9 and portrait containers (E: `npm run test:ar`). |
| FR-02 | Mirroring happens exactly once: CSS `scaleX(-1)` on the wrapper holding video + canvas(es); projection and landmark maths stay unmirrored. The mirror decision uses `track.getSettings().facingMode` when present. **Assumption A6:** desktop Safari (and some Chrome builds) do not report `facingMode`; the fallback is then the *requested* mode (`'user'` ⇒ mirrored), logged as `source: "requested-assumed"` (vs `"getSettings"`). | Session shows `mirror.source`; on-screen registration (FR-05) passes at far left and far right. |
| FR-03 | The displayed image is the frame the pose was inferred on (inferred frame drawn to a canvas via `requestVideoFrameCallback`), not the live `<video>`. A diagnostics toggle switches **live video ↔ inferred frame** so both are measurable; the active mode is recorded per frame. | Session in "inferred" mode: displayed-frame mediaTime == pose-frame mediaTime on 100 % of rendered frames; FR-05 error reported separately for both modes. |
| FR-04 | Every landmark used for pose is visible (≥ 0.5) **and** inside the frame (0 ≤ x,y ≤ 1 with a 2 % margin). | Replay unit test with off-frame hips at visibility 0.9: hips excluded; logged per frame. |
| FR-05 | Pixel registration: on-screen distance between each used 2D landmark and the projected 3D model keypoint, and between the garment anchor and the mid-shoulder point. | **< 8 px on settled frames** at centre, far left, far right, high, low, closer and farther in the user's Safari **and** Chrome sessions (E: replay report). |

### Pose and garment placement
| ID | Requirement | Acceptance criterion / evidence |
|---|---|---|
| FR-06 | Root pose by robust PnP (LM, Huber, temporal prior) on in-frame visible points; with hips unusable, shoulders + torso-length prior + world-landmark rotation ("bust mode"). | Replay: solve ≤ 2 ms p95; reprojection < 8 px on settled frames; bust mode active and FR-05 met in waist-cropped sessions. |
| FR-07 | Filtering: 1€ on translation, SO(3) slerp/1€ on rotation; one writer of the garment transform (`setPose`). | Grep: single writer; replay: max frame-to-frame root step < 0.25 m. |
| FR-08 | Garment anchored at the GLB-measured shoulder-seam / waist point; uniform scale only; no ad-hoc offsets. | Anchor dx,dy (FR-05) < 8 px; grep finds no `scaleMultipliers`/`yOffset` use. |
| FR-09 | Rigid slice correctness: right way round, follows translation and yaw, scales with distance, no growth over 60 s. | Replay: face probe = front; garment bbox(t=60 s)/bbox(t=0) within ±2 %; screenshots at 3 distances. |
| FR-10 | Framing gate: tops need shoulders in frame; skirts/dresses need hips and knees in frame and visible; otherwise "step back" and no garment of that category. Below ~0.45 m only "too close" (collar preview deferred). | Replay of cropped and full-body sessions shows correct gate per frame. |

### Body, fit, garments (later milestones)
| ID | Requirement | Acceptance criterion / evidence |
|---|---|---|
| FR-11 | Metric anchor (card with confirmed distance, user height, or iris); otherwise depth labelled "approximate" and no numeric body sizes shown. | Z within 5 % of tape at 0.8 m and 1.6 m *(provisional)*. |
| FR-12 | Body widths from segmentation-mask scanlines with the tangent-ray correction; no invented ratios; no hand-typed Jacobian. | Circumference within ±4 cm of tape *(provisional)*; grep: ratio constants removed. |
| FR-13 | Ease/strain shown only as a sizing indicator and only when FR-11 + FR-12 inputs exist. | UI test: no fit label without an anchor. |
| FR-14 | Depth-only body occluder (arms in front hide the garment). | Session screenshot: arm in front of chest hides garment. |
| FR-15 | Immutable rest geometry; deformation and cloth (loose regions only, Web Worker) never accumulate. | Replay: idempotence (fit N× == 1×), bbox stability as FR-09. |

### Honesty, tooling
| ID | Requirement | Acceptance criterion / evidence |
|---|---|---|
| FR-16 | The UI shows only computed values; tracking % = mean visibility of the used landmarks; features not yet built have no UI. | UI review checklist; grep for removed panels. |
| FR-17 | Debug probes (axes/F gizmo, face colours, mid-grey, registration dots + readout) remain available behind the diagnostics toggle. | Screenshot. |
| FR-18 | **Session recording** (opt-in, local only): per frame — landmarks with visibility, world landmarks, video/container sizes, DPR, mirror decision + source, pose, PnP keypoints, registration errors, user agent; optional composite PNGs (downscaled to 320 px wide, opt-in). Export as a downloadable file; never uploaded. The file contains no account data, cookies, tokens, names, e-mail or location; the only device identifier is the user agent. | Recorded file validates against a schema; network check (NFR-03) during recording. |
| FR-19 | **Replay**: drives the same pipeline (fitting → scene maths) offline in Node/test from a session file and reports FR-05/06/07/09 metrics. | `npm run test:ar` includes ≥ 1 user session; replay reproduces the recorded registration numbers within 1 px. |

## 2. Non-functional requirements
| ID | Requirement | Acceptance criterion |
|---|---|---|
| NFR-01 | Browsers: desktop Safari 17+ and Chrome 120+ on macOS. Mobile out of scope until re-planned. | Sessions from both. |
| NFR-02 | Performance *(provisional)*: render ≥ 30 FPS p50; pose inference ≥ 15 FPS; PnP ≤ 2 ms p95; garment update ≤ 5 ms p95 on the user's laptop. | Session metrics. |
| NFR-03 | Privacy: camera frames, landmarks and session files never leave the device. | DevTools/CDP network log during a session shows no request carrying frame/landmark data (only static same-origin assets). |
| NFR-04 | Permission handling: denied / not found / in use / WebGL unavailable each produce a clear message and full teardown. | Manual test per case (screenshots). |
| NFR-05 | Supply chain: model files have a recorded source URL, version and SHA-256, verified by a script; dependency versions pinned (exact) for AR packages. | Script output; `package.json` diff. |
| NFR-06 | Quality gates: `tsc`, `lint`, `test:ar` at every commit; `build` per milestone; a CI workflow runs them. | CI run green. |
| NFR-07 | Rollback: each milestone ends at a tag; tags `pre-cleanup-head`/`pre-cleanup-wt` stay. | `git tag`. |

## 3. Assumptions
A1 Laptop webcam with no metric depth; A2 user stands 0.6–2.5 m away, often cropped at waist/knees; A3 MediaPipe
`pose_landmarker_lite` now, `full` evaluated in M2 (decision 8); A4 the 8 procedural garments are placeholders;
A5 recordings are made by the user and shared deliberately; A6 see FR-02 (facingMode fallback).

## 4. Non-goals
Photoreal (diffusion) try-on; server-side inference; mobile browsers (for now); pattern-based garment authoring
(content work, out of engineering scope); licensed body model before a licence review; physical fit/comfort
prediction; collar/neckline mode (deferred).

## 5. Risks feeding G2
R1 Safari differences (rVFC, getSettings, object-cover) — mitigated by FR-02/03 + sessions; R2 MediaPipe reports
off-frame landmarks as visible — FR-04; R3 drawing inferred frames adds latency — measure in NFR-02;
R4 main-thread contention (ADR-004) — decision deferred to after M3 (decision 4), revisit if NFR-02 fails.
