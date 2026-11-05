"""
Local Object Storage Adapter for Local Development and Testing.

Implements ObjectStoragePort using local URLs and paths.
"""

from typing import Optional
from app.domain.ports.object_storage_port import (
    ObjectStoragePort,
    PresignedUpload,
)


class LocalObjectStorageAdapter(ObjectStoragePort):
    def __init__(self, base_url: str = "http://localhost:8000/storage") -> None:
        self.base_url = base_url

    async def generate_presigned_upload_url(
        self,
        path: str,
        content_type: str,
        size_bytes_limit: int,
        ttl_seconds: int = 900,
    ) -> PresignedUpload:
        return PresignedUpload(
            upload_url=f"{self.base_url}/upload/{path.lstrip('/')}",
            fields={"content-type": content_type, "max-size": str(size_bytes_limit)},
            expires_in_seconds=ttl_seconds,
        )

    async def generate_presigned_download_url(
        self,
        path: str,
        ttl_seconds: int = 900,
    ) -> str:
        return f"{self.base_url}/download/{path.lstrip('/')}?token=mock_read_token"

    async def delete_object(
        self,
        path: str,
        version_id: Optional[str] = None,
    ) -> bool:
        # Mock deletion success
        return True

