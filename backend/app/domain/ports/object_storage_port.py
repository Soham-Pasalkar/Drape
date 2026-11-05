"""
DRAPE Domain Port: Object Storage.

Defines the abstract interface for presigned URL generation, object retrieval,
and multi-version deletion.
Conforms to docs/architecture/interfaces/object_storage_port.md.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Optional


@dataclass(frozen=True)
class PresignedUpload:
    """Encapsulates a presigned PUT target for direct browser-to-bucket upload."""
    upload_url: str
    fields: Dict[str, str]
    expires_in_seconds: int = 900  # 15 minutes


class ObjectStoragePort(ABC):
    """
    Abstract Port for Cloud Object Storage.
    
    Decouples DRAPE domains from cloud vendor storage APIs
    (AWS S3, Cloudflare R2, MinIO, or local disk).
    """

    @abstractmethod
    async def generate_presigned_upload_url(
        self,
        path: str,
        content_type: str,
        size_bytes_limit: int,
        ttl_seconds: int = 900,
    ) -> PresignedUpload:
        """Generates a time-limited presigned URL for direct customer image upload."""
        pass

    @abstractmethod
    async def generate_presigned_download_url(
        self,
        path: str,
        ttl_seconds: int = 900,
    ) -> str:
        """Generates a time-limited presigned GET URL for private asset access."""
        pass

    @abstractmethod
    async def delete_object(
        self,
        path: str,
        version_id: Optional[str] = None,
    ) -> bool:
        """
        Permanently purges an object from storage.
        
        If version_id is provided, permanently deletes that specific version.
        If version_id is None, deletes current version and handles delete markers.
        """
        pass

