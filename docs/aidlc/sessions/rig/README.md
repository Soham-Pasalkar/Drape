# Rig sessions (M1 acceptance)

Recorded through the real HUD (● Record / keys 1–8 / ■ Stop & save) in headless Chrome on commit `c78b2bd`, with a
**fake camera**: a single fashion photo moved/zoomed across the frame (10 fps y4m), including a waist-cropped
segment. Real MediaPipe + WebGL + page code; NOT a live webcam and NOT the user. `test-ar-replay.cjs` replays every
file here and requires ≤ 1 px agreement with the recorded numbers.

- `…T06-00-01-784Z.json` — commit c78b2bd (no per-frame `diag`).
- `…T06-18-31-039Z.json` — served by the user's already-running dev server (hot-reloaded to f7774f0; header says
  `appCommit 1e4a4e7` because the commit is read when the dev server starts). Includes per-frame `diag`.
