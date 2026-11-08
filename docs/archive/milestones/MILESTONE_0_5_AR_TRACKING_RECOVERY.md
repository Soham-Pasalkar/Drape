# DRAPE — Milestone 0.5: Surgical AR Tracking Recovery & Live Telemetry Report

## Executive Summary

Milestone 0.5 resolves the critical functional defect identified in Milestone 0.4 where DRAPE's 3D AR virtual try-on garment froze upon session initialization and failed to track user body movement.

The root cause was isolated to `frontend/src/lib/ar/pose-tracker.ts`: a duplicate-frame suppression condition (`mediaTime !== undefined && mediaTime === this.lastMediaTime`) that aborted execution on live webcam streams. On live `getUserMedia` streams in WebKit/Safari and certain Chromium configurations, video metadata does not provide a progressive stream timeline and persistently delivers `metadata.mediaTime = 0`. After processing the initial frame at `mediaTime = 0`, the tracker marked `lastMediaTime = 0` and subsequently rejected every incoming camera frame as a "duplicate", starving MediaPipe PoseLandmarker inference and freezing the 3D garment.

This milestone implements the surgical repair: removing the defective `mediaTime` duplicate gate while rigorously guarding MediaPipe's monotonic `performance.now()` timestamp contract, expanding diagnostic telemetry across the entire vision pipeline, creating a dedicated 9-case automated regression test suite (`test-ar-pose-tracker.cjs`), and verifying that all 261 AR tests, TypeScript compilation, ESLint, and Next.js production builds pass cleanly.

---

## 1. Defect Analysis & Confirmed Mechanism

### 1.1 The Symptom
When navigating to `/try-on` and launching a try-on session, the webcam activated, the user's video feed rendered, and the 3D garment mesh appeared over the user's upper body. However, the garment remained completely frozen in space. When the user moved left, right, stepped back, or leaned forward, the garment stayed static at its initial position.

### 1.2 The Mechanism in `pose-tracker.ts`
In `PoseTracker.startTracking()`, frame scheduling was driven by `requestVideoFrameCallback` (RVFC):

```typescript
// Defective code in PoseTracker.processFrame (prior to Milestone 0.5):
const processFrame = (mediaTime?: number) => {
  if (!this.isTracking || !this.landmarker) return;

  // CRITICAL DEFECT:
  if (mediaTime !== undefined && mediaTime === this.lastMediaTime) {
    this.scheduleNextFrame(video, processFrame);
    return;
  }
  if (mediaTime !== undefined) this.lastMediaTime = mediaTime;
  ...
```

Per the W3C `VideoFrameMetadata` specification:
- For prerecorded media elements with an active duration (e.g. `<video src="video.mp4">`), `metadata.mediaTime` represents the current playback position in seconds along the media timeline.
- For live capture streams (`MediaStream` from `navigator.mediaDevices.getUserMedia`), there is no progressive duration timeline. In WebKit/Safari, `metadata.mediaTime` is permanently `0.0`. In Chromium and Gecko, `mediaTime` may be `0` or remain static across successive decoded camera frames.

### 1.3 Execution Trace of the Defect
1. **Frame 0 (t = 0 ms)**: RVFC triggers with `mediaTime = 0`. Since `lastMediaTime` is initialized to `-1`, `0 === -1` is false. The condition passes, `lastMediaTime` is set to `0`, and MediaPipe detects the initial pose. The garment renders at this initial pose.
2. **Frame 1 (t = 16.7 ms / 33.3 ms)**: RVFC triggers for the next decoded camera frame. `metadata.mediaTime` is again `0`. The check `mediaTime === this.lastMediaTime` (`0 === 0`) evaluates to `true`.
3. `this.scheduleNextFrame(video, processFrame)` is invoked and the callback returns immediately. No inference is attempted.
4. **All Subsequent Frames (t > 33.3 ms)**: Every frame delivers `mediaTime = 0`, matches `lastMediaTime = 0`, and aborts. `detectForVideo` is never called again. The pose never updates, and the 3D garment remains indefinitely frozen at the position computed on Frame 0.

---

## 2. Surgical Source Changes

The implementation touched only 4 files in strict accordance with the Milestone 0.5 scope:

### 2.1 `frontend/src/lib/ar/pose-tracker.ts`
- **Removed Duplicate-Frame Abort Condition**: Completely eliminated `if (mediaTime !== undefined && mediaTime === this.lastMediaTime) return;`.
- **Preserved `requestVideoFrameCallback` as Primary Scheduler**: RVFC remains the primary frame presentation synchronization mechanism with `requestAnimationFrame` as the fallback when RVFC is unsupported.
- **Enforced Monotonic Timestamp Safety for MediaPipe**: MediaPipe's `PoseLandmarker.detectForVideo(video, timestamp)` throws a fatal error if timestamps do not strictly increase (`timestamp > previousTimestamp`). The loop samples `now = performance.now()` and strictly guards `if (now > this.lastTimestamp)`.
- **Extended `PoseTrackerStats` Telemetry**:
  - `callbackCount`: Total video frame callbacks presented by the browser (RVFC or RAF).
  - `inferenceCount`: Total `detectForVideo()` inferences attempted.
  - `detectionCount`: Total frames with successful pose keypoint detections (`landmarks.length >= 25` and smoothed output).
  - `emptyCount`: Total frames with no body detected, occluded landmarks, or low confidence.
  - `frameCount`: Monotonic frame counter (preserved for backward compatibility).
  - `lastMediaTime`: Recorded `mediaTime` from video frame metadata (`number | null`).
  - `lastInferenceAt`: Performance timestamp of the most recent inference execution.
- **Guaranteed Scheduling in `try/catch`**: Placed `this.scheduleNextFrame(video, processFrame)` in the outer scope after the `try/catch/finally` block so that any temporary inference error or exception cannot terminate the scheduling loop.
- **Safe Session Reset (`resetStats`)**: Added `resetStats()` invoked in both `startTracking()` and `stopTracking()` to guarantee diagnostic counters start clean on every session.

### 2.2 `frontend/src/components/try-on/DeveloperDiagnosticOverlay.tsx`
- Added `vision` telemetry group to `DiagnosticMetrics`:
  ```typescript
  vision: {
    callbackCount: number;
    inferenceCount: number;
    detectionCount: number;
    emptyCount: number;
    lastMediaTime: number | null;
    msSinceLastInference: number;
  };
  ```
- Added HUD section `"Vision Telemetry"` displaying:
  - **Callbacks**: Count of browser presentation frames (`N frames`).
  - **Inferences**: Count of MediaPipe inference executions (`N calls`).
  - **Detections**: Count of valid body poses recognized (`N poses`).
  - **Empty / Lost**: Count of dropped/occluded frames (`N frames`).
  - **Media time**: Displayed in seconds, or `"— (live stream / RAF)"` if null/0.
  - **Last infer age**: Milliseconds since the last inference with warning highlight if `> 500 ms`.

### 2.3 `frontend/src/components/try-on/VirtualTryOnExperience.tsx`
- Wired `poseTrackerRef.current.stats` into the `buildDiagnostics` assembly loop to supply real-time vision telemetry to the overlay.

### 2.4 `frontend/scripts/tsconfig.ar-test.json`
- Removed `"exclude": ["../src/lib/ar/pose-tracker.ts"]` to allow `PoseTracker` to be compiled into `dist_test/` and tested by the automated test suite.

---

## 3. Frame Scheduling Architecture & Correctness

```
                   Browser Video Stream (Camera / RVFC / RAF)
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │  PoseTracker.processFrame()  │
                       │   callbackCount++            │
                       │   record lastMediaTime       │
                       └──────────────┬───────────────┘
                                      │
                 Is video ready & playing with valid dimensions?
                                      │
                        Yes ──────────┴────────── No
                         │                         │
                         ▼                         ▼
         ┌───────────────────────────────┐   (Skip inference)
         │    now = performance.now()    │         │
         │  now > this.lastTimestamp ?   │         │
         └───────────────┬───────────────┘         │
                         │                         │
           Yes ──────────┴────────── No            │
            │                         │            │
            ▼                         ▼            │
 ┌──────────────────────┐    (Clock jitter guard)  │
 │  inferenceCount++    │             │            │
 │  detectForVideo()    │             │            │
 └──────────┬───────────┘             │            │
            │                         │            │
  ┌─────────┴─────────┐               │            │
  │                   │               │            │
Pose Found       Pose Missing         │            │
  │                   │               │            │
  ▼                   ▼               │            │
detectionCount++  emptyCount++        │            │
Keypoints Emitted Body Lost           │            │
  │                   │               │            │
  └─────────┬─────────┘               │            │
            │                         │            │
            └─────────────────────────┼────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │    isTracking == true?    │
                        │   scheduleNextFrame()     │
                        └───────────────────────────┘
```

### Why this design guarantees continuous inference and stability:
1. **No Frame Starvation**: Frame presentation is decoupled from `mediaTime`. Every frame decoded and presented by the camera driver triggers `processFrame`.
2. **MediaPipe Timestamp Invariant Maintained**: MediaPipe requires strictly monotonically increasing timestamps. Because `performance.now()` is a monotonic clock with sub-millisecond precision, `now > this.lastTimestamp` guarantees `detectForVideo(video, timestamp)` is always called with strictly increasing timestamps.
3. **Clock Jitter Resilience**: In the edge case where the system clock reports an identical or lower timestamp, inference is skipped for that single sub-frame without crashing, and inference resumes immediately on the next frame.
4. **Resilience to Temporary Failures**: If WebGL context loss or a temporary memory spike causes `detectForVideo` to throw, the error is caught, reported via `onError`, and `scheduleNextFrame` still executes, allowing automatic recovery on the next frame.

---

## 4. Automated Regression Test Suite (`test-ar-pose-tracker.cjs`)

A new test suite was authored at `frontend/scripts/test-ar-pose-tracker.cjs` and registered into the AR test runner. It exercises 9 deterministic test cases using isolated mocks for the DOM video element, RVFC, RAF, and MediaPipe landmarker:

| # | Test Case Description | Mechanism Verified |
|---|-----------------------|--------------------|
| 1 | Continuous frame processing when RVFC delivers identical `mediaTime = 0` | Confirms 10 frames with `mediaTime: 0` result in 10 callbacks, 10 inferences, and 10 detections without halting. |
| 2 | Continuous frame processing when RVFC delivers increasing `mediaTime` | Confirms 10 frames with progressive `mediaTime` (`0.033`, `0.066`, ...) result in 10 inferences and correct `lastMediaTime` tracking. |
| 3 | Continuous frame processing when RVFC metadata is undefined | Confirms frames with `undefined` metadata process cleanly without null pointer exceptions. |
| 4 | Monotonically increasing `now` timestamps passed to `detectForVideo` | Feeds duplicate and backwards timestamps (`[1000, 1000, 999, 1010, 1010, 1020]`); verifies only strictly increasing timestamps trigger inference. |
| 5 | Scheduling continuation even when `detectForVideo` throws an exception | Injects an error on frame 2; verifies frame 3 is still scheduled and successfully infers. |
| 6 | Execution stop when `stopTracking()` is called | Verifies `cancelVideoFrameCallback` is invoked and subsequent stale callbacks are completely ignored. |
| 7 | Clean diagnostic reset when starting a new session | Verifies session 1 stats are fully cleared upon `stopTracking()` and session 2 starts at 0. |
| 8 | RAF fallback when `requestVideoFrameCallback` is undefined | Removes `requestVideoFrameCallback` from the video element; verifies `requestAnimationFrame` seamlessly drives the loop. |
| 9 | Empty detections increment `emptyCount` and transition status to `body_lost` | Returns empty landmark arrays; verifies `emptyCount` increments and status callback fires `body_lost`. |

---

## 5. Verification Commands and Actual Output

### 5.1 Focused PoseTracker Regression Tests
Command:
```bash
cd frontend && node scripts/test-ar-pose-tracker.cjs
```
Output:
```
▸ PoseTracker Scheduling Recovery (Milestone 0.5)
  ✓ 1. Continuous frame processing when RVFC delivers identical mediaTime (mediaTime = 0)
  ✓ 2. Continuous frame processing when RVFC delivers increasing mediaTime values
  ✓ 3. Continuous frame processing when RVFC metadata is undefined
  ✓ 4. Monotonically increasing now timestamps passed to detectForVideo
  ✓ 5. Scheduling continuation even when detectForVideo throws a temporary exception
  ✓ 6. Execution stop when stopTracking() is called (cancelling active scheduling)
  ✓ 7. Clean diagnostic reset when starting a new session
  ✓ 8. RAF fallback when requestVideoFrameCallback is undefined
  ✓ 9. Empty detections increment emptyCount and transition status to body_lost

test-ar-pose-tracker: 9 passed, 0 failed
```

### 5.2 Full AR Test Suite
Command:
```bash
cd frontend && npm run test:ar
```
Output:
```
> drape-frontend@0.1.0 test:ar
> node scripts/run-ar-tests.cjs

test-ar-calibration: 16 passed, 0 failed
test-ar-camera: 33 passed, 0 failed
test-ar-correspondence: 19 passed, 0 failed
test-ar-fitting-pipeline: 37 passed, 0 failed
test-ar-garments: 75 passed, 0 failed
test-ar-golden: 16 passed, 0 failed
test-ar-motion: 7 passed, 0 failed
test-ar-pipeline: 3 passed, 0 failed
test-ar-pose-tracker: 9 passed, 0 failed
test-ar-replay: 7 passed, 0 failed
test-ar-session: 10 passed, 0 failed
test-ar-xpbd: 22 passed, 0 failed
test-glb-loader-parity: 8 passed, 0 failed

================ AR TEST TOTAL: 261 passed, 0 failed, 0 suites crashed ================
```

### 5.3 TypeScript Compilation Check
Command:
```bash
cd frontend && npx tsc --noEmit
```
Output:
```
(Clean exit code 0, 0 type errors)
```

### 5.4 ESLint Validation
Command:
```bash
cd frontend && npm run lint
```
Output:
```
> drape-frontend@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### 5.5 Next.js Production Build
Command:
```bash
cd frontend && npm run build
```
Output:
```
> drape-frontend@0.1.0 build
> next build

  ▲ Next.js 14.2.35
  - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types     ✓ Linting and checking validity of types 
   Collecting page data     ✓ Collecting page data 
 ✓ Generating static pages (17/17)
   Collecting build traces     ✓ Collecting build traces 
   Finalizing page optimization     ✓ Finalizing page optimization 

Route (app)                              Size     First Load JS
┌ ○ /                                    2.78 kB         105 kB
├ ○ /_not-found                          876 B          88.3 kB
├ ○ /account                             7.49 kB         106 kB
├ ○ /cart                                5.58 kB         104 kB
├ ○ /checkout                            10.3 kB         114 kB
├ ○ /checkout/failure                    1.6 kB         98.2 kB
├ ○ /checkout/success                    3.29 kB         107 kB
├ ○ /collections                         141 B           103 kB
├ ƒ /collections/[category]              141 B           103 kB
├ ○ /login                               3.71 kB         108 kB
├ ○ /orders                              3.15 kB         107 kB
├ ƒ /orders/[id]                         3.36 kB         107 kB
├ ƒ /products/[slug]                     7 kB            106 kB
├ ○ /register                            4.41 kB         108 kB
├ ○ /try-on                              1.62 kB        89.1 kB
├ ○ /wardrobe                            5.04 kB         109 kB
├ ○ /wardrobe/add                        3.54 kB         102 kB
├ ○ /wardrobe/outfits                    4.87 kB         109 kB
└ ƒ /wardrobe/outfits/[id]               4.94 kB         109 kB
+ First Load JS shared by all            87.4 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### 5.6 Garment Assets Validation
Command:
```bash
cd frontend && npm run validate:garments
```
Output:
```
=== DRAPE GARMENT ASSET AUDIT ===
✓ [tshirt-crewneck]
✓ [tshirt-oversized]
✓ [tshirt-fitted]
✓ [top-longsleeve]
✓ [top-sleeveless]
✓ [skirt-aline]
✓ [skirt-pleated]
✓ [dress-midi]
✅ ALL 8 GARMENT ASSETS VALIDATED SUCCESSFULLY
```

---

## 6. Browser Acceptance Verification Protocol

### 6.1 Distinction Between Automated and Hardware Verification
- **Automated Verification**: Completed in full via `test-ar-pose-tracker.cjs` (9 passed) and `test:ar` (261 passed). Verified frame scheduling across RVFC (`mediaTime = 0`, increasing, undefined) and RAF, monotonic timestamp enforcement, recovery across exceptions, diagnostic telemetry reset, and body-lost transitions.
- **Hardware Webcam Verification**: Requires an interactive web browser session with physical camera hardware access.

### 6.2 Manual Verification Protocol for the User
Run the local development server:
```bash
cd frontend && npm run dev
```
Open `http://localhost:3000/try-on` in Google Chrome or Safari:

1. **Test A: Initial Detection**
   - Click "Allow Camera".
   - Confirm status transitions: `Initializing` -> `Camera Active` -> `Body Detected`.
   - Open Developer Diagnostics (press `D` or toggle the HUD).
   - Verify Vision Telemetry:
     - `Callbacks` increments continuously at ~30–60 fps.
     - `Inferences` increments continuously alongside callbacks.
     - `Detections` increments continuously when standing in frame.
     - `Last infer age` stays low (< 50 ms).

2. **Test B: Lateral Movement**
   - Move 0.5 meters to the left and right.
   - Confirm the garment translates across the screen in direct correspondence with your torso movement.
   - Confirm `Inferences` and `Detections` continue incrementing monotonically without pausing.

3. **Test C: Depth Movement**
   - Step 1 meter backward and 1 meter forward.
   - Confirm the garment scales appropriately with distance.

4. **Test D: Re-entry**
   - Step completely out of camera view.
   - Confirm status displays `Body Lost`, `Detections` stop incrementing, and `Empty / Lost` increments.
   - Step back into camera view.
   - Confirm status immediately returns to `Body Detected`, and `Detections` resume incrementing.

---

## 7. Known Limitations Remaining in the AR Engine

Milestone 0.5 surgically solved **frame scheduling and continuous tracking recovery**. The following architectural limitations documented in the Milestone 0 audit and Milestone 0.4 forensic report remain for subsequent milestones:

1. **Procedural Geometry Artifacts**: The 8 GLB garment models were procedurally generated by an earlier agent. Sleeves are rigid cylindrical geometry attached to a boxy torso with visible seam gaps during arm articulation.
2. **Hardcoded Body Assumptions**: `fitting-engine.ts` uses an assumed shoulder width heuristic (36 cm population prior) rather than personalized geometric body-shape profiling.
3. **Lateral Shoulder Override**: An ad-hoc override in `fitting-engine.ts` biases garment lateral positioning toward the midpoint of detected landmarks, causing slight lateral jitter under asymmetric lighting or arm occlusion.
4. **Main-Thread Inference Latency**: MediaPipe PoseLandmarker currently executes on the browser's main JavaScript thread. Moving pose inference to a dedicated Web Worker via `OffscreenCanvas` will eliminate render thread contention and achieve stable 60 fps rendering.
5. **XPBD Scope**: Position-Based Dynamics cloth simulation is CPU-bound and active only on a subset of garment vertices, requiring GPU acceleration or optimized WebAssembly kernels for high-fidelity drape wrinkles.

---

## 8. Git Repository State

- **Implementation Branch**: `engineering-reset/ar-foundation`
- **Starting Baseline Tag**: `m0.5-baseline` (`5e9fabe4e1768a1ca28782cf93f66f41bdb28d30`)
- **Protected Branches Untouched**:
  - `main`
  - `engineering-reset/ar-cleanup-audit`
  - `engineering-reset/repository-audit`
