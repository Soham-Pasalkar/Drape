"""
DRAPE Domain Port: Asynchronous AI Inference Job.

Defines the abstract interface for submitting, polling, cancelling,
and verifying deletion of virtual try-on inference tasks.
Conforms to docs/architecture/interfaces/inference_job_port.md.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, Optional


class JobExecutionState(str, Enum):
    """Lifecycle state of an inference execution."""
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


@dataclass(frozen=True)
class InferenceJobSubmission:
    """Acknowledgment returned upon initial task submission."""
    provider_task_id: str
    status: JobExecutionState
    estimated_wait_seconds: Optional[int] = None


@dataclass(frozen=True)
class InferenceJobStatus:
    """Status record returned when polling a running job."""
    provider_task_id: str
    status: JobExecutionState
    progress_percentage: int
    output_image_url: Optional[str] = None
    error_message: Optional[str] = None
    cost_cents: Optional[int] = None  # Integer minor units


class InferenceJobPort(ABC):
    """
    Abstract Port for AI Virtual Try-On Inference.
    
    Decouples DRAPE core domains from third-party model serving providers
    (e.g. FASHN API, Replicate, or self-hosted GPU containers).
    """

    @abstractmethod
    async def submit_job(
        self,
        garment_image_url: str,
        person_image_url: str,
        idempotency_key: str,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> InferenceJobSubmission:
        """Submits an asynchronous virtual try-on job to the model runner."""
        pass

    @abstractmethod
    async def poll_job_status(self, provider_task_id: str) -> InferenceJobStatus:
        """Polls execution progress and retrieves generated preview URL upon completion."""
        pass

    @abstractmethod
    async def cancel_job(self, provider_task_id: str) -> bool:
        """Dispatches best-effort cancellation to downstream runner."""
        pass

    @abstractmethod
    async def request_provider_data_deletion(self, provider_task_id: str) -> str:
        """
        Requests prompt destruction of intermediate customer frames.
        Returns a deletion_request_id (evidence of submission only).
        """
        pass

    @abstractmethod
    async def check_provider_deletion_confirmation(
        self, deletion_request_id: str
    ) -> bool:
        """Queries whether the provider has affirmatively confirmed complete erasure."""
        pass

