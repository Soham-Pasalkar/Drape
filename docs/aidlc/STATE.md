# AI-DLC State — DRAPE AR try-on (manual mode)

| Field | Value |
|---|---|
| Mode | Manual AI-DLC (ai-dlc-engineering skill not installed), tier 2, brownfield |
| Branch / commit | `ar-cleanup` @ `0cc7bec` |
| Rollback tags | `pre-cleanup-head` (736b542), `pre-cleanup-wt` (e2ffa3e) |
| Current phase | Phase 1 — Inception (G1 requirements) |
| Status | `AR_REQUIREMENTS.md` drafted; **awaiting "approved G1"** |
| Gates | G1 not started · G2 not started · G3 not started |
| Milestone in progress | none |

## Approval log
- 2026-11-07 — Phase 0 → Inception. User: "go". Interpreted as accepting the recommended defaults for
  Phase-0 questions 1–8 (local-only recordings; opt-in 320 px PNGs; macOS Safari 17+/Chrome 120+; Worker deferred
  to after M3; bust mode when hips unusable; display the inferred frame; minimal CI in M0; evaluate `full` model in M2).

## Notes (out of scope for the current phase)
- ADR-004 (pose in a Web Worker) diverges from the code; deferred to after M3 (decision 4) — needs an ADR amendment at G2.
- Lens review open items for G2: latency cost of FR-03; CI host choice (GitHub Actions assumed); model source URL for NFR-05.
