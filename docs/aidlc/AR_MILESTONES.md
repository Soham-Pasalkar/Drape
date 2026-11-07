# DRAPE AR Try-On — Milestone Plan (gate G3)

Status: **DRAFT — awaiting G3 approval**. Order per G1/G2 amendments: **M1 first**. One milestone in progress at a
time; each ends at a tag (`ar-m<N>`) and a gate where the user approves the next one. Every milestone keeps
`tsc`, `lint`, `test:ar` green per commit and `build` green at its end.

## M1 — Session recording + replay (FR-18, FR-19, FR-02, NFR-03)
| Task | Content |
|---|---|
| T1 | `camera.ts`: report `getSettings()` subset + mirror `{value, source}` (A6). |
| T2 | Extract `pipeline/pose-smoother.ts` from `three-scene.setPose`; scene delegates (behaviour-identical, unit test). |
| T3 | Extract `debug/registration.ts` (pure metrics) from the component. |
| T4 | Extract `pipeline/frame-step.ts` (smoother → fitting → pose smoother → registration); live loop calls it. |
| T5 | `session/schema.ts` (v1, incl. render geometry: canvas client/buffer size, drawing buffer, renderer pixelRatio, DPR, wrapper computed transform, video object-fit/position) + validator. |
| T6 | `session/recorder.ts` + HUD: ● Record / ■ Stop & save, timer, snapshot checkbox (off), hotkeys 1–8 ignored in inputs, auto-stop 120 s; composite snapshots captured right after `renderer.render()`. |
| T7 | `scripts/replay-session.cjs` + `test-ar-replay.cjs`: per-position report, `|replay − recorded| ≤ 1 px`. |
| T8 | Privacy check: CDP network log during a headless recording. |

**Acceptance (evidence):** (a) a headless rig session (moving fake video, incl. a waist-cropped segment) produces a
file that passes the validator — command output; (b) replay of that file reproduces recorded registration within
1 px — test output; (c) no request carries frame/landmark data during recording — network log summary; (d) tsc,
lint, test:ar, build green — outputs; (e) user receives the recording instructions below.
**After the user's Safari + Chrome sessions arrive (closes M1):** I state explicitly, with the replay table, whether
replay **reproduces the symptom** (garment offset or low when moving / cropped at the waist).
- If **yes**: the cause is in the pose/fitting maths → M2 targets it with replay as the test.
- If **no** (replay registration < 8 px while the user saw misregistration): the cause is in the **display layer**
  (video/canvas presentation, CSS, compositor timing, Safari object-fit). Next probe: compare the recorded composite
  snapshots against replay-predicted dot positions, and record with the live ↔ inferred toggle in both modes (FR-03).

**User recording protocol (sent when M1 is tagged):**
1. `cd frontend && git checkout ar-cleanup`, stop any running dev server, then `npm run dev`.
2. Open `http://localhost:3000/try-on` in **Safari**; click **Activate Camera & Try-On**; stand ~1.5 m back; press **D**.
3. Tick **include snapshots**; click **● Record**. Hold each position ~5 s, pressing its key on arrival:
   **1** centre · **2** far left · **3** far right · **4** high · **5** low · **6** closer (~0.8 m) ·
   **7** farther (~2.2 m) · **8** hips out of frame (cropped at the waist). Then **■ Stop & save** (~45 s total).
4. Repeat in **Chrome**. Share both downloaded `drape-session-*.json` files.

## M2 — Fix the real misregistration (FR-01…FR-06, NFR-05, NFR-06)
Root-cause with replay of the user's sessions; fix only confirmed causes, one commit each. Candidates in priority:
landmark gate (visible ∧ in-frame) + bust mode; inferred-frame presenter with toggle; display-layer fixes if M1 says
so; evaluate `pose_landmarker_full` against the sessions. Tooling: CI workflow, `models.lock.json` + verify script
(source URL to be established), exact pins for AR deps.
**Acceptance:** FR-05 < 8 px on settled frames at all 8 positions in **new** Safari and Chrome sessions recorded on
the fixed build (replay table + composite snapshots); CI green.

## M3 — Clean rigid slice + UI honesty (FR-07…FR-10, FR-16, FR-17)
Remove from the render path and archive (`lib/ar/_archive/`): body-shape ratios, ease/fit UI, operating-mode badges,
lighting estimator, skinning stub; split the 1050-line component. **Acceptance:** replay: face probe front, bbox
t=60 s vs t=0 within ±2 %, translation/yaw/scale follow; UI shows no uncomputed number (checklist + screenshots).

## M4–M7 (detail at their own gates; may be re-planned)
M4 depth anchor (FR-11: Z within 5 % of tape at 0.8/1.6 m) · M5 occlusion + mask widths with `full` model (FR-12,
FR-14) · M6 deformation + loose-region cloth in a Worker (FR-15) · M7 compositing and video lighting.

## Operations (G5)
Regression = `test:ar` incl. ≥ 1 user session per browser; performance budget NFR-02 from sessions; privacy check
NFR-03 per release; rollback via `pre-cleanup-*` and `ar-m<N>` tags.

## Risks
User sessions are the gating input for closing M1 and for M2 (calendar risk, not engineering); Safari quirks may need
multiple session rounds; procedural garments limit visual realism regardless of registration (asset work, non-goal).
