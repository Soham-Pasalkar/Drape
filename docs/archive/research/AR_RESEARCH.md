# DRAPE — Workstream A: Computer Vision and Body Tracking Research

**Phase:** 0.2 Technology Evaluation, M0 research activity supporting M3.
**Status:** Research complete; no implementation, package installation, device benchmark, or technology selection authorized.
**Prepared / sources accessed:** 2026-11-04.

## 1. Executive summary

DRAPE can investigate browser-based pose tracking for **visual garment registration**, but the available evidence does not establish body measurement, body-shape reconstruction, garment sizing, drape, comfort, or physical fit. The current leading evaluation candidate is MediaPipe Tasks Vision Pose Landmarker for Web, compared against TensorFlow.js MoveNet Lightning/Thunder. ONNX Runtime Web is a conditional runtime comparison once a separately rights-cleared pose model and reproducible ONNX graph exist. OpenCV is useful for supporting camera/image geometry work, not learned human-pose estimation.

No DRAPE hardware, browser, latency, memory, battery, thermal, landmark-stability, or visual-registration measurement was run in this workstream. All such outcomes are therefore **not measured**. A controlled M3 protocol is specified below; all numerical gates remain **TBD — requires explicit approval before testing.**

**Recommendation:** proceed only to a separately approved, on-device-first M3 evaluation that compares MediaPipe Lite/Full/Heavy and MoveNet Lightning/Thunder under the same test matrix. Use a Worker experiment where the selected runtime permits it, retain a non-camera path, and do not persist frames or landmarks by default. **Confidence: moderate** for this research/evaluation direction; **low** for production suitability until the protocol is executed.

## 2. Research scope and methodology

### Scope

The central question is whether visible landmarks can be tracked across representative browsers, devices, environments, and poses well enough to support an explicitly bounded visual preview. This supports FR-012/FR-013 and NFR-001–003, but does not alter their restrictions or authorize M4/M5 choices.

### Method

- Used official documentation, original repositories, official API references, standards/vendor platform documentation, the original 1€ filter paper, and license files. Sources and access dates are in Section 17.
- **Verified** means the cited source directly supports the claim. **Assumption** means it requires DRAPE measurement or policy approval. **Recommendation** is a proposed evaluation/design choice, not an approved architecture.
- A source that does not publish a browser matrix, model memory value, or benchmark is recorded as an unknown; no synthetic benchmark was created.
- Source/license review applies independently to code, WASM/runtime, model bundle/weights, CDN/hosting, preprocessing, and any future data. A permissive code license is not blanket commercial clearance.

## 3. MediaPipe Pose Landmarker investigation

### Verified evidence

- The current documented web task is `@mediapipe/tasks-vision`, initialized using `FilesetResolver` and `PoseLandmarker.createFrom…`; this is a different API from the prototype’s legacy global `new Pose()` usage (S1, S2).
- Lite, Full, and Heavy Pose Landmarker bundles are published. Google lists a `224×224×3` detector and `256×256×3` landmark model, float16, for each; its model-card material reports approximately 3 MB, 6 MB, and 26 MB respectively (S1, S3). Exact artifact revision, delivery size, decompressed memory, and initialization behavior are **not measured for DRAPE**.
- Output contains 33 approximate anatomical landmarks. Normalized image `x`/`y` are relative to image dimensions; image-coordinate `z` is hip-midpoint-relative and roughly scaled by `x`. World `x`/`y`/`z` are documented in metres with hip midpoint origin. Landmarks expose visibility; the documented web output also exposes presence (S1, S2, S4).
- `IMAGE` and `VIDEO` modes are available. `detect()` and `detectForVideo()` are synchronous and can block the UI thread; Google recommends Web Workers for video-frame processing (S2, S4).
- Optional segmentation masks are off by default and can return a per-pixel likelihood mask for detected people (S2, S5, S6). They are not documented as body depth, clothing depth, collision geometry, or occlusion truth.
- Defaults include one pose and 0.5 detection, presence, and tracking thresholds (S5). These are library defaults, **not approved DRAPE thresholds**.
- MediaPipe repository code is Apache-2.0 (S7). Exact model asset/bundle terms, version, provenance, third-party notices, and delivery method must be inventoried separately.

### What world landmarks do—and do not—mean

**Verified:** the API reports world-landmark coordinates in metres centered at the hips (S1, S2).
**Recommendation/constraint:** treat those values as model-estimated landmark coordinates used for visual registration research only. They do not establish an individual body scan, calibrated anthropometry, exact dimensions, garment size, drape, comfort, or physical fit. This follows the documented output semantics plus RSK-001/002 and is mandatory for DRAPE communications.

### Strengths, limitations, and evidence gaps

It offers more landmark detail than MoveNet’s 17 keypoints and optional segmentation, making it the strongest initial registration candidate. The official web materials inspected do not publish a DRAPE-ready device/browser support matrix, fixed web memory requirement, device-specific latency, or a product-lifecycle stability guarantee. Those gaps require the M3 protocol.

## 4. MoveNet investigation

### Verified evidence

- TensorFlow.js MoveNet returns 17 named 2D keypoints with `x`, `y`, and `score`; single-person output is `[1, 1, 17, 3]` (S8–S10).
- `SINGLEPOSE_LIGHTNING` is the latency-oriented option; `SINGLEPOSE_THUNDER` is the higher-accuracy/slower option. Lightning uses 192×192 input and Thunder uses 256×256 in TensorFlow’s tutorial (S8, S10).
- The published API includes optional temporal smoothing, enabled by default; it relies on video `currentTime` or a supplied timestamp (S8).
- Official MoveNet materials describe WebGL and WASM paths and include historical benchmark tables for stated hardware/backends. They are comparative reference data only, not DRAPE performance outcomes (S8, S9).
- TensorFlow.js code is Apache-2.0 (S11). The selected model artifact’s source/provenance/license remains a separate inventory item.

### Comparison with MediaPipe

MoveNet has fewer landmarks, no documented equivalent segmentation output in this API review, and less torso/body detail for registration. Its Lightning variant is a meaningful low-latency benchmark candidate; Thunder tests the quality/latency trade-off. MediaPipe’s 33 landmarks make it the higher-detail candidate. Neither cited source supports sizing, measurement, garment drape, or fit claims.

**Recommendation:** benchmark both MoveNet variants against MediaPipe variants using the identical capture, crop, orientation, smoothing, device, browser, and failure matrix. Do not select based on generic fitness benchmarks or model name.

## 5. ONNX Runtime Web investigation

### Verified evidence

- ONNX Runtime Web supports browser/Node inference. Its documented default portable path is WASM; WebGL, WebGPU, and WebNN are alternative execution providers. WASM supports all listed `ai.onnx`/`ai.onnx.ml` operators while GPU/provider coverage is subset-dependent (S12–S14).
- Its published compatibility table lists broad WASM coverage across desktop/mobile browser families; WebGPU excludes important Safari, Firefox, and iOS combinations; WebGL is documented as maintenance mode (S12). WebGPU and WebNN are experimental/provider-dependent.
- Browser-side inference can reduce server communication and cloud serving cost, and can work offline after model availability, but the model must be practical for client hardware (S13).
- ORT format and custom runtime builds may reduce binary/initialization/peak-memory costs in suitable cases. They are optimizations, not evidence that an arbitrary pose graph will run, be faster, or be accurate (S13).
- ONNX Runtime code is MIT-licensed (S15). Runtime rights do not clear the selected model, export source, weights, preprocessors, training artifacts, or data.

### Risks and assessment

ONNX Runtime Web is not a pose estimator: output semantics, accuracy, model size, and commercial suitability depend entirely on the selected model. A model can export yet fail provider/operator coverage, behave differently between WASM and GPU paths, or offer no performance benefit. Conversion, preprocessing/postprocessing parity, model diagnostics, browser asset delivery, and model rights add integration risk.

**Recommendation:** evaluate ORT only after a specific rights-cleared model has a reproducible ONNX export. Start with WASM and feature-detect WebGPU solely as progressive enhancement. It is a conditional comparison path, not the default M3 implementation candidate.

## 6. OpenCV supporting-role investigation

OpenCV calibration documentation estimates **camera** intrinsics and distortion from images of known patterns such as chessboard, ChArUco, or circle patterns (S16–S18). This may be useful for controlled research into camera geometry, coordinate transformations, crop/rotation normalization, image-quality checks, and filtering. It does not estimate a user’s human dimensions from a monocular webcam and must not be described as anthropometry or a fit engine.

OpenCV 4.5+ is Apache-2.0 (S19). Exact version and any distribution/third-party artifacts remain inventory requirements.

**Recommendation:** retain OpenCV as an optional utility layer only if a documented M3 experiment shows it improves a concrete calibration or image-quality problem. Do not position it as a pose-model alternative.

## 7. Comparative technology matrix

| Dimension | MediaPipe Pose Landmarker | MoveNet via TensorFlow.js | ONNX Runtime Web + pose model | OpenCV utility layer |
|---|---|---|---|---|
| Role | Complete pose task candidate | Complete pose task candidate | Runtime; model must be supplied | Classical CV utility, not pose model |
| Landmark output | 33 approximate landmarks; normalized/image and world outputs; visibility/presence (S1–S4) | 17 scored 2D keypoints (S8–S10) | Depends on chosen model | None by itself |
| Segmentation | Optional person likelihood mask (S5–S6) | Not established by sources reviewed | Model-dependent | Not learned person segmentation |
| Video/thread behavior | `detectForVideo` synchronous; Worker recommended (S2) | Runtime/thread behavior requires target test | Provider/model/worker behavior requires target test | Utility behavior depends on chosen web/native path |
| Latency/memory | No DRAPE values measured; test Lite/Full/Heavy | Historical upstream references only; no DRAPE results | No model-independent claim possible | Depends on chosen operations |
| Browser path | Web Tasks; exact support matrix unmeasured | TFJS WebGL/WASM documented (S8) | WASM baseline; GPU providers conditional (S12–S14) | Depends on distribution/runtime |
| Licensing | Apache-2.0 code; model assets must be checked (S7) | Apache-2.0 code; model artifacts must be checked (S11) | MIT runtime; all model/export/data rights separate (S15) | Apache-2.0 4.5+; distribution review needed (S19) |
| Maintenance signal | Current official Google AI Edge Web/API documentation | Active original TFJS model repository; exact release support must be checked | Active official ORT documentation/repository; runtime only | Mature official project; utility scope |
| Privacy potential | On-device path possible; model delivery must be controlled | On-device path possible; model delivery must be controlled | On-device path possible after model availability (S13) | Local utility possible; chosen delivery determines data flow |
| DRAPE suitability | Highest-priority benchmark candidate | Required comparison candidates: Lightning + Thunder | Conditional runtime experiment | Supporting utility only |

**Interpretation:** table entries are verified only where sourced; all actual stability, latency, memory, compatibility, and fashion-registration quality are assumptions pending M3 measurement.

## 8. Camera calibration proposal

This proposal is for **visual registration calibration**, not body measurement or camera-intrinsic calibration.

1. Explain purpose, limits, local/on-device data path, retention, stop control, and non-camera alternative immediately before permission.
2. Request camera only after explicit user action; use secure context and handle pending, denied, unavailable, constrained, and policy-blocked states (S20–S22).
3. Record selected front/rear camera and normalize orientation, mirroring, aspect ratio, crop, and coordinate transforms. Mirror is a display choice and must not silently invert model-to-render mappings.
4. Guide a neutral/reference pose with sufficient torso/shoulder/hip visibility, practical framing/distance instructions, and lighting feedback. Do not request or infer body measurements.
5. Require a temporary, confidence/stability gate before enabling visual overlay; show retry or product imagery/size guidance when quality is insufficient.
6. On loss, low confidence, orientation change, background/visibility change, or app lifecycle interruption, hold/fade/reset rather than present stale placement as reliable; make recovery explicit.
7. Stop media tracks on visible Stop, fatal error, timeout/inactivity, and tested page/background lifecycle conditions; confirm stopped state.

Camera intrinsic calibration can be a separate controlled research activity using known patterns if required for a specific visual-geometry question. It is neither required nor sufficient for user anthropometry.

## 9. Landmark stability and smoothing analysis

### Failure conditions to test

Jitter, missing/low-confidence landmarks, hands/accessories across the torso, loose or structured clothing, fast movement, partial body, front/rear camera, portrait/landscape, crop/angle changes, lighting/background variation, body-proportion diversity, and pose diversity must be explicit test conditions.

### Candidate filters

| Method | Potential benefit | Trade-off / test requirement |
|---|---|---|
| Raw coordinates | Lowest processing latency | Jitter may be visually unacceptable; baseline only. |
| Exponential moving average | Small/simple; reduces noise | Fixed smoothing introduces lag and can trail fast movement. Test alpha and loss behavior. |
| 1€ (One Euro) filter | Adaptive low-speed smoothing/high-speed responsiveness; original paper describes varying cutoff by speed (S23) | Needs parameter tuning and comparative lag/jitter evidence; not selected by default. |
| Kalman filter | Can model state and uncertainty | Requires defensible motion/measurement assumptions and tuning; can extrapolate misleadingly on lost landmarks. |
| Confidence-aware wrapper | Can hold/fade/reset when quality falls | Must not silently freeze stale geometry or claim confidence; test thresholds and recovery. |

**Recommendation:** compare raw, EMA, One Euro, and a confidence-aware loss policy first. Add Kalman only if its assumptions and measured benefit justify complexity. Record positional jitter, response lag, overshoot, effective overlay drift, loss/recovery, and user-visible failure behavior. Smoothness must not mask unreliable tracking.

## 10. Browser and device compatibility matrix

No row below is a shipping guarantee. “Candidate” means the platform must be tested; exact OS, browser version, device, camera, capability detection, acceleration state, and pose runtime outcome must be recorded.

| Tier-1 test family | Camera / Worker / WASM / WebGL posture | WebGPU posture | Specific M3 concerns |
|---|---|---|---|
| Chrome desktop | Candidate; test directly | Feature-detect, never required | Camera selection, Worker path, GPU driver/acceleration. |
| Edge desktop | Candidate; test directly | Feature-detect, never required | Enterprise policy, camera permissions, GPU driver. |
| Firefox desktop | Candidate; test directly | Optional/uncertain; never required | ORT/TFJS runtime behavior, graphics/Worker variation. |
| Safari desktop | Candidate; test directly | Optional; version/system dependent | Camera lifecycle, memory, WebGPU availability. |
| Chrome Android | Candidate; test real devices | Optional/feature-detect | Thermal/battery throttling, backgrounding, camera constraints. |
| Safari iOS | Candidate; test real devices | Optional/uncertain; never required | Memory pressure, background/camera lifecycle, orientation. |

`getUserMedia()` requires a secure context, permission, and can fail for hardware/constraints/policy reasons; a permission prompt may remain unanswered (S20, S21). WebGL availability also depends on usable hardware/acceleration and context creation (S24, S25). Workers can access supported Web platform features (S26); WebAssembly worker paths warrant direct runtime testing (S27); WebGL worker paths warrant direct runtime testing (S24). WebGPU remains an optional enhancement, including on Safari/WebKit systems (S29, S30).

## 11. Performance measurement methodology

### Measurements

Collect model download/initialization, time to first usable landmark, per-inference and end-to-end latency p50/p95, effective tracking Hz, dropped frames, main-thread long tasks/UI responsiveness, landmark loss frequency, recovery time, filter lag/jitter, JS/WASM/GPU memory where observable, battery/thermal observations, permission/error/fallback outcome, and segmentation overhead when enabled.

### Reproducible collection

1. Pin runtime, model bundle/checkpoint, WASM, browser build, OS, hardware, camera, input constraints, renderer, and filter settings.
2. Use a fixed scenario script and repeated runs; record timestamps at capture, inference start/end, result acceptance, and render hand-off. Keep local raw diagnostic material only if separately approved; otherwise produce minimized aggregate metrics.
3. Record browser capability detection, worker/main-thread topology, network/cache state, power/thermal state, and all exclusions/failures.
4. Compare variants under the same input/crop/orientation and test matrix. Benchmark vendor numbers are context only, not substitutes.
5. Publish harness version/configuration, raw/aggregate results policy, methodology deviations, and confidence interval/variation treatment before interpreting results.

**All numerical pass thresholds:** **TBD — requires explicit approval before testing.** No target has been inferred from upstream benchmarks.

## 12. Privacy and security analysis

### Privacy-first design recommendation

- Default to on-device live-frame processing and in-memory data only. Do not upload, record, screenshot, persist landmarks, or call a provider/model endpoint by default.
- Before camera activation, obtain granular contextual opt-in that states purpose, visual-preview limitation, what leaves the device (default: nothing), retention, stop/delete behavior, and non-camera route.
- The application must visibly show camera state and Stop. Browser indicators do not replace product controls. A user/browser controls permission revocation; the Permissions API cannot revoke it (S20, S28).
- Stop tracks on Stop, fatal error, inactivity/timeout, and tested page/session/background transitions. Any saved preview is a distinct, explicit consent path under FR-015/016, not a by-product of live CV.
- Default telemetry to aggregate, non-image/non-landmark technical events. Landmark/raw-frame diagnostics require distinct purpose, access, retention, deletion, and review decisions.
- Serve via HTTPS; assess `Permissions-Policy` camera restrictions on actual targets; later use reviewed/version-pinned first-party delivery rather than opaque third-party scripts/CDNs where feasible (S20–S22).
- Permission denial, pending permission, no device, insecure context, policy denial, unsupported runtime, and low quality must lead to product imagery/size guidance, never a simulated confidence or blocked commerce.

### Security/data-flow concerns

Potential external requests include runtime/WASM/model bundle delivery, analytics, error reporting, fonts, and any CDN. Each must be inventoried with host, integrity/version pinning, purpose, recipient/location, retention, and failure behavior. On-device inference reduces a class of frame-transfer risk but does not eliminate supply-chain, logging, screen-capture, browser-extension, or future saved-output risks.

## 13. Licensing and dependency inventory

| Item | Current evidence | Required clearance before any use |
|---|---|---|
| MediaPipe code | Apache-2.0 (S7) | Exact Tasks package, WASM/runtime, Lite/Full/Heavy bundle URL/revision, model card/asset terms, notices, hosting/CDN. |
| TensorFlow.js code | Apache-2.0 (S11) | Exact package/version, MoveNet artifact/TF Hub provenance and terms, model hosting, notices. |
| ONNX Runtime | MIT (S15) | Exact web package/build/execution providers, selected model/exporter/weights/data/preprocessors, all license terms. |
| OpenCV 4.5+ | Apache-2.0 (S19) | Exact distribution/version, web/native build choice, included third-party artifacts. |
| 1€ filter paper/algorithm | Research reference (S23) | Implementation source/license if one is later adopted; paper citation is not a software dependency license. |
| Prototype CDN assets | Existing JSDelivr-loaded legacy MediaPipe scripts; not approved | Do not adopt without independent version, integrity, availability, privacy, and licensing review. |

No selected runtime/model has received a production commercial-license approval in this workstream.

## 14. M3 evaluation protocol

### Test matrix

- **Platforms:** the six Tier-1 families in Section 10, with exact device/OS/browser/camera and capability state recorded.
- **Candidates:** MediaPipe Lite/Full/Heavy; MoveNet Lightning/Thunder; optional ORT WASM path only after a rights-cleared comparable model/export is available.
- **Environments:** controlled, low, backlit, and mixed lighting; plain and cluttered backgrounds.
- **Camera/framing:** front/rear where offered, portrait/landscape, near/nominal/far framing, documented crop/aspect mapping.
- **Motion/visibility:** reference pose; torso/arm movement; rapid motion; partial body; sitting/standing only if in scope; hands/accessories crossing torso; loose and structured garments.
- **Participant diversity:** pre-approved protocol covering body proportions, skin tones, mobility, attire, hairstyles/accessories, and pose range. No test asks for or derives physical-fit measurements.

### Consent and data handling

Use non-personal synthetic/reference material first where it can answer a question. Any human-participant test needs approved consent, purpose, protocol, retention/deletion, access control, withdrawal route, and ethics/privacy review appropriate to scope. Collect only the minimum metrics; retain raw frames/landmarks only when specifically approved and necessary.

### Failure classification

1. Permission pending/denied or camera unavailable.
2. Insecure context, feature/enterprise policy, unsupported runtime, or context creation failure.
3. Capture constraint, orientation/crop mapping, or model-load/initialization failure.
4. Low confidence, occlusion, partial body, lighting/background, fast motion, or tracking loss.
5. Thermal/memory/performance degradation; worker/render hand-off issue.
6. Recovery or fallback failure; misleading visual-registration behavior.

### Decision criteria

Pre-approve numeric definitions for supported coverage, time-to-first-result, p50/p95, effective Hz, loss/recovery, visual drift, main-thread impact, memory, thermal/battery, and fallback completion. Each threshold is **TBD — requires explicit approval before testing.** The quality assessment measures visual overlay registration and failure handling, never physical fit correctness.

## 15. Risks, unknowns, and unresolved questions

- No selected model has demonstrated DRAPE device coverage, stability, or cost. M3 outcome may be defer/no-go.
- World landmarks/monocular camera output must not migrate into body measurement, size recommendation, or fit-score UI (RSK-001/002).
- Segmentation may help a visual effect but does not solve depth, garment/body occlusion, collision, deformation, or body reconstruction (RSK-003).
- Exact model artifact terms, model delivery, Worker topology, model memory, browser compatibility, and commercial provenance remain open for all candidates.
- Launch jurisdictions, retention policy, legal basis, age policy, participant research protocol, accessibility standard, and device-support target remain unresolved.
- No Phase 0.1 inconsistency was found. The prototype’s “fit score,” 98% accuracy, and 60fps claims conflict with existing FR-013 and are documented as non-reusable prototype copy, not a PRD change.

## 16. Recommendation and confidence level

**Recommendation:** request approval for a bounded M3 experiment, not implementation. Evaluate MediaPipe Pose Landmarker Lite/Full/Heavy and MoveNet Lightning/Thunder with on-device-first processing, a non-camera fallback, explicit preview-only wording, and the protocol above. Include an ORT WASM comparison only if a rights-cleared, comparable ONNX pose model is identified. Use OpenCV only where a measured camera/image-geometry need exists.

**Confidence:** moderate that this evaluation sequence is technically responsible; low that any candidate is production-ready before measurement and legal/data review. No final technology selection is made.

## 17. Go/no-go/defer recommendation for proceeding toward M3

**Current outcome: DEFER implementation; GO only for the separately approved M3 evaluation protocol.**

The protocol may proceed only after test thresholds, participant/data governance, device matrix, source/license inventory, and fallback acceptance are approved. Proceed from evaluation toward an M3 capability only when a candidate demonstrates approved stability/coverage/responsiveness, safe failure behavior, complete rights/provenance, consent and stop controls, no default retention, and no measurement/fit representation. Defer or stop if any of those gates fail.

## 18. Source register

All sources were accessed 2026-11-04. “Current/unspecified” means the primary page did not provide a fixed version in the reviewed material; pin an exact revision before a later experiment.

| ID | Exact URL | Organization | Version / license | Claims supported |
|---|---|---|---|---|
| S1 | https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker | Google AI Edge | Current web documentation; terms separate | 33 landmarks, model variants, coordinate semantics, input modes. |
| S2 | https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js | Google AI Edge | Current web guide | Tasks API, synchronous video calls, Worker recommendation, video/image inputs. |
| S3 | https://developers.google.com/static/ml-kit/images/vision/pose-detection/pose_model_card.pdf | Google | Pose model card PDF; exact bundle revision not established | Detector/landmarker shapes and approximate Lite/Full/Heavy sizes. |
| S4 | https://developers.google.com/edge/api/mediapipe/js/tasks-vision.poselandmarker | Google AI Edge | Current API reference | PoseLandmarker result/API semantics. |
| S5 | https://developers.google.com/edge/api/mediapipe/js/tasks-vision.poselandmarkeroptions | Google AI Edge | Current options API | Defaults and segmentation option. |
| S6 | https://developers.google.com/edge/api/mediapipe/js/tasks-vision.poselandmarkerresult | Google AI Edge | Current result API | Optional segmentation-mask result. |
| S7 | https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE | Google AI Edge | Apache-2.0 code license | MediaPipe source-code license. |
| S8 | https://github.com/tensorflow/tfjs-models/blob/master/pose-detection/src/movenet/README.md | TensorFlow | Current repository documentation; artifact version TBD | MoveNet variants, smoothing, supported backends, historic benchmarks. |
| S9 | https://github.com/tensorflow/tfjs-models/blob/master/pose-detection/README.md | TensorFlow | Current repository documentation | Pose Detection API/keypoint context. |
| S10 | https://www.tensorflow.org/hub/tutorials/movenet | TensorFlow | Current tutorial | 17 keypoints, input sizes, output shape. |
| S11 | https://github.com/tensorflow/tfjs/blob/master/LICENSE | TensorFlow | Apache-2.0 code license | TensorFlow.js source-code license. |
| S12 | https://github.com/microsoft/onnxruntime/blob/main/js/web/README.md | Microsoft | Current ORT Web README; MIT repository | Providers and compatibility table. |
| S13 | https://onnxruntime.ai/docs/tutorials/web/ | Microsoft | Current ORT Web guide | On-device trade-offs, ORT format/custom build options. |
| S14 | https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html | Microsoft | Current ORT Web documentation | Provider/session configuration context. |
| S15 | https://github.com/microsoft/onnxruntime/blob/main/LICENSE | Microsoft | MIT | ONNX Runtime code license. |
| S16 | https://docs.opencv.org/4.9.0/d4/d94/tutorial_camera_calibration.html | OpenCV | OpenCV 4.9 documentation | Camera intrinsic/distortion calibration concept. |
| S17 | https://docs.opencv.org/5.0/main_modules/calib.html | OpenCV | OpenCV 5.0 documentation | Calibration module scope. |
| S18 | https://docs.opencv.org/5.0/tutorials/calib3d/camera_calibration_pattern/camera_calibration_pattern.html | OpenCV | OpenCV 5.0 documentation | Calibration-pattern requirements. |
| S19 | https://opencv.org/license/ | OpenCV | Apache-2.0 for 4.5+ | OpenCV licensing. |
| S20 | https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia | MDN | Current reference | Secure context, permissions, errors, indicators. |
| S21 | https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts | MDN | Current reference | Secure-context rules. |
| S22 | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/camera | MDN | Current reference; limited/experimental note | Camera Permissions-Policy caveat. |
| S23 | https://pepite-depot.univ-lille.fr/LIBRE/HDR/2012/HDR2012LIL102.pdf | Casiez, Roussel, Vogel | 1€ Filter, CHI 2012; DOI 10.1145/2207676.2208639 | Adaptive smoothing principle. |
| S24 | https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API | MDN | Current reference | WebGL availability/hardware and Worker context. |
| S25 | https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext | MDN | Current reference | Context capability detection/failure. |
| S26 | https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Functions_and_classes_available_to_workers | MDN | Current reference | Worker API availability. |
| S27 | https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/Concepts | MDN | Current reference | WebAssembly/Worker sharing context. |
| S28 | https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API | MDN | Current reference | Permission-query/revocation limits. |
| S29 | https://webkit.org/blog/17640/webkit-features-for-safari-26-2/ | WebKit | Safari 26.2 feature note | WebGPU availability is evolving/version dependent. |
| S30 | https://webkit.org/demos/webgpu/ | WebKit | Current demo page | System/enablement caveat for WebGPU demos. |
