# DRAPE AR Try-On — Architecture (gate G2)

Status: **DRAFT — awaiting G2 approval** (lens review done; fixes applied). Implements `AR_REQUIREMENTS.md` (approved G1). Brownfield: changes are
incremental extractions from today's code (`CODEBASE.md` §3), not a rewrite. Each item names the requirement it serves.

## 1. Principles
1. **One per-frame pipeline, two drivers.** A pure step `processPoseFrame(state, input) → output` (no DOM, no WebGL)
   is called by the live loop *and* by Node replay, so replay numbers are the live numbers (FR-19).
2. **Record inputs, recompute outputs.** Sessions store raw inputs (landmarks, timestamps, sizes, mirror) plus the
   live outputs; replay recomputes outputs and diffs them (≤ 1 px).
3. Mirroring once (CSS); all maths unmirrored; everything that differs per browser is *logged*, not assumed.

## 2. Module changes (M1 first)

| Module (new / changed) | Responsibility | Req |
|---|---|---|
| `lib/ar/pipeline/frame-step.ts` (new) | Extracted from `VirtualTryOnExperience.tsx`: smoother → fitting engine → `PoseSmoother` → registration metrics. Pure. | FR-19 |
| `lib/ar/pipeline/pose-smoother.ts` (new) | The `setPose` easing maths (snap/lerp/slerp) as a pure class; `three-scene.setPose` delegates to it. | FR-07 |
| `lib/ar/debug/registration.ts` (new) | Pure registration metrics (keypoint and anchor errors, screen px after flip) — moved out of the component. | FR-05 |
| `lib/ar/session/schema.ts` (new) | Session v1 types + runtime validator. | FR-18 |
| `lib/ar/session/recorder.ts` (new) | In-memory ring (≤ 120 s), opt-in PNGs, export as a Blob download. No network. | FR-18, NFR-03 |
| `scripts/replay-session.cjs` + `test-ar-replay.cjs` (new) | Node replay of a session file → report per position + diff vs recorded. | FR-19 |
| `lib/ar/camera.ts` (changed) | Expose `getSettings()` subset and mirror `{value, source}`. | FR-02 |
| `lib/ar/pipeline/landmark-gate.ts` (new, M2) | Visible ∧ in-frame (2 % margin) gating before PnP and proportions. | FR-04, FR-06 |
| `lib/ar/render/frame-presenter.ts` (new, M2) | Draws the inferred video frame to a canvas in the layer stack; toggle live ↔ inferred. | FR-03 |
| `components/try-on/*` | UI only; the loop calls `frame-step`. Record button lives in the diagnostics HUD. | FR-16 |

Untouched in M1–M2: garment instance, deformation, XPBD, body proxy, backend, non-AR UI.

## 3. Session file v1 (JSON, one file per recording)
```
header: { schema: "drape-ar-session/1", createdAt, appCommit, userAgent, modelId, poseOptions,
          trackSettings: { width, height, frameRate, facingMode|null },   // deviceId/groupId never recorded
          mirror: { value: bool, source: "getSettings"|"requested-assumed" }, garmentId, calibration: K }
frames[]: { t: perf.now ms, mediaTime, video: {w,h}, container: {w,h}, dpr, displayMode: "live"|"inferred",
            presentedMediaTime, raw: [33 × {x,y,z,v,p}], world: [33 × {x,y,z,v}],
            out: { pose{pos,quat,valid,reason,reprojPx,usedPoints[]}, pnpKeypointsCam{4},
                   smoothedRoot{pos,quat}, registration{err{4}, anchorDxDy, midShoulder}, distance{z,mode},
                   timings{inferMs,fitMs,renderMs} } }
images[] (opt-in): { frameIndex, png: data-URL, 320 px wide composite } — max 1 per second
```
Size ≈ 3 KB/frame → ~5 MB per 60 s at 30 fps (+ ≈ 3.6 MB/min with images). Contains no account data, cookies,
tokens, names, e-mail or location; no device id. Created only after an explicit click; download via object URL.

## 4. Replay
Node loads the session, rebuilds `K` and the display transform from the recorded sizes, feeds `raw`/`world` with
recorded timestamps through `frame-step`, and computes registration with the same projection
(`buildProjectionMatrix` + `Vector3.project`); the garment anchor comes from the same GLB loaded with the
Node loader and the same `GarmentInstance` hierarchy. Output: per-position table (centre, far L/R, high, low, closer,
farther, hips-out) of settled-frame errors, gate decisions, solve time, plus `|replay − recorded| ≤ 1 px` assertion.
Positions are labelled by the user via hotkeys during recording (§5), not inferred.

## 5. Recording UX (diagnostics HUD)
`● Record` / `■ Stop & save` buttons, an elapsed timer, a "include snapshots" checkbox (off by default) and
position hotkeys **1–8** (centre, far left, far right, high, low, closer, farther, hips out of frame) that stamp the
current segment into the file. Recording auto-stops at 120 s.

## 6. Cross-cutting
- **Privacy (NFR-03):** recorder has no network path; verified with a CDP network log during a recording in M1.
- **Supply chain (NFR-05):** `scripts/verify-models.cjs` checks SHA-256 of `public/models/*` against `models.lock.json`
  (source URL, version, hash); AR deps pinned exactly. Source URL of the current lite model: **unknown — to verify in M0**.
- **CI (NFR-06):** `.github/workflows/frontend-ar.yml` (tsc, lint, test:ar, build) — GitHub Actions assumed.
- **ADR-008** (amends ADR-004): pose inference stays on the main thread until after M3; revisit if NFR-02 fails.

## 7. Risks / open
FR-03 adds up to one inference interval of latency (measured, both modes recorded); Safari may not support
`requestVideoFrameCallback` in older versions (fallback logged); replay determinism depends on recorded timestamps
(the 1€ filter is time-based — recorded `t` is used verbatim).
