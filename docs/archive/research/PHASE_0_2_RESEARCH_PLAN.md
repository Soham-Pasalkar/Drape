# DRAPE — Phase 0.2 Technology Evaluation Research Plan

**Status:** Initiated research plan; no technology is selected for implementation by this document.
**Phase / roadmap position:** Phase 0.2, within **M0: Research, requirements and architecture**. It does not advance DRAPE to M1.
**Prepared:** 2026-11-04. **Source access date:** 2026-11-04 for every external source below.

## 1. Purpose, boundaries, and method

Phase 0.2 turns the Phase 0.1 requirements and risks into a sequence of evidence-gathering activities. It evaluates the stated preferences—Next.js/React/TypeScript, Python/FastAPI, PostgreSQL/pgvector, MediaPipe/OpenCV, Three.js/R3F/WebGPU, PyTorch/ONNX Runtime, GLB/glTF, and a modular monolith—rather than approving them by default.

**Not authorized:** application code, a frontend/backend, package installation, database schema, deployment, production data collection, model training, or a move to M1. Later approved workstreams may create bounded research artifacts, but only after their scope, data policy, and budget are explicitly approved.

### Evidence rules

- Prefer official documentation, specifications, original repositories, model cards, papers, and license files. Do not treat SEO comparisons as evidence.
- Label evidence as **Verified** (supported by a cited primary source), **Assumption** (unproven project premise), or **Recommendation** (a proposed decision based on evidence).
- Record exact package/model/checkpoint/dataset versions, source URL, license text/version, access date, test device/runtime, and raw measured results. “Open source” does not establish commercial rights for model weights, datasets, generated outputs, fonts, photographs, or garment assets.
- Use representative and consented/non-personal test data only. No customer camera frames, photos, body representations, or generated outputs may be reused for training/evaluation without an approved data policy and applicable consent/legal review.
- Establish evaluation thresholds before each experiment. Where a target is absent, record it as **TBD—approve before test**; do not declare success from a demo.

### Shared evidence package

Every workstream must produce: question/hypothesis; reproducible version and license inventory; test matrix; raw results; failures and exclusions; cost/capacity observations; privacy/data-flow impact; recommendation with confidence; and a go/no-go/defer outcome. Findings must update Phase 0.1 risks and traceability only after review.

## 2. Prototype inspection (reference only)

**Inspected:** local `prototype.html`, 2026-11-04. It remains unmodified and is not approved architecture.

| Area | Observed capability / approach | Reuse disposition |
|---|---|---|
| Experience | Static single-file fashion demo with catalog filtering, local in-memory cart, size selection, camera entry, landmark toggle, mirror toggle, manual scale/Y offset, and PNG download. | Interaction ideas and error-state prompts may inform research only. It has no durable commerce, account, consent, or order capability. |
| Dependencies | Google Fonts plus four JSDelivr CDN scripts: MediaPipe `camera_utils`, `control_utils`, `drawing_utils`, and legacy `pose`. | Replace with version-pinned, reviewed dependencies and local/build-managed delivery if any later implementation is approved. CDN presence does not clear licenses, security, availability, or privacy. |
| Pose estimation | Requests camera with `navigator.mediaDevices.getUserMedia`; constructs legacy `new Pose()`, with `modelComplexity: 1`, smoothing, segmentation disabled, and 0.5 detection/tracking confidence; sends every third video frame. | A useful M3 comparison point only. Evaluate current MediaPipe Tasks Vision Pose Landmarker and alternatives; do not inherit the API, settings, or performance claims. |
| Garment rendering | 2D canvas draws procedural silhouettes based chiefly on shoulder/hip landmarks, estimated shoulder width, torso position, rotation, global alpha, and manual offsets. | Not a garment engine. No Three.js/R3F, GLB/glTF, body mesh, depth, collision, occlusion, or deformation exists. Replace for M4/M5 evaluation. |
| Claims and limits | Copy claims “exact” fit, 98% accuracy, and up to 60fps; shows synthetic “AR Fit Score” percentages. It has no benchmark, calibration protocol, data lifecycle, supported-device matrix, or real catalog/assets. | Do not reuse claims or fit-score UI. They conflict with FR-013 and RSK-001/002. Any performance/quality assertion needs measured evidence. |

## 3. Workstream A — Computer Vision and Body Tracking

**Roadmap relevance:** M3 camera calibration and body tracking; informs M4/M5. **Primary risks:** RSK-001, RSK-002, RSK-007, RSK-008.

### Research questions

1. Can browser-side landmark tracking provide stable, responsive visual registration across a pre-approved device/browser/body/lighting/garment matrix without implying measurements or physical fit?
2. Which capture, crop, orientation, smoothing, confidence, and recovery rules reduce visible jitter and landmark loss while preserving a responsive camera experience?
3. Is client-side processing sufficient, or does any measured quality/coverage gap justify a bounded server-side path? What is the non-camera fallback?
4. Does “world landmark” output add useful registration evidence without being represented as exact body shape or measurement?

### Candidate technologies and alternatives

- **Candidate:** current MediaPipe Tasks Vision Pose Landmarker for web; compare Lite, Full, and Heavy bundles in a Worker. **Verified:** the official solution reports 33 landmarks and normalized image plus world-landmark outputs; its web video call is synchronous and official guidance recommends Workers to avoid blocking the UI (S1, S2).
- **Supporting candidate:** OpenCV for measured calibration/image-quality/geometric utility needs only; it is not a replacement for a learned pose model (S3, S4).
- **Alternatives to consider:** MoveNet through TensorFlow.js; an ONNX-exported pose model through ONNX Runtime Web; server inference only if on-device evidence fails. Alternatives must be compared on identical input/crop/device matrices and their own model/dataset rights.

### Licensing, cost, performance, and risks

- MediaPipe repository code is Apache-2.0 and OpenCV 4.5+ is Apache-2.0 (S3, S4); exact model-bundle/model-card terms and all model delivery artifacts still require separate review.
- Expected client compute avoids per-frame server GPU cost, but may consume battery, thermally throttle, block the main thread, or exclude older devices. This is a **risk to test**, not a performance claim.
- Key risks: monocular ambiguity, portrait/landscape variation, occlusion by garments/hands, lighting, camera permission denial, landmark jitter/loss, browser Worker compatibility, and users interpreting landmarks as measurements.

### Required evidence and go/no-go

- Versioned package/model/license/provenance inventory; supported matrix; participant-safe test protocol; test results for camera permission, first usable result, frame/landmark latency distribution, dropped frames, tracking loss/recovery, UI responsiveness, thermal/battery observations, and failure/fallback behavior.
- Representative matrix must include declared browser/OS/device tiers, camera orientations, lighting, body/pose diversity, and relevant garment categories. Define sampling and evaluator method before testing.
- **Go for M3:** only if consent/fallback flow, Worker/main-thread behavior, landmark stability, coverage, and limitation copy meet pre-approved criteria. **No-go/defer:** if no responsible fallback exists, accuracy/coverage produces misleading output, or the data/rights inventory is incomplete.

### Expected deliverables

1. Browser CV comparison report and raw benchmark dataset/results.
2. Camera/landmark support and failure-state matrix.
3. Calibration/registration protocol that explicitly excludes body-measurement or fit claims.
4. Model/package/license decision record and M3 go/no-go recommendation.

## 4. Workstream B — 3D Rendering and Garment Engineering

**Roadmap relevance:** M4 first 3D garment try-on and M5 deformation/occlusion quality. **Primary risks:** RSK-003, RSK-004, RSK-007, RSK-010.

### Research questions

1. Can Three.js plus React Three Fiber (R3F) deliver a viable WebGL baseline with acceptable load, frame-time, memory, and visual behavior on the approved matrix?
2. Does WebGPU provide measurable value as progressive enhancement without becoming a required path?
3. What minimum rights-cleared garment-asset contract is needed for M4, and what additional mesh/rig/simulation/occlusion evidence is needed for M5?
4. Are GLB versus external glTF/textures, chosen compression/extensions, and an imperative Three.js or Babylon.js alternative materially better under measured conditions?

### Candidate technologies and alternatives

- **Candidate:** Three.js + R3F; WebGL 2 baseline; test `WebGPURenderer` as optional enhancement. Three.js and R3F are MIT-licensed (S5, S6); R3F/React-version compatibility must be selected in M1, not assumed now (S6).
- **Asset candidate:** glTF 2.0/GLB. **Verified:** glTF specifies runtime scenes, meshes, materials, skins, animations, and extensions; GLB is a binary container. The format does not guarantee garment registration, cloth behavior, occlusion, sizing, or fit (S7, S8).
- **Alternatives:** Babylon.js; imperative Three.js; 2D compositing fallback; separate `.gltf` with external textures. Compare only if they answer a measured requirement.
- **Verified:** WebGPU needs a secure context and remains limited availability/not Baseline; Three.js can use WebGPU with a WebGL 2 fallback (S9, S10). Therefore **Recommendation:** WebGPU must remain progressive enhancement.

### Licensing, cost, performance, and risks

- A file format and MIT renderer licenses do not grant rights in garment geometry, PBR textures, brand marks, scans, source photography, or derivative preview use. Every asset needs provenance, creator/brand authorization, use restrictions, and relevant decoder/extension review.
- Cost drivers to measure: asset creation/cleanup/rigging, texture/geometry download, CDN/storage/egress, decode time, GPU/JS memory, device testing, and visual-QA labor.
- Key risks: inconsistent scale/coordinates/topology/UVs, excessive draw calls/textures, registration drift, clipping, missing depth/occlusion, implausible deformation, unsupported graphics devices, and physical-fit inference.

### Required evidence and go/no-go

- Written asset contract: units, axes, mesh/topology, UVs, PBR material policy, texture limits, LODs, skeleton/rigging, metadata, rights/provenance, validation output, and fallback imagery.
- Inspect a small rights-cleared representative asset set for file size, load/decode, draw calls, frame time, GPU/JS memory, first render, registration drift, error recovery, and device coverage.
- M5 additionally requires representative pose/overlap cases and blinded visual review of clipping, deformation plausibility, occlusion, and failure presentation. No result may be presented as physical fit.
- **Go for M4:** WebGL baseline, asset provenance, and M4 quality/performance gates pass. **Go for M5:** M4 passes and occlusion/deformation quality gates pass. **No-go/defer:** assets lack rights/required metadata or performance/visual outcomes fail. WebGPU non-support alone is not a blocker.

### Expected deliverables

1. Renderer/browser comparison and WebGPU enhancement decision record.
2. Garment-asset contract, provenance template, and validator inspection results.
3. M4 rendering benchmark and M5 visual-quality evaluation protocol.
4. Explicit fallback strategy and M4/M5 go/no-go recommendations.

## 5. Workstream C — Image-Based AI Virtual Try-On

**Roadmap relevance:** separate M0 research workstream; conditional M7 integration/hardening only if separately approved. It does not create a roadmap milestone. **Primary risks:** RSK-002, RSK-005, RSK-006, RSK-008, RSK-010.

### Research questions

1. Which architectures preserve garment attributes and user identity across intended categories, poses, skin tones, body diversity, and input quality—and how often do they fail?
2. What input contract is required: customer image, catalog garment image, category, garment/mask, human parsing/DensePose, consent, and deletion/retention metadata?
3. What are actual artifact sizes, GPU/VRAM needs, warm/cold latency, queue time, throughput, failure/retry rates, and cost per successful preview?
4. Is any candidate commercially usable after reviewing code, checkpoint, base model, preprocessors, training/evaluation datasets, provider terms, and output/data-use restrictions?
5. Is inference-only viable? Is training/fine-tuning prohibited until a commercially usable, consented, rights-cleared dataset is demonstrated?

### Candidate technologies and alternatives

- **Research benchmark candidates only:** IDM-VTON (diffusion-based; person/garment inputs with DensePose-derived and agnostic-mask inputs; 15–30 steps documented in its model card) (S11–S13); CatVTON (ICLR 2025; official materials state 899.06M parameters, 49.57M trainable parameters, and under 8 GB VRAM for 1024×768 inference) (S14–S16); VITON-HD, StableVITON, and Dress Code as baselines/dataset references (S17–S20).
- **Verified commercial constraint:** IDM-VTON and CatVTON code/weights are CC BY-NC-SA 4.0; VITON-HD data is research/non-commercial. They are not production candidates without separately documented rights (S11, S12, S14, S15, S17, S18).
- **Alternatives to consider:** commercial providers only after data-processing, location, retention, training-use, output rights, security, and deletion terms are reviewed; other original/reproducible open models only after their whole dependency chain is cleared.

### Licensing, cost, performance, and risks

- A candidate passes licensing only when source, code, weights/checkpoint, base model, preprocessing models, inference host, dataset/derived data, output terms, and third-party notices are all commercially acceptable. “Repository available” and “model card present” are not sufficient.
- Measure selective-GPU economics separately from live CV: asynchronous image generation may tolerate a queue, but needs quotas, cancellation, capacity limits, cost telemetry, and a non-AI fallback.
- Key risks: identity/garment distortion, category failures, unsafe outputs, biased quality, model hallucination, insufficient consent, retention/deletion gaps, unbounded GPU cost, and a visual preview being mistaken for fit validation.

### Required evidence and go/no-go

- Candidate matrix with architecture, inputs/outputs, parameter/artifact size, VRAM/latency/throughput measurements, training/inference availability, maintenance activity, code/weight/data/dependency licenses, and model-card limitations.
- Rights-cleared and consented evaluation set plus predefined measures for garment-detail and identity preservation, pose/category/body/input diversity, unsafe/incorrect outputs, retry/failure, and human review. Red-team/adversarial and deletion/retention tests are mandatory.
- **Go:** only with a rights-cleared production path, representative quality/safety evidence, explicit non-fit disclosure, consent/access/deletion design, bounded unit economics, and fallback. **No-go:** for any unresolved rights chain, unacceptable distortion/safety outcome, absent data controls, or unbounded cost. Training/fine-tuning is no-go without an independently cleared dataset.

### Expected deliverables

1. Model/license/dependency matrix and commercial-rights decision record.
2. Input/output contract and privacy lifecycle proposal.
3. Reproducible offline evaluation and cost/latency benchmark protocol/results.
4. Safety, bias, quality, and user-comprehension evaluation plan.
5. Conditional M7 integration recommendation or explicit defer/no-go.

## 6. Workstream D — Backend, Database, and AI Architecture

**Roadmap relevance:** M0 architecture evidence for M1/M2/M6 and any conditionally justified AI boundary. **Primary risks:** RSK-006, RSK-009, RSK-012, RSK-013, RSK-016.

### Research questions

1. Can a modular monolith serve M2 commerce and M6 wardrobe/stylist capabilities while retaining a clean, versioned job/inference boundary?
2. Does PostgreSQL plus structured filters/full-text search and pgvector meet representative catalog/wardrobe retrieval quality, latency, and memory needs?
3. Which model classes export to ONNX without unacceptable quality/operator regressions, and does ONNX Runtime improve target deployment performance enough to justify its complexity?
4. Under what measured condition would a dedicated AI service be safer or cheaper: GPU runtime, queue isolation, independent scaling, incident containment, or sensitive-data lifecycle?

### Candidate technologies and alternatives

- **Candidates:** Next.js/React/TypeScript client; Python/FastAPI modular-monolith API; PostgreSQL with pgvector; PyTorch for research/training and ONNX Runtime where export/benchmark evidence supports it.
- **Verified:** Next.js self-hosting requires cache coordination considerations when horizontally scaling (S21); FastAPI supports multiple worker processes, which can multiply model memory if models are loaded per worker (S22); `jsonb` is indexable but is not a substitute for core relational commerce data (S23); pgvector provides exact and HNSW/IVFFlat approximate search with speed/recall/memory/build trade-offs (S24, S25); PyTorch export and ONNX Runtime performance are model/operator/provider-dependent (S26–S29).
- **Alternatives:** Next.js BFF plus separate Python inference boundary; Django/DRF if measured admin/workflow needs outweigh divergence; Postgres hybrid retrieval versus dedicated search/vector service only on measured scale/latency need; PyTorch eager/compiled versus ONNX Runtime; CPU versus CUDA; TensorRT only after NVIDIA-specific evidence.

### Licensing, cost, performance, and risks

- Next.js/React/FastAPI/Three.js/R3F/pgvector/PyTorch/ONNX Runtime licenses must be inventory-verified at selected version; PostgreSQL license and TypeScript Apache-2.0 status are official starting evidence (S21–S29).
- Cost/performance evidence must include cold/warm p50/p95, concurrency, CPU/RAM/GPU/VRAM, queue time, model-load time, retrieval recall/latency, write/index build cost, availability, and operational overhead.
- Key risks: premature distributed services, duplicated data/authorization, model-loaded worker memory multiplication, weak retrieval recall, stale source data, export incompatibility, unsupported execution-provider operators, and accidental exposure of sensitive records in logs/embeddings.

### Required evidence and go/no-go

- Request/data-flow and trust-boundary diagram; interface contracts; dependency and software-bill-of-materials inventory; representative retrieval-quality set; raw load/latency/concurrency results; export compatibility/quality report; capacity/cost model.
- **Go modular monolith:** default unless evidence shows an in-process/bounded-job deployment cannot safely meet GPU/runtime, scaling, queue isolation, security, or retention requirements. **Go pgvector:** only when representative recall/latency/memory targets pass. **Go ONNX Runtime:** only when target models export within an agreed quality tolerance and show a measured deployment benefit. Otherwise defer, rather than introducing services prematurely.

### Expected deliverables

1. Architecture options and decision record with an explicit modular-monolith boundary.
2. Data/source-of-truth and retrieval evaluation plan/results.
3. Model runtime/export compatibility report.
4. Capacity/cost model and conditions for a separately deployable AI service.

## 7. Workstream E — Infrastructure, Privacy, and Cost

**Roadmap relevance:** M0 controls evidence; gates later M1/M7 work. **Primary risks:** RSK-006, RSK-008–011, RSK-015–016.

### Research questions

1. What data classes, purposes, processors/locations, access roles, retention clocks, deletion propagation, backup behavior, and training-use prohibitions apply to camera frames, photos, generated previews, landmarks/body representations, product data, embeddings, prompts, audit events, and support logs?
2. What consent, access, deletion, incident, and vendor-assessment evidence is required before any camera/photo/body-data pilot?
3. What CPU-versus-GPU and managed-versus-self-hosted experiment design produces an evidence-based cost-per-successful-job model without speculative public prices?
4. What evidence would justify an isolated GPU worker/service rather than a modular-monolith job boundary?

### Candidate technologies and alternatives

- **Candidates to evaluate, not choose:** CPU-first baseline; conditional GPU worker for asynchronous image generation; browser-side CV/3D for latency-sensitive interactions; Postgres/pgvector monitoring practices; approved provider storage/queues only after market, region, data residency, and availability decisions.
- **Verified:** ONNX Runtime has multiple execution-provider options whose support/performance depend on model and hardware (S27–S29); pgvector documents HNSW/IVFFlat trade-offs and recommends recall/query-plan monitoring (S25); NIST Privacy Framework is a voluntary risk-management framework, not jurisdiction-specific compliance advice (S30).
- **Alternatives:** different region/provider/storage/queue options and CPU/GPU configurations only after a data-processing and cost comparison. No provider is approved by this plan.

### Licensing, cost, performance, and risks

- Review provider terms, DPA/security commitments, data location, subprocessor chain, retention/deletion, model-training/data-use, incident notification, audit rights, and egress/storage/GPU pricing. Use official provider calculators only after region, hardware, storage, availability, and demand assumptions are approved; record inputs/date, not a timeless price claim.
- Compare CPU/GPU with measured p50/p95 end-to-end latency, throughput, cold starts, model load, VRAM/RAM, queue wait, failure/retry, utilization/idle time, and cost per successful preview/session. Instrument quotas, concurrency caps, cancellation, timeout, budget alerts, and fallback before a public pilot.
- Key risks: GPU idle/cold-start cost, VRAM exhaustion, queue tail latency, provider lock-in, cross-border transfers, deleted data in derivatives/backups, third-party training use, sensitive telemetry/logs, restore gaps, and operational/support burden.

### Required evidence and go/no-go

- Data inventory/lifecycle map; DPIA/privacy/legal review appropriate to chosen launch jurisdictions; consent text/design; provider assessment; threat model; authorization/deletion/restore/failure exercises; cost sensitivity model; incident and deletion runbooks.
- **Go for any camera/photo/body-data pilot:** only with approved purpose/consent, retention/deletion, access controls, processor/location, incident path, and non-camera alternative. **Go GPU:** only with a measured quality/latency benefit and bounded cost-per-successful-job. **Go separate service:** only if measurable operational/security benefit exceeds complexity. Otherwise defer.

### Expected deliverables

1. Data-classification and lifecycle/control matrix.
2. Provider and licensing due-diligence checklist.
3. CPU/GPU cost and capacity experiment protocol plus sensitivity model.
4. Privacy/security/operational readiness gates for future pilots.

## 8. Primary-source register

All URLs accessed 2026-11-04. These are investigation starting points, not endorsements or complete rights clearance.

| Ref. | Primary source |
|---|---|
| S1 | Google AI Edge, [Pose Landmarker overview](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker) |
| S2 | Google AI Edge, [Pose Landmarker for Web](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js) |
| S3 | MediaPipe, [Apache-2.0 license](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE) |
| S4 | OpenCV, [license and project information](https://opencv.org/license/) |
| S5 | Three.js, [MIT license](https://github.com/mrdoob/three.js/blob/dev/LICENSE) |
| S6 | React Three Fiber, [repository and MIT license](https://github.com/pmndrs/react-three-fiber) |
| S7 | Khronos, [glTF registry](https://registry.khronos.org/glTF/) |
| S8 | Khronos, [glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) |
| S9 | Three.js, [WebGPURenderer manual](https://threejs.org/manual/pages/webgpurenderer) |
| S10 | MDN, [WebGPU API compatibility guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) |
| S11 | IDM-VTON, [original repository](https://github.com/yisol/IDM-VTON) |
| S12 | IDM-VTON, [model card](https://huggingface.co/yisol/IDM-VTON) |
| S13 | IDM-VTON, [original paper](https://arxiv.org/abs/2403.05139) |
| S14 | CatVTON, [original repository](https://github.com/Zheng-Chong/CatVTON) |
| S15 | CatVTON, [model card](https://huggingface.co/zhengchong/CatVTON) |
| S16 | CatVTON, [original paper](https://arxiv.org/abs/2407.15886) |
| S17 | VITON-HD, [original repository](https://github.com/shadow2496/VITON-HD) |
| S18 | VITON-HD, [CVPR paper](https://openaccess.thecvf.com/content/CVPR2021/papers/Choi_VITON-HD_High-Resolution_Virtual_Try-On_via_Misalignment-Aware_Normalization_CVPR_2021_paper.pdf) |
| S19 | StableVITON, [original repository](https://github.com/rlawjdghek/StableVITON) |
| S20 | Dress Code, [original repository](https://github.com/aimagelab/dress-code) |
| S21 | Next.js, [self-hosting guide](https://nextjs.org/docs/app/guides/self-hosting) and [MIT license](https://github.com/vercel/next.js/blob/canary/license.md) |
| S22 | FastAPI, [server workers guide](https://fastapi.tiangolo.com/deployment/server-workers/) and [MIT license](https://github.com/fastapi/fastapi/blob/master/LICENSE) |
| S23 | PostgreSQL, [JSON types](https://www.postgresql.org/docs/current/datatype-json.html), [full-text search](https://www.postgresql.org/docs/current/textsearch.html), and [license](https://www.postgresql.org/about/licence/) |
| S24 | pgvector, [README](https://github.com/pgvector/pgvector) and [MIT license](https://github.com/pgvector/pgvector/blob/master/LICENSE) |
| S25 | pgvector, [performance, scaling, and monitoring](https://github.com/pgvector/pgvector#performance) |
| S26 | PyTorch, [ONNX export](https://docs.pytorch.org/docs/stable/onnx.html) and [BSD-style license](https://github.com/pytorch/pytorch/blob/main/LICENSE) |
| S27 | ONNX Runtime, [execution providers](https://onnxruntime.ai/docs/execution-providers/) |
| S28 | ONNX Runtime, [architecture](https://onnxruntime.ai/docs/reference/high-level-design.html) and [MIT license](https://github.com/microsoft/onnxruntime/blob/main/LICENSE) |
| S29 | ONNX Runtime, [performance guidance](https://onnxruntime.ai/docs/performance/) and [mobile operator-support guidance](https://onnxruntime.ai/docs/tutorials/mobile/) |
| S30 | NIST, [Privacy Framework](https://www.nist.gov/privacy-framework) |

## 9. Sequencing and decision gates

1. **First recommended approved workstream: A — CV and Body Tracking.** It de-risks the earliest critical M3 dependency and establishes camera/device/privacy boundaries that influence all later try-on work.
2. In parallel only when separately approved, complete B asset/rendering viability and E data/control/cost design. Do not collect sensitive production data for either.
3. Evaluate C on a rights-cleared offline path before any product integration. Do not let a model demo establish production suitability.
4. Use D to consolidate measured findings into a conditional architecture decision. Retain modular monolith unless evidence meets the documented exception criteria.
5. No workstream outcome alone authorizes M1 or implementation. Phase 0.2 closes only after the evidence package, risk updates, and explicit decision review are complete.
