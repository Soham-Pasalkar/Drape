# DRAPE — Workstream C: Image-Based AI Virtual Try-On Research

**Phase:** 0.2 Technology Evaluation, M0 feasibility workstream; conditional M7 integration only if separately approved.
**Status:** Research complete. No model, provider, dataset, GPU environment, inference experiment, or implementation is authorized.
**Prepared / sources accessed:** 2026-11-05.

## 1. Executive summary

Image-based virtual try-on (VTON) can produce a **synthetic visual preview** from a user photograph and a garment image. It cannot establish physical garment fit, sizing, drape, comfort, or exact body dimensions. The feature carries critical quality, identity, privacy, cost, dataset, and licensing risks (especially RSK-005, RSK-006, RSK-008, and RSK-010).

The reviewed open candidates—IDM-VTON, CatVTON, VITON-HD, StableVITON, and Dress Code—are valuable research references but are excluded from commercial production/training under currently verified non-commercial or private-company-restricted terms. A public repository or model card does not clear the complete code, weights, base-model, preprocessing, dataset, hosting, or output-rights chain.

**Recommendation:** **DEFER implementation and production selection.** A future, separately approved inference-only evaluation may proceed only after identifying a rights-cleared model and evaluation-data path, approving privacy/data controls and a quality protocol, and establishing measured unit economics. A managed provider is a comparison option, not a shortcut around rights or privacy review. Confidence is high in the licensing exclusion of the named candidates; low in any commercial VTON path until those gates are met.

## 2. Scope and methodology

This report addresses photo-based VTON only, not Workstream A live camera/body tracking or Workstream B 3D garment rendering. It supports FR-014–016, UX-005/006/008, NFR-001–007/010, SEC-001–006, J-005, and conditional M7 planning. It does not change Phase 0.1 requirements or approve M7.

- **Verified:** directly supported by an original paper, official repository/model card/license, official dataset/provider documentation, or official terms.
- **Assumption:** a DRAPE-specific premise not yet measured or legally approved.
- **Recommendation:** a proposed gate or design direction, not a technology/provider selection.
- No package, checkpoint, image, dataset, provider account, GPU, model execution, benchmark, or user data was used. Consequently all DRAPE quality, latency, memory, capacity, price, and cost outcomes are **not measured**.

## 3. VTON architecture overview

VTON systems generally combine a person image, garment image, category information, and model-specific structural conditioning. Depending on the candidate, preprocessing may include human parsing, pose/DensePose, garment masks, and/or an agnostic-person representation. A diffusion/inpainting path then synthesizes pixels rather than simulating cloth physics.

**Verified examples:** IDM-VTON documents person and cloth images plus DensePose-derived and agnostic-mask inputs, with a Diffusers/SDXL inpainting route (S1–S3). CatVTON documents a diffusion approach, local preprocessing dependencies, and a mask-free variant (S4–S6). VITON-HD is a high-resolution paired-person/cloth benchmark focused on frontal woman/top-garment data (S7–S8). These approaches create images; they do not validate physical fit.

## 4. Model comparison

| Candidate | Architecture / inputs / output evidence | Published performance evidence | Availability / maintenance evidence | Commercial posture |
|---|---|---|---|---|
| IDM-VTON | ECCV 2024 diffusion VTON; repository layout uses person image, cloth image, DensePose image, and agnostic mask. Model card describes Diffusers/SDXL inpainting and 15–30 steps (S1–S3). | CUDA example at 1024²; no verified DRAPE VRAM/latency/throughput/artifact-size result. | Official repo exposes inference and training paths; exact maintenance/service commitment unresolved. | **Verified restrictive:** code/weights reported CC BY-NC-SA 4.0 (S1, S2, S13). Exclude absent separate commercial permission. |
| CatVTON | ICLR 2025 diffusion VTON; official materials describe DensePose/Detectron2/agnostic-mask preprocessing and a mask-free release (S4–S6). | 899.06M total / 49.57M trainable parameters and `<8 GB` VRAM at 1024×768 are upstream claims only (S5, S6). | Inference/evaluation code and weights published; training availability/version support must be rechecked at use. | **Verified restrictive:** CC BY-NC-SA 4.0; official materials describe demo/weights as non-commercial (S4, S5, S14). Exclude absent separate permission. |
| VITON-HD | CVPR 2021 high-resolution VTON; paired person/cloth preprocessing and 1024×768 frontal woman/top dataset (S7, S8). | Dataset: 11,647 train and 2,032 test pairs; upstream research, not DRAPE quality/performance. | Official repository includes test code/checkpoints; training/checkpoint details need exact version review. | **Verified restrictive:** repository material/data CC BY-NC 4.0; exclude production/training/fine-tuning (S7, S15). |
| StableVITON | CVPR 2024 latent-diffusion semantic-correspondence VTON (S9). | No DRAPE hardware/latency/quality data. | Official repository states inference, weights, and training code release; artifact chain remains review item. | **Verified restrictive:** repository states CC BY-NC-SA 4.0 (S9, S16). Exclude absent separate permission. |
| Dress Code | ECCV 2022 high-resolution multi-category VTON dataset/reference baseline (S10–S11). | Dataset/reference evidence only; not a production model. | Dataset access includes release agreement requirements. | **Verified restrictive:** official repository states dataset will not be released to private companies; exclude DRAPE dataset use (S10, S17). |

### Candidate conclusions

The above models may remain desk-research comparators. They are not approved for download, inference, training, fine-tuning, product integration, or provider hosting. No published paper metric, demo, VRAM statement, or model card establishes DRAPE quality, cost, safety, or commercial viability.

## 5. Complete license and rights-chain matrix

This is a technical rights inventory, not legal advice. “Verified permissive” applies only to the named component; it never clears other rows. Every unknown requires professional legal/procurement review before use.

| Component | Source | License / terms | Commercial use status | Unresolved issues |
|---|---|---|---|---|
| IDM-VTON source / weights | Official repo and model card (S1, S2) | CC BY-NC-SA 4.0 (S13) | **Verified restrictive** | Separate permission needed for commercial use; identify all pinned artifacts and attribution/share-alike obligations. |
| IDM-VTON base diffusion / preprocessors | Repo/model-card dependency chain (S1, S2) | Not cleared by IDM license alone | **Unknown / unresolved** | SDXL/base weights, DensePose, parsing, masks, runtime, dataset, output terms each need review. |
| CatVTON source / weights | Official repo and model card (S4, S5) | CC BY-NC-SA 4.0 (S14) | **Verified restrictive** | Separate commercial permission needed; verify mask-free branch/artifacts independently. |
| CatVTON DensePose/Detectron2 / masks | Official repo dependency material (S4) | Not cleared by CatVTON license | **Unknown / unresolved** | Exact versions, weights, training data and licenses required. |
| VITON-HD repo/data/checkpoints | Official repository/paper (S7, S8) | CC BY-NC 4.0 reported by repo (S15) | **Verified restrictive** | Research-only data/checkpoint terms must not be used for commercial training/evaluation. |
| StableVITON source/weights | Official repository (S9) | CC BY-NC-SA 4.0 (S16) | **Verified restrictive** | Base diffusion/preprocessing/data/output rights unresolved. |
| Dress Code dataset | Official repository/paper (S10, S11) | Private companies excluded; signed release agreement (S17) | **Verified restrictive** | Not a DRAPE training/evaluation dataset path. |
| PyTorch / Diffusers / inference runtime | Candidate dependency, not selected | License/version specific | **Unknown / unresolved** | Pin each runtime, CUDA/library/image dependency and review terms/notices. |
| Human parsing / pose / segmentation models | Model-specific dependencies | Model/dataset-specific | **Unknown / unresolved** | Source code is not sufficient; inspect weights, training data, model card, hosting. |
| Customer photo / garment image | DRAPE/user/brand controlled input | Product/policy/contract dependent | **Commercial permission required** | Consent, portrait/biometric/privacy, catalog/brand/photo/derivative rights, retention. |
| Generated preview | Model/provider/market dependent | Terms and applicable law dependent | **Unknown / unresolved** | Output ownership, display, training reuse, moderation, derivative and deletion terms. |
| Managed provider endpoint | Provider terms/model-specific terms | Provider-specific | **Commercial permission required** | DPA, location, subprocessors, retention, model rights, output terms, SLA/rate/price. |
| Replicate Customer Data license | Replicate Terms §§ 5.1–5.2 (S31) | Terms last updated 2026-04-01 | **Commercial permission required** | § 5.1 output rights remain subject to Third-Party Terms; § 5.2 grants Replicate a processing license that includes providing outputs/services, creating Resultant Data, and training/generating Customer Derivative Models. Contractual interpretation and suitability for sensitive photos require legal/procurement review. |

### CC BY-NC-SA 4.0 consequence

The Creative Commons attribution-noncommercial-sharealike license is explicitly non-commercial. DRAPE is a commercial e-commerce platform; therefore IDM-VTON, CatVTON, and StableVITON are excluded from commercial use under the verified terms unless the rightsholder grants distinct commercial permission. A non-commercial code/weight license cannot be cured by self-hosting, a permissive runtime, or a different UI. This is a licensing-risk finding, not legal advice.

## 6. Input contract

### Mandatory product-level request fields

| Field | Purpose | Status |
|---|---|---|
| Explicit VTON consent and policy version | Separate purpose/retention/disclosure agreement before upload | Mandatory for DRAPE recommendation. |
| Person image | Candidate model input | Mandatory; format/orientation/resolution are model-specific. |
| Garment/catalog image | Candidate model input | Mandatory; must have rights/provenance and a supported category. |
| Garment category | Select model route/validation and evaluate category-specific behavior | Mandatory; candidate values must be model-supported. |
| Request/job identifier | Safe asynchronous status/cancel/audit reference | Mandatory recommendation. |
| Input provenance and retention instruction | Control rights and lifecycle | Mandatory recommendation. |

### Model-specific preprocessing

IDM-VTON documents DensePose-derived and agnostic-mask inputs in addition to person/cloth images (S1–S3). CatVTON’s published path includes preprocessing dependencies and a mask-free variant (S4–S6). Parsing, segmentation, pose, garment mask, background normalization, crop, aspect ratio, lighting, and image-quality rules therefore cannot be assumed universal.

**Recommendation:** validate/reject corrupt, unsupported, unsafe, under-specified, pose-inadequate, category-incompatible, or policy-disallowed inputs with actionable non-sensitive reasons. Exact file-size, resolution, face/pose, lighting, background, and quality thresholds are **TBD — requires candidate-specific evidence and explicit approval before testing.**

## 7. Output contract

A future generation result should contain: generated image in the actually produced format/dimensions; opaque job ID; status; timestamps; model/checkpoint/preprocessing version; attempt/retry state; structured retryable/non-retryable error reason; retention/deletion state; and persistent “synthetic preview—not fit validation” disclosure.

Save/delete must be a distinct opt-in from generation. Do not expose source-image URLs, internal provider identifiers, private storage locations, or inferred body measurements. FASHN’s documented job/status/error pattern is evidence that asynchronous APIs can expose job identifiers and structured failures; it is not an endorsement of its schema (S18–S20).

## 8. Quality evaluation methodology

### Required dimensions

Assess garment category/silhouette; logo/text/print/texture/seam preservation; color consistency; person identity/face/body preservation; hands/arms/hair; garment boundaries/background; category, pose and input-quality sensitivity; diverse skin tones/body proportions; unsafe/incorrect output; and comprehension that the output is synthetic rather than fit validation.

### Metrics and limits

| Signal | Verified use / limitation |
|---|---|
| SSIM | Full-reference structural similarity; meaningful only where a valid paired ground truth exists. Does not isolate garment fidelity, identity, or fit (S21). |
| LPIPS | Learned perceptual full-reference distance calibrated to human patch comparisons; can still favor a plausible but wrong garment/face or penalize legitimate variation (S22). |
| FID | Set-level distribution comparison using Inception features, not an individual garment/identity correctness measure (S23). |
| CLIP-based similarity | Supplemental semantic diagnostic, not proof of logos, texture, person identity, body correctness, or fit (S24–S26). |
| Garment/identity-region checks | Useful only with disclosed model/rights/limitations; no universal metric selected. |
| Blinded human review | Required alongside automated measures for fidelity, artifact severity, identity preservation, and disclosure comprehension. |

Use paired SSIM/LPIPS only with rights-cleared valid references; FID/KID only on defined comparable sets; optional CLIP diagnostics only as supplementary signals. Original VTON research commonly combines automated distribution/perceptual scores with human studies, supporting a combined protocol rather than a single scalar (S6, S8, S27). No metric establishes physical fit.

## 9. Failure taxonomy

| Severity | Failure examples | Required handling |
|---|---|---|
| Critical | Non-consensual/unauthorized image handling, wrong-person identity substitution, prohibited content, severe misleading garment substitution, deletion/security failure | Stop output access; incident/escalation path; preserve minimum safe audit evidence. |
| High | Materially wrong category/logo/print, severe face/body distortion, unusable garment/person artifact | Do not present as successful preview; show safe retry/fallback. |
| Medium | Boundary, hand/hair, color, texture, or partial-garment artifact | Flag/retry/fallback according to approved policy; capture aggregate quality signal. |
| Low | Cosmetic background/minor texture difference that does not alter garment identity | Disclose/monitor; do not imply approval unless policy says so. |
| System | Invalid input, preprocessing/model/provider/queue/timeout/storage/retention/deletion/fallback failure | Structured error, cancellation/retry rules, no silent success. |

All severity definitions, reviewer calibration, escalation owners, and acceptance thresholds require approval before use.

## 10. GPU and performance comparison

| Candidate | Published upstream evidence | What remains unmeasured / unresolved |
|---|---|---|
| IDM-VTON | Model card describes Diffusers/SDXL inpainting and 15–30 steps; CUDA example at 1024² (S2, S3). | Parameter/artifact size, VRAM, GPU type, warm/cold latency, throughput, concurrency, batch, quality and cost for DRAPE. |
| CatVTON | 899.06M total, 49.57M trainable parameters; `<8 GB` VRAM at 1024×768 (S5, S6). | Exact checkpoint size, GPU, steps/mode, latency, throughput, batch, quality, cost, and all DRAPE results. |
| VITON-HD / StableVITON | Upstream research/source availability (S7–S9). | DRAPE hardware/performance/capacity and commercially usable artifact path. |
| Managed provider | FASHN v1.6 vendor documentation states processing inputs at 864 × 1296 px; typical mode times of about 5 seconds (performance), 8 seconds (balanced), and 12–17 seconds (quality, input-resolution dependent); and one credit per output image (S18). These are vendor-published figures, not DRAPE measurements or guaranteed service levels. | Current credit monetary price/plan, region, applicable terms, rate limits, output quality, retention and capacity for DRAPE. |

Upstream statements are hypotheses to reproduce only after authorization; no third-party or paper result is presented as a DRAPE measurement.

## 11. Unit economics methodology

Use asynchronous, cancellable jobs. Define:

```text
cost per successful preview =
(compute or provider inference + model hosting + queue/idle allocation + temporary/output storage
 + egress + moderation + observability + retry/failure + support costs)
/ completed, policy-valid previews
```

Instrument model/provider/version, image resolution, steps/mode/samples, GPU/CPU/RAM/VRAM, cold start/model load, queue wait, execution latency p50/p95, cancellation, timeout, retries, success/failure, output retention, storage/egress, and utilization. Perform sensitivity analysis for idle time, failure/retry rate, concurrency, steps/resolution, retention, and provider credits.

For FASHN v1.6, record vendor-published mode timing, 864 × 1296 processing dimensions, and one credit per output image as input assumptions only (S18). Monetary cost remains unresolved until the current credit price, plan, region, and applicable terms are verified. These vendor figures do not establish DRAPE latency, throughput, quality, utilization, or cost per successful preview.

Do not insert a price without an official dated source plus region, GPU/model/mode, storage/egress, utilization, and availability assumptions. No such DRAPE price is established here.

## 12. Privacy and data lifecycle

### Privacy-first lifecycle recommendation

1. Require separate contextual opt-in before upload: purpose, synthetic/no-fit limitation, recipient/provider, retention, output visibility, deletion route, and non-AI alternative.
2. Validate input before inference; encrypt in transit/at rest; use private storage and short-lived, single-purpose signed URLs when provider URLs are unavoidable.
3. Restrict records to minimum job/status/model/version events. Do not log raw images, face/body data, prompts, image URLs, or generated previews by default.
4. Define distinct retention/deletion clocks for upload, temporary processing, generated preview, metadata, retry copies, caches, provider copies, and backups. Test propagation and state exceptions.
5. Enforce tenant isolation, least-privilege service identities, access-authorized output delivery, quotas, cancellation/timeouts, abuse reporting/moderation, and incident response.
6. Prohibit training/evaluation reuse of customer inputs or outputs without separately approved purpose, consent/legal basis, access, retention, and deletion controls.

FASHN documents request-record retention without automatic deletion, output CDN expiry after three days, base64-output availability for 60 minutes, and no self-service deletion endpoint; URL strings and related records have distinct behavior (S28). The documented manual route for deleting request records is to contact `legal@fashn.ai` with the organization and relevant prediction IDs. This is not an API, automatic, immediate, or guaranteed deletion mechanism; output CDN expiry is a separate lifecycle from request-record deletion. These are material managed-provider review points, not a determination of legal sufficiency. NIST’s Privacy Framework is a voluntary risk-management aid, not jurisdiction-specific compliance advice (S29–S30).

Replicate defines Customer Data as inputs and outputs. Its current Terms § 5.1 state that the customer retains Customer Data ownership and grant output rights subject to applicable Third-Party Terms; § 5.2 grants Replicate a worldwide, non-exclusive, royalty-free license to process Customer Data, including to provide outputs/services, train and generate Customer Derivative Models, and create/compile Resultant Data (S31). This is neither a blanket no-training guarantee nor evidence of unrestricted general training on every input. The exact contract interpretation, data-flow scope, and suitability for sensitive customer photographs require legal/procurement review.

## 13. Security analysis

Risks include insecure upload/output URLs, cross-tenant access, overly broad service roles, raw-image/log exposure, provider/subprocessor transfer, malicious/unconsented image use, generated-output persistence, deletion gaps, model/pipeline abuse, and replay/denial-of-service through expensive jobs.

**Recommendation:** secure transport and storage; private signed URLs; validation/moderation; request/job authentication; authorization on every input/output/status action; per-user rate/quota/cancellation limits; short-lived output access; versioned provider/model records; minimized telemetry; security review; and tested deletion/incident procedures. A provider promise not to train on content does not resolve access control, retention, transfer, output rights, backup, or jurisdictional obligations.

## 14. Inference architecture comparison

| Option | Quality/control | Latency/cost | Privacy/operations | DRAPE posture |
|---|---|---|---|---|
| Self-hosted in controlled backend | Maximum model/version/data-path control | GPU operations, model load/idle, scaling and queue cost | Own patching, isolation, rights, data lifecycle, observability burden | Conditional future experiment only. |
| Separate GPU inference worker | Isolates model/GPU and queue policy from commerce boundary | Can scale independently but adds operational overhead | May justify a distinct sensitive-image lifecycle/incident boundary | Conditional only if measured GPU/runtime/scale/security need justifies it. |
| Managed provider | Fastest comparison path and async API capabilities | Provider pricing/rate/capacity/lock-in vary | Transfers images to provider/subprocessors; retention/terms/deletion must clear | Candidate comparison only. |
| Browser-side inference | Could avoid upload in theory | Diffusion model size/VRAM/operator/device quality unproven | Does not eliminate asset/license/supply-chain concerns | Not credible as a baseline without separate evidence. |

Retain the modular-monolith preference. Model image VTON as a future asynchronous job capability with queue limits, cancellation, timeout, retries, quotas, fallback, and no implicit persistence. A separate worker is an exception requiring evidence, not a default microservice decision.

## 15. Commercial provider comparison

| Provider / category | Verified capability / terms | Material constraints | DRAPE posture |
|---|---|---|---|
| FASHN API | `tryon-v1.6` stable and `tryon-max` preview; v1.6 accepts person and garment URL/data URI, category, modes, sample count, output choice; returns prediction ID and documented errors including `PoseError`. Vendor documentation states 864 × 1296 processing inputs, typical 5/8/12–17-second performance/balanced/quality modes, and one credit per output image (S18, S19). | Times/credits are vendor-published, not DRAPE measurements or SLA. Request records have no self-service deletion endpoint; FASHN documents a manual request to `legal@fashn.ai` with organization and prediction IDs. This is distinct from CDN-output expiry and is not automatic, immediate, guaranteed, or API-based. Data/subprocessor/DPA/legal review, rights, location, current credit monetary price/plan/region, rate and capacity still require review (S20, S28). | Managed-API comparison candidate; **Commercial permission required**, not selected. |
| Replicate platform | Current Terms define Customer Data as inputs/outputs; § 5.1 retains customer ownership and gives output rights subject to Third-Party Terms; § 5.2 grants Replicate a license to process Customer Data, including to provide outputs/services, train/generate Customer Derivative Models, and create Resultant Data (S31). | Platform agreement does not clear a VTON model, weights/dataset rights, DPA/location/retention/output rights, provider/model data use, or price. Exact interpretation/suitability for sensitive photos requires legal/procurement review; endpoint terms can vary (S32). | **Commercial permission required / unresolved**; not a VTON recommendation. |

No provider is assumed suitable merely because it has a demo, endpoint, or credit purchase. Pricing, model lifecycle, model/provider terms, data location, output rights, retention, deletion, rate limits, and SLA must be captured at the exact candidate/date before any use.

## 16. Dataset availability and rights analysis

VITON-HD and Dress Code are useful benchmark references but not commercially usable DRAPE dataset paths under verified restrictions (S7, S10, S15, S17). Training/fine-tuning is **NO-GO** without an independently rights-cleared, consented, commercially usable dataset with documented images, garment rights, labels, demographic/diversity policy, retention/deletion, redistribution, model-training, evaluation, and derived-artifact terms.

For a future inference-only quality study, construct or license a separate evaluation set only after governance approval. It must cover garment categories, pose, background/light, input quality, detail types (logos, text, prints, texture), skin tones/body proportions, and failure/abuse cases without repurposing customer content by default.

## 17. DRAPE-specific recommendation

- **Inference-only experimentation:** defer until a complete rights-cleared candidate and evaluation-data chain exist; do not download/execute current named candidates under verified terms.
- **Candidates worth tracking:** IDM-VTON, CatVTON, VITON-HD, StableVITON, and Dress Code as research references only; FASHN as a managed API due-diligence comparison candidate.
- **Excluded now:** IDM-VTON, CatVTON, VITON-HD, StableVITON, and Dress Code for commercial model/data use; browser-side diffusion as baseline.
- **Architecture:** preserve modular monolith; consider a separate GPU worker only after measured reason. Use asynchronous jobs, quotas, cancellation, retries/timeouts, and non-AI fallback.
- **GPU strategy:** no allocation now. Begin with a measured, rights-cleared inference-only evaluation; compare CPU/GPU/provider only after quality, privacy and cost gates.
- **Initial categories:** define only after a cleared candidate supports them and a rights-cleared evaluation set exists; do not infer category support from a paper.
- **Privacy:** consent, minimization, private uploads/outputs, deletion propagation, no training reuse, provider/DPA/location review, and explicit synthetic/no-fit disclosure are mandatory gates.
- **Fallback UX:** return to product imagery, size guidance, and transparent error/retry messaging; never block commerce or substitute a fit score.
- **Future M7 conditions:** rights-cleared end-to-end chain; approved data lifecycle/security; measured representative quality/safety/bias; user comprehension; bounded unit economics/capacity; versioning/monitoring; fallback; and explicit approval.

## 18. Risks and unresolved questions

- No commercially cleared open-model, dataset, or full dependency chain is identified.
- Replicate § 5.2 customer-data license and any provider/model-specific additional terms require legal/procurement assessment before sensitive customer-photo processing; platform output rights remain subject to applicable Third-Party Terms.
- Exact weights, base diffusion models, parsing/DensePose/segmentation dependencies, dataset provenance, and output rights remain unresolved for any potential candidate.
- No DRAPE measurements exist for VRAM, latency, cold start, throughput, quality, bias, safety, storage, egress, or cost.
- Launch jurisdictions, legal basis, age policy, data residency, DPA/subprocessor chain, backup deletion, incident duties, retention, and provider contractual terms remain open.
- Input quality requirements, category scope, evaluation thresholds, moderation policy, abuse handling, human-review ownership, and user-visible deletion/retention language require approval.
- A generated image can distort person identity or garment details and must never be presented as proof of fit.

## 19. Confidence assessment

**High confidence:** current named candidate license/dataset restrictions block commercial production/training as documented.
**Moderate confidence:** a controlled asynchronous job pattern and combined automated/human quality protocol are appropriate future evaluation directions.
**Low confidence:** commercial model/provider availability, product quality, cost, compatibility, and legal suitability until a specific cleared candidate is measured and reviewed.

## 20. GO / DEFER / NO-GO decision

- **Commercial deployment / M7 integration:** **NO-GO** now. No rights-cleared model/dataset/rights chain or measured safety/cost evidence exists.
- **Current named open candidates for commercial use:** **NO-GO** under verified restrictive terms unless separate commercial rights are obtained and complete dependency review passes.
- **Future inference-only evaluation:** **DEFER** pending a rights-cleared candidate, approved data/privacy protocol, evaluation set, success/failure thresholds, cost plan, and explicit authorization.
- **This workstream:** **GO complete** as desk research only; it does not authorize implementation or another milestone.

## 21. Primary-source register

All sources were accessed 2026-11-05. Mutable repository/model-card/provider pages must be pinned or captured with exact artifact/version before a future experiment.

| ID | Exact URL | Organization / author | Publication/version / license or terms | Claims supported |
|---|---|---|---|---|
| S1 | https://github.com/yisol/IDM-VTON | yisol et al. | Official repository; exact revision TBD | IDM-VTON layout, inference/training paths, inputs/dependencies. |
| S2 | https://huggingface.co/yisol/IDM-VTON | yisol | Official model card; CC BY-NC-SA 4.0 | IDM-VTON inpainting/steps, weight terms. |
| S3 | https://arxiv.org/abs/2403.05139 | Choi et al. | ECCV 2024 paper | IDM-VTON architecture context. |
| S4 | https://github.com/Zheng-Chong/CatVTON | Zheng-Chong et al. | Official repository; CC BY-NC-SA 4.0 | CatVTON preprocessing, availability, non-commercial posture. |
| S5 | https://huggingface.co/zhengchong/CatVTON | Zheng-Chong | Official model card; CC BY-NC-SA 4.0 | CatVTON parameter/VRAM and model terms. |
| S6 | https://arxiv.org/abs/2407.15886 | Chu et al. | ICLR 2025 paper | CatVTON architecture and upstream evaluation context. |
| S7 | https://github.com/shadow2496/VITON-HD | Choi et al. | Official repository; CC BY-NC 4.0 | VITON-HD data/code/checkpoint restrictions. |
| S8 | https://arxiv.org/abs/2103.16874 | Choi et al. | CVPR 2021 paper | VITON-HD benchmark/dataset context. |
| S9 | https://github.com/rlawjdghek/StableVITON | Kim et al. | Official repository; CC BY-NC-SA 4.0 | StableVITON availability/restriction. |
| S10 | https://github.com/aimagelab/dress-code | Morelli et al. | Official repository; private-company restriction | Dress Code access/terms. |
| S11 | https://arxiv.org/abs/2204.08532 | Morelli et al. | ECCV 2022 paper | Dress Code benchmark context. |
| S12 | https://creativecommons.org/licenses/by-nc-sa/4.0/ | Creative Commons | CC BY-NC-SA 4.0 deed/legal code | Non-commercial/share-alike license meaning. |
| S13 | https://github.com/yisol/IDM-VTON/blob/main/LICENSE.txt | yisol | CC BY-NC-SA 4.0 | IDM-VTON repository license. |
| S14 | https://github.com/Zheng-Chong/CatVTON/blob/main/LICENSE | Zheng-Chong | CC BY-NC-SA 4.0 | CatVTON repository license. |
| S15 | https://github.com/shadow2496/VITON-HD | Choi et al. | CC BY-NC 4.0 stated in repository | VITON-HD restriction cross-check. |
| S16 | https://github.com/rlawjdghek/StableVITON | Kim et al. | CC BY-NC-SA 4.0 stated in repository | StableVITON restriction cross-check. |
| S17 | https://github.com/aimagelab/dress-code | Morelli et al. | Dataset release agreement/private-company restriction | Dress Code restriction cross-check. |
| S18 | https://docs.fashn.ai/api-reference/tryon-v1-6 | FASHN | `tryon-v1.6`; stable model page | Inputs, categories, modes, outputs, PoseError; 864 × 1296 processing dimensions; vendor-published mode times; one credit per output. |
| S19 | https://docs.fashn.ai/api-overview/model-lifecycle | FASHN | Current lifecycle page | Stable/preview release status. |
| S20 | https://docs.fashn.ai/api-overview/api-fundamentals | FASHN | Current documentation | Async job/status API pattern. |
| S21 | https://www.ece.uwaterloo.ca/~z70wang/publications/ssim.html | Wang et al. | 2004 SSIM source | SSIM full-reference structural measure. |
| S22 | https://openaccess.thecvf.com/content_cvpr_2018/papers/Zhang_The_Unreasonable_Effectiveness_CVPR_2018_paper.pdf | Zhang et al. | CVPR 2018 | LPIPS perceptual-distance scope/limits. |
| S23 | https://arxiv.org/abs/1706.08500 | Heusel et al. | NeurIPS 2017 | FID distribution-level metric. |
| S24 | https://arxiv.org/abs/2103.00020 | Radford et al. | CLIP paper, 2021 | CLIP representation/supervision context. |
| S25 | https://openai.com/index/clip/ | OpenAI | CLIP release | CLIP official context. |
| S26 | https://arxiv.org/abs/2108.02818 | Agarwal et al. | CLIP evaluation paper | Downstream limitation context. |
| S27 | https://huggingface.co/zjuJish/VITON-HD/blame/main/VITON-HD/eval/tryon-fid.py | VITON-HD authors | Official evaluation script | Upstream VTON metric practice. |
| S28 | https://docs.fashn.ai/api-overview/data-retention-privacy | FASHN | Current privacy/retention documentation | Request-record retention; output expiry; no deletion endpoint; manual deletion request to `legal@fashn.ai` with organization and prediction IDs; training-use/subprocessor claims. |
| S29 | https://www.nist.gov/privacy-framework | NIST | Privacy Framework | Voluntary privacy-risk management framework. |
| S30 | https://www.nist.gov/system/files/documents/2020/01/16/NIST%20Privacy%20Framework_V1.0.pdf | NIST | Privacy Framework v1.0 | Framework limitations/context. |
| S31 | https://replicate.com/terms/ | Replicate | Terms last updated 2026-04-01; accessed 2026-11-05 | Customer Data definition; §§ 5.1–5.2 ownership/output/processing license; Customer Derivative Models; Third-Party Terms. |
| S32 | https://replicate.com/luma/photon-flash/readme | Replicate / Luma | Example model disclosure | Provider/model-specific downstream transfer variation. |
