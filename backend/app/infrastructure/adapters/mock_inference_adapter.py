"""
Mock Inference Job Adapter for Local Development and Testing.

Implements InferenceJobPort simulating asynchronous task execution.
"""

from typing import Any, Dict, Optional
from app.domain.ports.inference_job_port import (
    InferenceJobPort,
    InferenceJobSubmission,
    InferenceJobStatus,
    JobExecutionState,
)


class MockInferenceJobAdapter(InferenceJobPort):
    def __init__(self) -> None:
        self._jobs: Dict[str, JobExecutionState] = {}
        self._deletions: Dict[str, bool] = {}

    async def submit_job(
        self,
        garment_image_url: str,
        person_image_url: str,
        idempotency_key: str,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> InferenceJobSubmission:
        task_id = f"mock_task_{idempotency_key}"
        self._jobs[task_id] = JobExecutionState.RUNNING
        return InferenceJobSubmission(
            provider_task_id=task_id,
            status=JobExecutionState.RUNNING,
            estimated_wait_seconds=5,
        )

    async def poll_job_status(self, provider_task_id: str) -> InferenceJobStatus:
        current_state = self._jobs.get(provider_task_id, JobExecutionState.COMPLETED)
        return InferenceJobStatus(
            provider_task_id=provider_task_id,
            status=current_state,
            progress_percentage=100 if current_state == JobExecutionState.COMPLETED else 50,
            output_image_url="http://localhost:8000/storage/mock_result_preview.jpg"
            if current_state == JobExecutionState.COMPLETED
            else None,
            cost_cents=5,  # 5 cents
        )

    async def cancel_job(self, provider_task_id: str) -> bool:
        self._jobs[provider_task_id] = JobExecutionState.CANCELLED
        return True

    async def request_provider_data_deletion(self, provider_task_id: str) -> str:
        req_id = f"del_req_{provider_task_id}"
        self._deletions[req_id] = True
        return req_id

    async def check_provider_deletion_confirmation(
        self, deletion_request_id: str
    ) -> bool:
        return self._deletions.get(deletion_request_id, False)

