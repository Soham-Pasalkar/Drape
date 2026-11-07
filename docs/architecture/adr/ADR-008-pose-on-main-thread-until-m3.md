# ADR-008: Pose inference stays on the main thread until after M3 (amends ADR-004)

- Status: Proposed (G2, 2026-11-07)
- Amends: ADR-004 (client-side Web Worker isolation with MediaPipe Pose)

## Context
ADR-004 chose to run MediaPipe Pose in a Web Worker. The code (`frontend/src/lib/ar/pose-tracker.ts`) runs it on the
main thread via `requestVideoFrameCallback`. The current priority is pixel registration in the user's real
Safari/Chrome sessions (FR-05), which needs session recording and replay first (M1). Moving inference to a Worker
changes frame timing and would confound the registration diagnosis.

## Decision
Keep inference on the main thread through M3. Record inference and frame timings in every session (NFR-02).
Re-open the Worker decision after M3, or earlier if the recorded p50 render rate falls below 30 FPS.

## Consequences
- The privacy property of ADR-004 (no frames leave the device) is unaffected; it is verified separately (NFR-03).
- UI jank risk on slower laptops is accepted until M3 and measured, not assumed.
