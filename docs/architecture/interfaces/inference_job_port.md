# Hexagonal Domain Port: InferenceJobPort

**Document:** Domain Port Specification — Virtual Try-On AI Inference Execution  
**Port Name:** `InferenceJobPort`  
**Domain:** `drape.ai_orchestration`  
**Status:** **AUTHORITATIVE ARCHITECTURAL SPECIFICATION**  
**Blocking Milestone:** M0.7 Architecture Consolidation / M7 (Image VTON)  
**Related Open Decisions:** [`DEC-AI-001`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-ai-001), [`DEC-AI-002`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-ai-002), [`DEC-RET-003`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-ret-003)

---

## 1. Domain Purpose & Boundary

The `InferenceJobPort` defines the asynchronous execution contract for image-based AI virtual try-on models.

It completely isolates DRAPE's core web application, digital wardrobe, and customer profile logic from the underlying model serving infrastructure: whether inference executes on a third-party commercial API (e.g. FASHN API, Replicate), a dedicated self-hosted GPU cluster running open-weights models (e.g. CatVTON / IDM-VTON on Modal or RunPod), or an internal containerized worker.

---

## 2. What This Port Abstracts vs. What It CANNOT Abstract

### What It Abstracts (Replaceable Technical Integration):
* Asynchronous dispatch of garment image and customer photo to model runners.
* Polling status, execution progress percentage, and error reason normalization.
* Job cancellation on downstream GPU workers.
* Synthetic output retrieval and delivery to object storage.

### What It CANNOT Abstract (Preserved Real-World Dependencies):
* **Commercial Model Licensing Clearance ([`RSK-003`](file:///Users/soham/Github/Drape/docs/aidlc/RISK_REGISTER.md#rsk-003)):** A software port cannot validate or legalize the training dataset rights or commercial license riders of external model weights. Open checkpoints under CC BY-NC-SA remain strictly banned from production deployment.
* **Unit Economics Guardrails ([`DEC-AI-002`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-ai-002)):** The financial threshold for maximum allowable cost per generation ($0.05 vs $0.20) is a commercial business decision.
* **Third-Party Deletion Compliance ([`DEC-RET-003`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-ret-003)):** Downstream vendor deletion verification requires executed Data Processing Agreements (DPAs) and verifiable deletion callbacks; ticket IDs remain submission receipts only.

---

## 3. Failure Behavior, Cancellation Races & Deletion Semantics

### Failure Behavior & Domain Exceptions
* **`InferenceSubmissionError`:** Raised when the downstream model runner rejects a job request or is unreachable. Caught by the job coordinator and scheduled for retry if transient.
* **`InferenceSafetyViolationError`:** Raised when provider content moderation flags either the customer photo or the composite preview. Non-retryable; transitions immediately to `TERMINAL_FAILURE` and notifies customer with a sanitized error.
* **`InferenceTimeoutError`:** Raised when an in-flight job exceeds maximum execution duration (e.g. >120 seconds). Prompts worker cancellation and retry/fallback.

### Cancellation Races & Best-Effort Termination
* If a customer issues a cancellation while inference is processing, `cancel_job` dispatches best-effort termination to the provider. Because external GPU runners may not support preemptive cancellation once kernel execution begins, cancellation is best-effort and cannot be guaranteed. The DRAPE worker checks local job state before saving previews; any late-arriving image result from a cancelled job is immediately purged and discarded, and customer billing charges are suppressed. However, DRAPE may still incur underlying GPU compute or API execution charges from the external provider for the cancelled run.

### Security Boundaries & URL Handling
* **Opaque Provider References:** Third-party provider task IDs and raw upstream endpoints are restricted to internal background workers and are never exposed to client browsers.
* **Short-Lived Staging URLs:** Image URLs passed to the provider (`garment_image_url`, `person_image_url`) are generated with strict, minimum-viable presigned TTLs (e.g. 15 minutes).
* **Immediate Result Ingestion & Upstream Purge:** When a provider completes inference, the DRAPE worker immediately downloads the generated preview into DRAPE's private object storage bucket and immediately dispatches `request_provider_data_deletion()` to instruct the vendor to purge intermediate customer frames from external GPU host storage.

### Deletion Semantics (Request Submission vs. Confirmation)
* `request_provider_data_deletion()` dispatches an erasure request to the provider and returns a `deletion_request_id` (recorded as `external_provider_status: REQUEST_SUBMITTED`).
* `check_provider_deletion_confirmation()` queries whether the provider has affirmatively verified complete deletion (`DELETION_CONFIRMED`). A helpdesk ticket ID or HTTP 200 acknowledgement of request receipt is strictly classified as submission evidence, never verified deletion. Full deletion requires affirmative confirmation under an executed Data Processing Agreement (DPA).

---

## 4. Abstract Interface Definition (Python / Typing)

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, Optional


class InferenceStatus(str, Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


@dataclass(frozen=True)
class InferenceJobRequest:
    job_id: str
    idempotency_key: str
    garment_image_url: str  # Presigned URL to clean catalog garment flat-lay
    person_image_url: str   # Presigned URL to customer photo
    garment_category: str   # "tops", "bottoms", "dresses", "outerwear"
    options: Dict[str, Any] # Opaque parameters (e.g. guidance_scale, seed)


@dataclass(frozen=True)
class InferenceJobStatus:
    provider_job_id: str
    status: InferenceStatus
    progress_percentage: int
    output_image_url: Optional[str] = None
    error_message: Optional[str] = None
    cost_cents: Optional[int] = None  # Integer minor units to prevent float rounding errors


class InferenceJobPort(ABC):
    """Outbound hexagonal port for dispatching and managing image-based AI virtual try-on jobs."""

    @abstractmethod
    async def submit_job(
        self, request: InferenceJobRequest
    ) -> str:
        """Submits an inference job to the backend runner and returns the provider task ID."""
        pass

    @abstractmethod
    async def get_job_status(
        self, provider_job_id: str
    ) -> InferenceJobStatus:
        """Polls the execution status and retrieves result image URL upon completion."""
        pass

    @abstractmethod
    async def cancel_job(
        self, provider_job_id: str
    ) -> bool:
        """Instructs the backend GPU worker to cancel in-flight inference."""
        pass

    @abstractmethod
    async def request_provider_data_deletion(
        self, provider_job_id: str
    ) -> str:
        """Dispatches a formal data purge request; returns submission receipt ID (REQUEST_SUBMITTED)."""
        pass

    @abstractmethod
    async def check_provider_deletion_confirmation(
        self, provider_deletion_request_id: str
    ) -> bool:
        """Verifies whether the provider has affirmatively confirmed complete data purge (DELETION_CONFIRMED)."""
        pass
```

---

## 5. Planned Adapters

### 5.1 Production Adapters
1. **`FashnAPIAdapter` (Commercial Candidate for Early Pilots):** Connects to FASHN.ai commercial REST API for production-grade try-on quality without upfront GPU cluster infrastructure.
2. **`SelfHostedWorkerAdapter` (Deferred Scale Candidate):** Dispatches jobs to containerized GPU instances (e.g. running commercially cleared diffusion models) via message queue.

### 5.2 Test Adapters (Test Environment Only)
1. **`MockInferenceAdapter`:** Returns pre-generated synthetic comparison images with simulated 3-second latency for zero-cost integration testing in local development and automated CI. Never deployed to live customer runtimes.

