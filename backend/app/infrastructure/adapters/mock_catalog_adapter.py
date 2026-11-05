"""
Mock Catalog Sync Adapter for Local Development and Testing.

Implements CatalogSyncPort returning static sync summaries.
"""

from datetime import datetime, timezone
from app.domain.ports.catalog_sync_port import (
    CatalogSyncPort,
    SyncSummary,
)


class MockCatalogSyncAdapter(CatalogSyncPort):
    async def sync_full_catalog(self) -> SyncSummary:
        return SyncSummary(
            items_processed=10,
            items_created=10,
            items_updated=0,
            items_failed=0,
            errors=[],
            completed_at=datetime.now(timezone.utc),
        )

    async def sync_delta_updates(self, since: datetime) -> SyncSummary:
        return SyncSummary(
            items_processed=2,
            items_created=0,
            items_updated=2,
            items_failed=0,
            errors=[],
            completed_at=datetime.now(timezone.utc),
        )

    async def verify_webhook_payload(
        self,
        payload_bytes: bytes,
        signature_header: str,
    ) -> bool:
        return signature_header == "valid_mock_catalog_signature"

