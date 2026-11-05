# ADR-004: Client-Side Computer Vision & Body Tracking Architecture

* **Status:** accepted
* **Deciders:** Technical Architect (Antigravity Agent), Human Project Owner
* **Date:** 2026-11-05
* **Technical Story:** Links to PRD Requirements [`FR-015`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#fr-015), [`FR-016`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#fr-016), [`NFR-001`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#nfr-001), [`SEC-002`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#sec-002) and Risk [`RSK-008`](file:///Users/soham/Github/Drape/docs/aidlc/RISK_REGISTER.md#rsk-008)

## Context and Problem Statement

DRAPE's Live 3D Try-On requires continuous real-time estimation of human body pose landmarks (shoulders, elbows, wrists, hips, neck) from a live webcam or smartphone front camera stream to drive 3D garment alignment.

The computer vision architecture must minimize thread contention, reduce data transmission exposure, and function across variable domestic lighting conditions without streaming customer camera video to backend servers.

Target performance and browser compatibility are established as **measurable validation targets** to be empirically benchmarked in Milestone 3:
* **Target Latency Profile:** Distinguish between landmark model inference latency (target: ≤ 30ms inside worker) and end-to-end camera-to-render latency (optical frame acquisition → worker postMessage → landmark smoothing → skeletal rig rotation calculation → WebGL render; target: ≤ 60ms total, corresponding to a target throughput of 20–30 FPS on validated tiers).
* **Target Device Compatibility:** Validate WASM and OffscreenCanvas execution across target iOS and Android mobile browser tiers.

## Decision Drivers

* **Default Non-Transmission Privacy Posture:** Customer video feeds must remain confined to the user's local browser runtime unless explicitly authorized by affirmative consent.
* **UI Responsiveness & Thread Isolation:** Heavy machine learning inference on video frames must not monopolize the main UI thread, preserving responsive navigation and cart interaction.
* **Predictable Latency for Visual Alignment:** End-to-end latency must remain bounded to prevent noticeable visual lag between body motion and 3D garment movement.
* **Graceful Degradation for Non-Camera Users:** Users without webcams, in poor lighting, or with privacy concerns must have an equally engaging non-camera alternative.

## Considered Options

* **Option 1: Server-Side Real-Time Video Streaming (WebRTC / Cloud CV)** (browser streams WebRTC video to GPU cloud servers; server computes landmarks and sends coordinate arrays back).
* **Option 2: Client-Side Main-Thread Pose Estimation** (executing pose models directly inside the Next.js React UI thread via canvas `requestAnimationFrame`).
* **Option 3: Client-Side Web Worker Isolation with MediaPipe Pose** (executing MediaPipe Pose in a dedicated background Web Worker off the main thread, transferring coordinate tuples, with default non-transmission and graceful non-camera fallback).

## Decision Outcome

Chosen option: **"Option 3: Client-Side Web Worker Isolation with MediaPipe Pose"**, because executing the pose model in a dedicated Web Worker isolates CPU/WASM computation off the main UI thread. This supports fluid UI interactions while substantially reducing server GPU bandwidth overhead and mitigating the severe privacy liabilities of centralized video streaming.

### Latency Decomposition: Inference vs. End-to-End Pipeline
The architecture explicitly decomposes the tracking pipeline into measurable stages:
1. **Frame Capture & Ingestion:** `getUserMedia` video capture to `OffscreenCanvas` transfer (~5–10ms).
2. **Model Inference Latency:** MediaPipe Pose landmark estimation executing in WASM/WebGL inside the worker (~20–35ms depending on client hardware).
3. **Landmark Smoothing & Serialization:** 1-Euro/Kalman filter jitter suppression and `postMessage` coordinate transfer to UI thread (~2–5ms).
4. **Skeletal Kinematics & 3D Render:** Converting 3D landmark points into joint rotation quaternions, updating the Three.js skinned mesh, and WebGL rasterization (~10–15ms).
Total target budget: ≤ 50–65ms end-to-end, serving as an empirical benchmark target for M3 validation rather than an unverified guarantee.

### Client-Side Privacy Architecture & Volatile Memory Lifecycle

1. **Default Non-Transmission:** Live video frames captured via `navigator.mediaDevices.getUserMedia` are piped directly to an `OffscreenCanvas` inside the Web Worker. Under no circumstances are raw video frames, base64 strings, or unconsented images transmitted across the network to DRAPE servers or third parties.
2. **Volatile-Only Memory:** Video frames are ingested into transient WASM/WebGL execution buffers solely for the duration of landmark inference and immediately overwritten by subsequent frames.
3. **Explicit Session Termination:** Clicking "Stop Camera", switching navigation tabs, or closing the try-on modal triggers immediate execution of `stream.getTracks().forEach(track => track.stop())`, canvas buffer clearing, and worker instance termination.
4. **Honest Memory Claim:** The architecture acknowledges that physical RAM zeroization is controlled by operating systems and browser garbage collectors; DRAPE promises **best-effort resource reference disposal**, never unprovable hardware zeroization claims.

### Non-Camera Fallback Experience

For customers who decline camera permissions, lack compatible hardware, or shop in low-light environments, DRAPE provides a zero-friction fallback:
* **Interactive 3D Mannequin:** Customers can drape garments over standardized 3D mannequin avatars with customizable body shapes and heights.
* **Pre-Recorded Motion Loops:** Customers can preview garments reacting to dynamic runway walking loops performed by diverse digital models.

### Pose Model Baseline & Conditional Candidates

* **Provisional Research Baseline:** Google MediaPipe Pose (running via WebAssembly and WebGL shaders) providing 33 full-body landmarks (x, y, z, visibility).
  - *Landmark Semantics vs. Physical Measurements:* MediaPipe Pose outputs 33 heuristic spatial coordinate landmarks representing 2D/pseudo-3D anatomical keypoints. These are **not** exact physical metric measurements, volumetric scans, or tailored sizing metrics.
  - *Rigging Mapping:* The 33 landmarks do **not** map 1:1 to a 33-joint garment rig. An anatomical subset of torso, shoulder, and limb landmarks is transformed into joint rotation quaternions to drive a simplified avatar skeleton hierarchy (15–20 active bones).
* **Temporal Landmark Smoothing:** Raw landmarks pass through a 1-Euro or Kalman filter to eliminate high-frequency jitter before being posted to the Three.js scene.
* **Conditional Candidates:** TensorFlow.js MoveNet (Thunder/Lightning) and ONNX Runtime Web are retained as evaluated conditional candidates if MediaPipe exhibits licensing or bundle size barriers in production.

## Positive Consequences

* **Substantial Privacy Exposure Reduction:** Raw optical video streams never touch DRAPE backend infrastructure, minimizing regulatory exposure under global privacy regimes (e.g. GDPR, CCPA, and Illinois BIPA).
* **Minimized Server Compute Overhead:** Offloading frame analysis to local client hardware avoids massive centralized GPU streaming costs for real-time tracking.
* **Decoupled UI Threading:** Off-thread Web Worker execution prevents heavy vision inference loops from freezing user clicks, scrolling, or checkout interactions.

## Negative Consequences / Trade-offs

* **Client Device Battery & Thermal Impact:** Continuous client-side camera inference heats mobile devices and drains battery.
  - *Mitigation:* Frame throttling (e.g. capped at target 30 FPS, downscaling input frames to 256×256), automatic idle pause when the tab is hidden, and explicit session timeouts after 5 minutes of inactivity.
* **Browser WASM/WebGL Fragmentation:** Older or lower-tier mobile devices may exhibit inconsistent WebGL/WASM performance inside Web Workers.
  - *Mitigation:* Automated capability probe at launch; automatic fallback to non-camera mannequin mode if worker initialization or frame rate fails threshold checks.

## Pros and Cons of the Options

### Option 1: Server-Side Real-Time Video Streaming

* Good, because high-end server GPUs can run massive, highly accurate vision foundation models.
* Bad, because streaming video over WebRTC introduces variable network latency spikes, consumes massive bandwidth, and incurs prohibitive server GPU costs.
* Bad, because ingesting live customer video onto servers creates immense privacy, security, and biometric liabilities.

### Option 2: Client-Side Main-Thread Pose Estimation

* Good, because it is simpler to wire up without cross-thread message passing.
* Bad, because executing pose models on the main thread causes significant jank, freezes scrolling, and drops UI frames.

### Option 3: Client-Side Web Worker Isolation with MediaPipe Pose

* Good, because it provides default zero-transmission privacy and avoids server GPU streaming overhead.
* Good, because off-thread worker execution keeps the e-commerce shopping experience responsive.
* Bad, because cross-thread messaging (`postMessage`) requires careful coordinate serialization and landmark smoothing.

## Compliance and Verification

* **M3 (First Working AR Try-On Prototype):** Automated browser test validates that MediaPipe loads inside a Web Worker, computes 33 landmarks, and meets the target validation benchmarks (target: inference latency ≤ 35ms, end-to-end latency ≤ 60ms, zero outbound network transmission of video payloads).
* **Network Privacy Audit:** Headless browser test verifies zero outbound HTTP/WebSocket requests containing video frame payloads during active camera tracking.

