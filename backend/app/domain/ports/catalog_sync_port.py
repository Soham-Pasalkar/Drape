"""
DRAPE Domain Port: Catalog Ingestion & PIM Sync.

Defines the abstract interface for synchronizing SKUs, descriptions,
inventory levels, and media links from external sources.
Conforms to docs/architecture/interfaces/catalog_sync_port.md.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import List


@dataclass(frozen=True)
class SyncSummary:
    """Outcome summary of a full or delta catalog sync run."""
    items_processed: int
    items_created: int
    items_updated: int
    items_failed: int
    errors: List[str]
    completed_at: datetime


class CatalogSyncPort(ABC):
    """
    Abstract Port for Product Catalog & PIM Synchronization.
    
    Decouples DRAPE catalog domain from external headless PIMs or ERP systems.
    """

    @abstractmethod
    async def sync_full_catalog(self) -> SyncSummary:
        """Executes a full reconciliation sync from the upstream catalog source."""
        pass

    @abstractmethod
    async def sync_delta_updates(self, since: datetime) -> SyncSummary:
        """Pulls incremental updates and inventory adjustments since a timestamp."""
        pass

    @abstractmethod
    async def verify_webhook_payload(
        self,
        payload_bytes: bytes,
        signature_header: str,
    ) -> bool:
        """Validates HMAC signature and timestamp integrity on inbound PIM webhooks."""
        pass

