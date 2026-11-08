# DRAPE — AR & Backend Technology Evaluation

**Status:** Technical Evaluation Matrix  
**Author:** DRAPE Core Engineering  
**Date:** November 2026  
**Target:** Monocular Web Virtual Try-On & E-Commerce Scalability

---

## 1. Executive Summary

Every technology choice in DRAPE must be justified by demonstrable engineering requirements: computational budget, browser compatibility, licensing legality, latency, and maintainability. This document provides an evidence-based evaluation across seven architectural domains.

---

## 2. Technology Comparison Matrix

### 2.1 Computer Vision & Body Pose Estimation

| Candidate | Advantages | Limitations | Licensing | Recommendation |
|---|---|---|---|---|
| **MediaPipe Tasks Vision (`pose_landmarker_lite.task`)** | Runs in-browser via WebAssembly; 33 landmarks + world landmarks; fast inference ($18 - 25\text{ ms}$ on laptop CPU); zero external network call. | Sparse landmarks (no chest/waist volume); monocular world landmarks have depth distortion. | **Apache 2.0** (Commercially permissive) | **RECOMMENDED BASELINE:** Continue using MediaPipe Tasks Vision, but offload inference to a Web Worker. |
| **TensorFlow.js MoveNet (Thunder / Lightning)** | Fast 17-keypoint detector; lightweight. | Only 17 landmarks (lacks hand/foot detail); no 3D world landmark prior; higher jitter than MediaPipe. | **Apache 2.0** | **REJECTED:** Fewer landmarks than MediaPipe, worse limb stability. |
| **YOLOv8-Pose (ONNX via Web-DNN)** | High multi-person bounding and pose detection accuracy. | Heavy model size ($>25\text{ MB}$); slower in WebGL/WASM; high initialization time. | **GPL-3.0 / Commercial** (GPL license conflicts with proprietary e-commerce code) | **REJECTED:** Incompatible licensing and excessive compute overhead. |
| **Apple Vision Framework / WebXR** | Native hardware acceleration on iOS/macOS. | Non-standard across browsers; zero support in Chrome on Windows/Android/Linux. | Proprietary Apple API | **REJECTED:** Cross-platform web e-commerce requires broad compatibility. |

---

### 2.2 Execution Concurrency & Threading

| Candidate | Advantages | Limitations | Licensing | Recommendation |
|---|---|---|---|---|
| **Dedicated Web Worker (`OffscreenCanvas` + Transferables)** | Moves neural inference completely off the main UI thread; zero frame drops on React or Three.js; prevents input stutter. | Safari $<17.4$ has intermittent `OffscreenCanvas` WebGL bugs; requires serialization of frame data via `ImageBitmap`. | Web Standard (W3C) | **RECOMMENDED TARGET:** Implement a feature-detected Web Worker with fallback to main thread on legacy Safari. |
| **Main Thread Execution (Current State)** | Simple implementation; direct access to `<video>` DOM element; no data serialization. | Heavy WASM inference causes 30–50 ms frame freezes, competing with Three.js rendering and UI clicks. | Web Standard | **REJECTED FOR PRODUCTION:** Retain only as an automated fallback for browsers lacking worker canvas support. |

---

### 2.3 3D Graphics & Rendering Engine

| Candidate | Advantages | Limitations | Licensing | Recommendation |
|---|---|---|---|---|
| **Three.js (Imperative Instance)** | Lightweight; complete control over render loop, camera matrices, materials, and disposal; zero React re-render overhead. | Imperative lifecycle management requires careful manual disposal of buffers and textures. | **MIT** | **RECOMMENDED:** Retain existing Three.js imperative architecture. Highly optimized and proven. |
| **React Three Fiber (R3F) / Drei** | Declarative JSX syntax; idiomatic React component integration. | Adds heavy abstraction layer; declarative re-renders can conflict with 60 fps imperative tracking loops; larger bundle. | **MIT** | **REJECTED:** Unnecessary abstraction for a high-performance AR pipeline. |
| **Babylon.js** | Advanced built-in physics engines and PBR shaders. | Large bundle size ($>3\text{ MB}$); completely different API and asset loader ecosystem; would require total rewrite. | **Apache 2.0** | **REJECTED:** No material advantage over Three.js for this use case. |
| **Raw WebGPU** | Direct hardware pipeline access; lowest draw call overhead. | Incomplete browser support (Safari desktop experimental, mobile support nascent); complex low-level API. | Web Standard | **POSTPONED:** Re-evaluate for compute shaders in Level 4. |

---

### 2.4 Garment Deformation & Rigging

| Candidate | Advantages | Limitations | Licensing | Recommendation |
|---|---|---|---|---|
| **Three.js `SkinnedMesh` (Linear Blend Skinning - LBS)** | Evaluated entirely on GPU vertex shader; zero CPU overhead; seamless armhole continuous mesh; native glTF support. | Extreme joint bends ($>120^\circ$) can exhibit minor volume loss ("candy-wrapper" artifact). | **MIT** (Standard glTF 2.0) | **RECOMMENDED PRIMARY DEFORMATION:** Industry standard. Sleeves and torso articulate naturally without tearing. |
| **Dual-Quaternion Skinning (DQS)** | Eliminates volume loss at extreme twists and bends. | Non-standard in glTF 2.0; requires custom Three.js vertex shader; higher shader instruction count. | Custom Shader | **EVALUATE FOR JACKETS/COATS:** Consider custom DQS shader if thick winter coats pinch at elbows. |
| **CPU Vertex Push-Out & Barycentric Seam Binding (Current State)** | Runs on any standard mesh. | Severe CPU bottleneck; cannot articulate sleeves without tearing seams; rigid sleeves look unnatural. | Proprietary Code | **REPLACE:** Replace with GPU SkinnedMesh. |

---

### 2.5 Cloth Physics Simulation

| Candidate | Advantages | Limitations | Licensing | Recommendation |
|---|---|---|---|---|
| **Localized XPBD on GPU Skinned Mesh** | Realistic secondary drape and hem sway; primary fit is guaranteed by skinning; stable under large timesteps. | Full-garment CPU simulation is too slow; must be localized to loose fabric sections. | Public Domain Math / MIT | **RECOMMENDED SECONDARY MOTION:** Combine with SkinnedMesh. Skinning handles sleeves/torso; XPBD handles hems. |
| **Ammo.js / Bullet Physics** | Full rigid-body and soft-body simulation suite. | Massive WASM binary ($>2\text{ MB}$); difficult to constrain to moving human bodies; high CPU spikes. | **Zlib** | **REJECTED:** Too heavy and unpredictable for clothing try-on. |
| **WebGPU Compute Shader XPBD** | Simulates tens of thousands of cloth particles at 60 fps on GPU. | Requires WebGPU; limited mobile and iOS Safari availability in production today. | Custom WebGPU WGSL | **POSTPONED (Level 4):** Ideal future trajectory once WebGPU reaches $>95\%$ browser penetration. |

---

### 2.6 Human Body Representation & Occlusion

| Candidate | Advantages | Limitations | Licensing | Recommendation |
|---|---|---|---|---|
| **Rigged Humanoid Avatar + Depth Occluder** | Lightweight; conforms to MediaPipe joint skeleton; provides depth buffer occlusion so garment backs are hidden. | Anatomical shape is an approximation based on height-conditioned statistical priors. | **Proprietary / In-House** | **RECOMMENDED TARGET:** Solves occlusion and clothing drape with minimal compute. |
| **SMPL / SMPL-X / STAR** | Dense academic body surface model (7,789 vertices, learned PCA shape space). | **Strict Non-Commercial License** (Meshcapade enterprise license required); deep neural estimators ($>200\text{ MB}$) cannot run client-side. | **Non-Commercial Research Only** | **REJECTED:** Legal and performance blocker for e-commerce. |
| **Procedural Elliptical Torso Proxy (Current State)** | Fast analytic Signed Distance Field (SDF) for torso collisions. | Coarse (~200 vertices); does not articulate with arms; lacks real human curves. | Proprietary Code | **REFACTOR:** Retain SDF collision math, but upgrade shape to follow the rigged humanoid skeleton. |

---

### 2.7 Database Concurrency & Inventory Reservation

| Candidate | Advantages | Limitations | Licensing | Recommendation |
|---|---|---|---|---|
| **PostgreSQL `SELECT ... FOR UPDATE` with Ordered Locking & ACID Transactions** | Guaranteed zero race conditions across unlimited worker processes; eliminates overselling; fully transactional rollback. | Requires proper lock ordering (`ORDER BY variant_id`) to avoid deadlocks; requires database connection pool tuning. | **PostgreSQL Open Source** | **RECOMMENDED BACKEND REFACTOR:** Replaces the flawed in-memory python dictionary lock. |
| **In-Memory Python `asyncio.Lock` Dictionary (Current State)** | Zero database overhead; simple local async locking. | **Completely broken in production.** Provides zero protection across multiple Gunicorn/Uvicorn worker processes or containers. | Proprietary Code | **REPLACE IMMEDIATELY.** |
| **Distributed Redis Locks (Redlock)** | High-throughput distributed locking across microservices. | Introduces Redis infrastructure dependency; premature complexity for a modular monolith. | **BSD / Redis Source** | **POSTPONED:** Not required until DRAPE scales beyond a single database instance. |

