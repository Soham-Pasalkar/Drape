# AI-DLC State — DRAPE AR try-on (manual mode)

| Field | Value |
|---|---|
| Mode | Manual AI-DLC (ai-dlc-engineering skill not installed), tier 2, brownfield |
| Branch / commit | `ar-cleanup` @ `e1ea4b0` |
| Rollback tags | `pre-cleanup-head` (736b542), `pre-cleanup-wt` (e2ffa3e) |
| Current phase | Phase 2 — Construction, M1 (session recording + replay) |
| Status | M1 in progress |
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

## Notes (out of scope for the current phase)
- ADR-004 (pose in a Web Worker) diverges from the code; deferred to after M3 (decision 4) — needs an ADR amendment at G2.
- Lens review open items for G2: latency cost of FR-03; CI host choice (GitHub Actions assumed); model source URL for NFR-05.
