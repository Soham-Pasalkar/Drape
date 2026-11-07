# AI-DLC State — DRAPE AR try-on (manual mode)

| Field | Value |
|---|---|
| Mode | Manual AI-DLC (ai-dlc-engineering skill not installed), tier 2, brownfield |
| Branch / commit | `ar-cleanup` (recording build tag `ar-m1-rec`) |
| Rollback tags | `pre-cleanup-head` (736b542), `pre-cleanup-wt` (e2ffa3e) |
| Current phase | Phase 2 — Construction, M1 (session recording + replay) |
| Status | Waiver in force: implementing the user's depth/garment-follow fix list (no baseline, no gate) |
| Gates | G1 approved · G2 approved · G3 approved |
| Milestone in progress | M1 |

## Approval log
- 2026-11-07 — Phase 0 → Inception. User: "go". Interpreted as accepting the recommended defaults for
  Phase-0 questions 1–8 (local-only recordings; opt-in 320 px PNGs; macOS Safari 17+/Chrome 120+; Worker deferred
  to after M3; bust mode when hips unusable; display the inferred frame; minimal CI in M0; evaluate `full` model in M2).

- 2026-11-07 — G1. User: "approved G1" with amendments: "(1) renumber FR IDs or explain FR-18/19; (2) FR-02: note
  that desktop Safari may not report facingMode, so the fallback to the requested mode is an explicit assumption, logged
  with its source; (3) FR-03: add a diagnostics toggle (live video vs inferred frame) so both can be measured; (4) keep
  G2 and G3 short (<= 2 pages each) and put "M1 = session recording + replay" first". Applied: FR-20/21 → FR-18/19;
  FR-02 assumption A6; FR-03 toggle; G2 ≤ 2 pages with M1 first.
- 2026-11-07 — G2. User: "approved G2" with amendments: "(1) session header/frames must also record the real
  rendering geometry …; (2) snapshots are composites of the displayed video frame plus the WebGL canvas captured in the
  same tick as the render …; (3) at the end of M1 state explicitly whether the replay reproduces my symptom …;
  (4) ignore hotkeys 1-8 when focus is in an input; (5) the recording instructions say `git checkout ar-cleanup` and
  restart `npm run dev`, not `git pull`. Keep G3 under 2 pages." Applied: 1, 2, 4 in AR_ARCHITECTURE.md; 3, 5 in
  AR_MILESTONES.md (M1 acceptance + protocol); ADR-008 status → Accepted.
- 2026-11-07 — G3. User: "approved G3" with amendments: "(1) T2-T4 refactors must be proven behaviour-identical
  with a golden test … assert identical pose, anchor and registration numbers (< 1e-6) before the refactor is accepted;
  (2) the Safari and Chrome sessions recorded on the unmodified M1 build are the BASELINE: store them in
  docs/aidlc/sessions/ …". Applied: T1b + T4b; baseline path `docs/aidlc/sessions/baseline/`. "Start M1 now … Do not start M2."

## M1 evidence log (2026-11-07)
- Golden: tag `m1-pre-refactor` (7e225ef; golden file committed in f845779 — that single commit fails test-ar-golden by
  construction); T2/T3/T4 golden max|Δ| = 0.
- Rig session `docs/aidlc/sessions/rig/drape-session-chrome-…json` (headless Chrome, fake photo video, NOT live):
  validator 0 errors; replay |Δ| 0.0000 px; 0 network requests during recording.
- Rig observations for M2 (not acted on): MediaPipe reports off-frame hips visible (6/15 hips_out frames) and PnP uses
  them; fast approach → distance/root lag (frame 141 root z −3.02 m while subject close) and garment not drawn while
  anchor/gizmo correct; settled-frame rule (20 px/frame) is too loose at 10 fps.

- 2026-11-07 — User evidence (Safari live recording): (1) garment size constant at 0.8 m and 2.2 m, (2) stays near
  centre when moving left, (3) "CALIBRATING DISTANCE" never completes, (4) sleeves detached. User: "Within M1 (no fixes
  yet), add logging … Until then do not start M2." Done in f7774f0 (+ rig session). Synthetic motion assertions pass
  (Z ×1.99, width ×0.46, anchor −299.8 px vs subject −299.7 px) ⇒ symptoms NOT reproduced on synthetic input.
- Observed: a next-server from this working tree (started 11:34, Safari connected) was running; the user's live
  sessions therefore likely ran ar-cleanup code. Dev-mode `appCommit` is read at server start (stale after HMR).

## Waivers
- 2026-11-07 — kind=waiver. User: "user waives baseline session recordings and gate ceremony for this fix; risk: no
  baseline to compare against." Scope: the depth/garment-follow fix (items 1–7 of the user's 2026-11-07 fix list).
  Consequences accepted: M1 closes without baseline sessions; M2-style fixes proceed without a gate; acceptance is an
  ADVERSARIAL synthetic test + the user's live check (Copy debug report). Intended behaviour changes re-baseline the
  golden/refactor test and limit committed-session replay to sessions recorded with the same pipeline version.

## Notes (out of scope for the current phase)
- ADR-004 (pose in a Web Worker) diverges from the code; deferred to after M3 (decision 4) — needs an ADR amendment at G2.
- Lens review open items for G2: latency cost of FR-03; CI host choice (GitHub Actions assumed); model source URL for NFR-05.

## 2026-11-07 — fix item 6 (adversarial test) — NOT committed, test:ar red (1 assertion)
- 3 attempts made (rule 5 stop). Passing: mode never blocks, width 1.060–1.149, anchor max 6.8 px, seam gap 0.26 cm, bust mode.
- Failing: Z ratio max 1.193 (limit 1.15) on 4 frames during fast approaches (t 7.07–7.10, 9.30–9.33); the instant estimate itself is +12–16 %, because the smoothed shoulder span lags the real one.
- Options: (a) depth from the raw (unfiltered) span plus the Z 1€ filter; (b) predict span velocity; (c) accept ±20 % during approaches faster than 1.5 m/s.

### DECISION (user approved 2026-11-07): Z assertion split — option 3
- test-ar-motion 2a: Z within ±15 % on ≥ 95 % of frames (measured 98.6 %); 2b: within ±20 % on every frame (max 1.193).
- Frames with true approach speed > 1.5 m/s are reported separately: 12 frames, max |err| 19.3 %. No other threshold changed.
- Reason: the miss is 4 frames (< 0.1 s each) during fast approaches; the alternatives add jitter or complexity.
- Item 6 committed with test:ar green; tagged ar-m1-fix. M2 NOT started.
- FIRST THING TO TRY if live jitter is reported: re-introduce small pose easing (POSE_TAU_S ≈ 0.016 s, three-scene.ts),
  since the pose now snaps to every new target.
