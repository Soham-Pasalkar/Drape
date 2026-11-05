# Hexagonal Domain Port: ObjectStoragePort

**Document:** Domain Port Specification — Cloud Media & Object Storage  
**Port Name:** `ObjectStoragePort`  
**Domain:** `drape.storage` (Cross-Domain Infrastructure Port)  
**Status:** **AUTHORITATIVE ARCHITECTURAL SPECIFICATION**  
**Blocking Milestone:** M1 (Scaffold and Environment)  
**Related Open Decisions:** [`DEC-RET-001`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-ret-001), [`DEC-RET-002`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-ret-002), [`DEC-RET-003`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-ret-003)

---

## 1. Domain Purpose & Boundary

The `ObjectStoragePort` defines the interface for interacting with cloud object storage across all DRAPE domains: catalog product photography, 3D GLB garment assets, temporary customer photo staging for virtual try-on, and persistent saved wardrobe previews.

This port isolates DRAPE's business services from cloud vendor storage APIs (AWS S3, Cloudflare R2, Google Cloud Storage, or MinIO), enabling single-line configuration switches between public CDN-backed buckets and private, tenant-isolated buckets.

---

## 2. What This Port Abstracts vs. What It CANNOT Abstract

### What It Abstracts (Replaceable Technical Integration):
* Generation of time-limited (15-minute expiry) presigned PUT/POST URLs with size and MIME-type restrictions for direct browser-to-bucket uploads. (Note: Presigned URLs are cryptographically time-bounded; single-use semantics are enforced logically at the application layer upon job start).
* Generation of authenticated, time-limited presigned GET URLs for viewing private user try-on previews.
* Server-side blob upload, download, and multi-object deletion.
* Addressing bucket versioning (handling delete markers vs. permanent deletion of specific object versions).
* Lifecycle tagging on objects (e.g. tagging temporary uploads for automated bucket expiration rules).

### What It CANNOT Abstract (Preserved Real-World Dependencies):
* **Temporary Retention Windows ([`DEC-RET-001`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-ret-001), [`DEC-RET-002`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-ret-002)):** A storage interface cannot decide the legal or commercial policy on how long customer photos (1 hour, 24 hours, 7 days) or generated previews are retained before automated purging.
* **Backup Snapshot Retention Schedules ([`DEC-RET-004`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-ret-004)):** Object storage bucket replication, legal holds, and snapshot retention windows are governed by compliance and disaster recovery policies.

---

## 3. Failure Behavior, Versioning & Retention Semantics

### Deletion Semantics, Access Expiration vs. Physical Purge
* **Distinction: Access Expiration vs. Object Deletion:** When a presigned GET URL reaches its expiration deadline (e.g. 15 minutes), subsequent HTTP requests are rejected by cloud storage authentication. However, **access expiration does not delete the underlying object**. The binary file remains stored until explicitly purged via `delete_object` or automated bucket lifecycle expiration rules.
* **Bucket Versioning & Permanent Deletion:** In unversioned buckets, `delete_object` deletes the key immediately. In versioned buckets (or buckets with Object Lock), standard `DeleteObject` merely inserts a soft "delete marker" while previous versions remain intact and restorable. To achieve verified permanent erasure for privacy compliance, the adapter must explicitly delete all underlying `version_id` instances or configure automated bucket lifecycle rules to purge non-current versions immediately.
* **Replication & Backup Delays:** Cross-region replicated buckets and asynchronous storage snapshot backups do not erase instantaneously upon primary object deletion. Deletion marks active storage completion while replication and snapshot backup expiration age out under policy ([`DEC-RET-004`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-ret-004)).
* **`StorageRetentionLockError`:** Raised if an object cannot be deleted due to active cloud retention locks (WORM / Compliance mode) or legal holds.
* **`StorageUploadExpiredError`:** Raised if client attempts to confirm an upload after the presigned URL window has expired.

---

## 4. Abstract Interface Definition (Python / Typing)

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from enum import Enum
from typing import Dict, List, Optional


class StorageBucketType(str, Enum):
    PUBLIC_CATALOG = "PUBLIC_CATALOG"  # CDN-backed public catalog imagery & GLBs
    PRIVATE_USER_TEMP = "PRIVATE_USER_TEMP"  # Temporary staging for try-on photos
    PRIVATE_USER_WARDROBE = "PRIVATE_USER_WARDROBE"  # Consented saved try-on previews


@dataclass(frozen=True)
class PresignedUploadRequest:
    bucket_type: StorageBucketType
    object_key: str
    content_type: str  # e.g. "image/jpeg", "model/gltf-binary"
    max_size_bytes: int
    expires_in: timedelta = timedelta(minutes=15)
    lifecycle_tags: Optional[Dict[str, str]] = None


@dataclass(frozen=True)
class PresignedUploadResponse:
    upload_url: str
    fields: Dict[str, str]  # Form fields for direct S3 POST/PUT
    expires_at_utc: str


class ObjectStoragePort(ABC):
    """Hexagonal port for cloud object storage, presigned URLs, and coordinated deletion."""

    @abstractmethod
    async def generate_presigned_upload_url(
        self, request: PresignedUploadRequest
    ) -> PresignedUploadResponse:
        """Generates a secure, time-limited presigned URL for direct client-to-storage upload."""
        pass

    @abstractmethod
    async def generate_presigned_download_url(
        self, bucket_type: StorageBucketType, object_key: str, expires_in: timedelta = timedelta(minutes=15)
    ) -> str:
        """Generates a signed GET URL allowing temporary access to private user media."""
        pass

    @abstractmethod
    async def delete_object(
        self, bucket_type: StorageBucketType, object_key: str, version_id: Optional[str] = None
    ) -> bool:
        """Deletes a specific object or version from cloud storage (handling delete markers vs permanent purge)."""
        pass

    @abstractmethod
    async def delete_objects_batch(
        self, bucket_type: StorageBucketType, object_keys: List[str]
    ) -> List[str]:
        """Purges a collection of objects (returns list of successfully deleted keys)."""
        pass

    @abstractmethod
    async def object_exists(
        self, bucket_type: StorageBucketType, object_key: str
    ) -> bool:
        """Validates presence of an object without downloading its payload."""
        pass
```

---

## 5. Planned Adapters

### 5.1 Production Adapters
1. **`S3ObjectStorageAdapter` (AWS S3 Integration):** Production adapter leveraging `aiobotocore` for high-throughput asynchronous S3 operations with explicit version-pruning support.
2. **`CloudflareR2StorageAdapter` (Zero-Egress Candidate):** S3-compatible adapter targeting Cloudflare R2 for zero-egress bandwidth cost optimization.

### 5.2 Test Adapters (Test Environment Only)
1. **`LocalStorageAdapter`:** Stores files in a local scratch directory and simulates presigned URLs for offline development and CI integration tests. Never deployed to production.

