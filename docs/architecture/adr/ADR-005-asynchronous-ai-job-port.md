# ADR-005: Asynchronous AI Job & Inference Interface

* **Status:** accepted
* **Deciders:** Technical Architect (Antigravity Agent), Human Project Owner
* **Date:** 2026-11-05
* **Technical Story:** Links to PRD Requirements [`FR-023`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#fr-023)–[`FR-029`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#fr-029), [`NFR-003`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#nfr-003) and Risks [`RSK-003`](file:///Users/soham/Github/Drape/docs/aidlc/RISK_REGISTER.md#rsk-003), [`RSK-006`](file:///Users/soham/Github/Drape/docs/aidlc/RISK_REGISTER.md#rsk-006)

## Context and Problem Statement

DRAPE's Image-Based Virtual Try-On (VTON) allows customers to voluntarily upload a full-body photograph to generate a photorealistic synthetic preview of themselves wearing a catalog garment.

Image generation using modern diffusion or GAN models requires significant GPU computation with variable latencies ranging from 5 to 30+ seconds. Web servers cannot hold open synchronous HTTP connections for this duration without exhausting connection pools and causing timeouts. Furthermore, AI inference backends will evolve (from commercial APIs like FASHN in early pilots to dedicated self-hosted open-weights workers in later scale). How should the AI job orchestration and inference interface be structured?

## Decision Drivers

* **Resilient Non-Blocking Orchestration:** Long-running GPU tasks must never tie up synchronous web application worker threads or HTTP proxy connections.
* **Vendor & Backend Decoupling:** The core commerce and wardrobe domains must remain completely agnostic to whether inference runs on a local GPU worker or a third-party managed SaaS API.
* **Idempotency, Retries & Cancellation:** Network glitches or transient GPU failures must be gracefully retried without double-billing, and customers must be able to cancel in-flight jobs.
* **Strict Licensing Governance:** Models deployed must be legally cleared for commercial fashion e-commerce, strictly excluding non-commercial CC BY-NC-SA weights ([`RSK-003`](file:///Users/soham/Github/Drape/docs/aidlc/RISK_REGISTER.md#rsk-003)).

## Considered Options

* **Option 1: Synchronous HTTP Proxying to GPU Engine** (FastAPI endpoint holds HTTP connection open while awaiting GPU inference completion).
* **Option 2: Persistent Bidirectional WebSockets** (browser maintains active WebSocket connection for job submission, progress streaming, and binary frame delivery).
* **Option 3: Decoupled Asynchronous Job Port with Queue Orchestration** (REST submission returns `202 Accepted` with `job_id`; background queue worker executes tasks via an abstract `InferenceJobPort`; client polls or receives Server-Sent Events).

## Decision Outcome

Chosen option: **"Option 3: Decoupled Asynchronous Job Port with Queue Orchestration"**, because it completely decouples the user-facing web request cycle from unpredictable GPU execution times. An abstract hexagonal domain port (`InferenceJobPort`) allows seamless adapter switching between external commercial APIs (e.g. FASHN API) and internal self-hosted GPU workers without touching business logic.

### Architectural Specification

1. **Job Creation & Direct Staging:**
   - Client requests job creation: `POST /api/v1/try-on/jobs` with an explicit `idempotency_key`.
   - API verifies customer consent, enforces rate limits, checks for duplicate idempotency keys, and generates an upload target in private object storage.
   - Client uploads image directly to object storage via presigned URL, bypassing the backend API.
2. **Transactional Coordination (PostgreSQL & Queue via Transactional Outbox):**
   - Client signals readiness: `POST /api/v1/try-on/jobs/{id}/start`.
   - To eliminate dual-write failure modes (where PostgreSQL commits but the queue push fails, or vice versa), DRAPE adopts a **Transactional Outbox pattern**:
     - Inside a single PostgreSQL transaction, the job row transitions to `QUEUED` and an event row is written to `ai_job_outbox (job_id, payload, created_at)`.
     - An outbox dispatcher (or candidate queue runner evaluating ARQ/Redis or PostgreSQL `SKIP LOCKED` workers) reads outbox entries and dispatches tasks to worker processes with at-least-once delivery guarantees.
3. **Idempotency, Retries & Cancellation Races:**
   - **Idempotency:** Repeated submissions with the same `idempotency_key` return the existing active job rather than spawning redundant GPU workloads or incurring double charges.
   - **Retries & Error Classification:** Retries apply strictly to transient infrastructure errors (HTTP 502/503/504, connection timeouts) with exponential backoff and jitter (maximum 2 retries). Non-retryable errors (content safety moderation violation, face/pose detection failure) transition immediately to `TERMINAL_FAILURE`.
   - **Cancellation Race Management:** If a customer cancels (`POST /jobs/{id}/cancel`) while a worker is executing inference:
     - Optimistic concurrency control (`version` column) transitions status to `CANCELLED`.
     - The background worker polls the cancellation status before persisting results; if marked cancelled, the worker invokes `InferenceJobPort.cancel_job(provider_job_id)` on the downstream runner as a best-effort cancellation, discards any returned preview, and suppresses customer billing charges. Because external GPU runners may not support preemptive cancellation once kernel execution begins, DRAPE may still incur underlying compute or API execution costs with the provider despite customer billing suppression.
4. **Status Polling & Server-Sent Events (SSE):**
   - Client monitors status via `GET /api/v1/try-on/jobs/{id}` (polling at 2–3s intervals) or through an SSE event stream (`/api/v1/try-on/jobs/{id}/events`).
5. **Downstream Provider Deletion Distinction:**
   - When customer images or task records are purged, `InferenceJobPort.request_provider_data_deletion()` dispatches a formal purge request.
   - The returned ticket/dispatch ID is recorded strictly as `REQUEST_SUBMITTED` (`external_provider_status`), preserving the mandatory distinction between submission acknowledgement and verified deletion confirmation.

### Model Licensing & Unit Economics Governance

* **Commercial License Mandate:** Only models with verified commercial rights chains (e.g. Apache 2.0, MIT, commercial enterprise API agreement) may be plugged into `InferenceJobPort`. Open checkpoints licensed under CreativeML OpenRAIL-M with NC riders or CC BY-NC-SA are strictly prohibited from production deployment ([`VTON_RESEARCH.md`](file:///Users/soham/Github/Drape/docs/research/VTON_RESEARCH.md#8-intellectual-property-licensing--rights-chain)).
* **Unit Economics Guardrail (Integer Minor Units):** Every completed inference job logs its computed cost in integer minor units (e.g. `cost_cents: int` or `Decimal('0.0500')`, never binary floating-point `float`) against the user session to enforce the unit economics cap ([`DEC-AI-002`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-ai-002)).

## Positive Consequences

* **System Stability & UI Responsiveness:** API web servers remain fast and responsive regardless of GPU queue backlogs or third-party API outages.
* **Zero Vendor Lock-In:** Core platform code interacts strictly with `InferenceJobPort`. Swapping from an external API to an internal self-hosted worker requires only writing a new adapter class.
* **Built-in Resilience:** Transient network dropouts between the worker and GPU engine are caught and retried automatically with exponential backoff and jitter.

## Negative Consequences / Trade-offs

* **Orchestration Infrastructure:** Requires operating a Redis queue and background worker process alongside the primary API server.
  - *Mitigation:* Redis is already utilized for session denylists and rate-limiting; worker utilizes lightweight Python ASGI worker pools (ARQ).
* **Client Polling Overhead:** Requires frontend state management to poll or subscribe to job updates.
  - *Mitigation:* React Query / SWR hooks handle polling, caching, and cleanup automatically on the client.

## Pros and Cons of the Options

### Option 1: Synchronous HTTP Proxying

* Good, because it is superficially simpler to implement in single endpoints.
* Bad, because client browser timeouts (typically 30s) and cloud load balancer connection drops terminate in-flight jobs.
* Bad, because it exhausts ASGI worker threads and causes Denial of Service for shoppers browsing the catalog.

### Option 2: Persistent Bidirectional WebSockets

* Good, because it provides instantaneous bidirectional message push.
* Bad, because maintaining hundreds of idle WebSocket connections across mobile cellular networks causes frequent reconnects and complex state recovery.
* Bad, because it complicates horizontal scaling and load balancing behind standard reverse proxies.

### Option 3: Decoupled Asynchronous Job Port with Queue Orchestration

* Good, because it provides robust decoupling, easy retry management, and predictable server capacity.
* Good, because it isolates all GPU integrations behind clean hexagonal interfaces.
* Bad, because job state transitions must be carefully coordinated across PostgreSQL and Redis.

## Compliance and Verification

* **M1 (Repository Scaffold):** Interface definition [`inference_job_port.md`](file:///Users/soham/Github/Drape/docs/architecture/interfaces/inference_job_port.md) and MockInferenceAdapter authored and unit tested.
* **M7 (Image-Based Virtual Try-On):** End-to-end integration test verifies job creation, presigned upload, asynchronous dispatch, status transition, and successful result persistence.

