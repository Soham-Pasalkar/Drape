# Hexagonal Domain Port: CatalogSyncPort

**Document:** Domain Port Specification — Product Catalog & PIM Synchronization  
**Port Name:** `CatalogSyncPort`  
**Domain:** `drape.catalog`  
**Status:** **AUTHORITATIVE ARCHITECTURAL SPECIFICATION**  
**Blocking Milestone:** M2 (E-Commerce Foundation)  
**Related Open Decisions:** [`DEC-CAT-001`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-cat-001), [`DEC-CAT-002`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-cat-002)

---

## 1. Domain Purpose & Boundary

The `CatalogSyncPort` defines the interface for synchronizing product catalog data, SKU hierarchies, variant specifications, inventory counts, and asset URLs from external source systems into DRAPE's authoritative relational catalog database.

Fashion brands and enterprise merchants manage inventory and product details across disparate systems: headless e-commerce engines (Shopify Plus, Medusa), enterprise ERPs (SAP, NetSuite), or specialized Product Information Management (PIM) systems (Akeneo, Salsify). Programming against this port allows DRAPE to ingest and normalize external catalog streams without coupling internal catalog aggregates to external schema quirks.

---

## 2. What This Port Abstracts vs. What It CANNOT Abstract

### What It Abstracts (Replaceable Technical Integration):
* External catalog polling, batch delta synchronization, and webhook payload ingestion.
* Mapping external product, variant, and taxonomy models into DRAPE's canonical catalog schema.
* Real-time stock level synchronization and backorder state updates.

### What It CANNOT Abstract (Preserved Real-World Dependencies):
* **Commercial Rights Clearance for Imagery ([`DEC-CAT-002`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-cat-002)):** A software port cannot verify or clear commercial photography licenses or model likeness release forms from brand suppliers.
* **3D Garment Authoring & Sourcing ([`DEC-CAT-003`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-cat-003)):** The port maps GLB URLs; it cannot author, rig, or optimize 3D assets from raw pattern CAD files.

---

## 3. Failure Behavior, Webhooks, Reconciliation & Idempotency

### Failure Behavior & Domain Exceptions
* **`CatalogSyncNetworkError`:** Raised when external PIM/ERP endpoints are unreachable or throttle requests. Sync coordinator catches this and applies exponential backoff with jitter.
* **`CatalogWebhookSignatureError`:** Raised when incoming PIM webhooks fail cryptographic HMAC signature verification or exceed timestamp replay tolerance.
* **`MalformedCatalogPayloadError`:** Raised when required product fields (SKU, brand, price) fail schema validation.
* **Partial Batch Ingestion Semantics:** When ingesting batch deltas, the adapter processes records transactionally per product aggregate. Malformed items are appended to `SyncSummary.errors` while valid items succeed, preventing a single corrupt upstream SKU from halting full catalog synchronization.

### Webhook Verification, Replay Protection & Out-of-Order Handling
* **Cryptographic Verification:** Inbound PIM webhooks must be verified using constant-time HMAC signature validation before JSON parsing.
* **Durable Event Deduplication:** PIM webhook event IDs are recorded in a durable `processed_catalog_webhooks` table to prevent duplicate processing.
* **Out-of-Order Protection:** Webhook updates carry an upstream `updated_at_utc` timestamp. Database upserts enforce a conditional guard: `UPDATE catalog_products SET ... WHERE external_updated_at < :new_updated_at`. Older webhooks arriving out of order are discarded to prevent overwriting newer revisions.

### Inventory Reconciliation Semantics
* Real-time cart reservations decrement local PostgreSQL inventory atomically. Periodic or webhook-driven external stock sync must avoid clobbering active local reservations:
  - If external PIM is the authoritative absolute source, local available stock is calculated as: `available_stock = external_stock_quantity - active_unsettled_local_reservations`.
  - Stale inventory snapshots are rejected if the snapshot timestamp precedes the last confirmed order deduction.

---

## 4. Abstract Interface Definition (Python / Typing)

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, List, Optional


@dataclass(frozen=True)
class ExternalVariantDTO:
    external_variant_id: str
    sku: str
    size: str
    color: str
    price_cents: int
    compare_at_price_cents: Optional[int]
    stock_quantity: int
    barcode: Optional[str]


@dataclass(frozen=True)
class ExternalProductDTO:
    external_product_id: str
    brand_name: str
    title: str
    description: str
    category_path: List[str]
    tags: List[str]
    image_urls: List[str]
    model_3d_glb_url: Optional[str]
    variants: List[ExternalVariantDTO]
    raw_metadata: Dict[str, str]
    external_updated_at_utc: str


@dataclass(frozen=True)
class SyncSummary:
    products_created: int
    products_updated: int
    variants_synced: int
    errors: List[str]


class CatalogSyncPort(ABC):
    """Hexagonal port for ingesting and reconciling catalog data from external PIMs/ERPs."""

    @abstractmethod
    async def fetch_product_catalog_delta(
        self, since_timestamp_utc: str
    ) -> List[ExternalProductDTO]:
        """Fetches newly modified products from the external PIM/catalog source."""
        pass

    @abstractmethod
    async def fetch_inventory_levels(
        self, skus: List[str]
    ) -> Dict[str, int]:
        """Queries authoritative stock levels for specified SKUs."""
        pass

    @abstractmethod
    def parse_and_verify_pim_webhook(
        self, raw_payload: bytes, signature_header: str
    ) -> Optional[ExternalProductDTO]:
        """Cryptographically verifies and parses real-time product update webhooks."""
        pass
```

---

## 5. Planned Adapters

### 5.1 Production Adapters
1. **`DirectDatabaseCatalogAdapter` (Provisional Baseline Candidate):** Administrative REST API permitting direct catalog management and bulk CSV/JSON ingestion into DRAPE's PostgreSQL catalog tables.
2. **`HeadlessShopifyAdapter` (Conditional Candidate):** Connects to Shopify Admin GraphQL API to mirror catalog and stock for partner brands using Shopify.
3. **`MedusaSyncAdapter` (Conditional Candidate):** Connects to open-source Medusa commerce engines.

### 5.2 Test Adapters (Test Environment Only)
1. **`MockCatalogSyncAdapter`:** Feeds synthetic test products and variants in local development and automated CI suites. Never used in production.

