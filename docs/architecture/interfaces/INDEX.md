# DRAPE — Hexagonal Domain Ports Index

**Directory:** `docs/architecture/interfaces/`  
**Date:** 2026-11-05  
**AIDLC Phase:** Milestone 0.7 Architecture Consolidation  
**Status:** **AUTHORITATIVE ARCHITECTURAL SPECIFICATION**  

---

## Purpose and Decoupling Principle

DRAPE employs hexagonal domain ports (interfaces) strictly to isolate core business models and transaction flows from replaceable third-party technical integrations and volatile external vendor protocols.

Each port defines an abstract Python protocol, standardized Data Transfer Objects (DTOs), and clear boundaries detailing what the port abstracts versus what it cannot abstract.

> [!IMPORTANT]
> **Boundary Principle:** Software ports ensure technical vendor replaceability; they do **NOT** eliminate or bypass business, legal, commercial, or operational requirements. All 26 unresolved decisions cataloged in [`docs/aidlc/OPEN_DECISIONS_REGISTER.md`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md) (comprising 20 business, legal, operational, and commercial dependencies alongside 6 replaceable technical integrations) remain tracked with their own blocking milestone gates.

---

## Published Domain Ports

| Port Interface Document | Domain Scope | Primary Responsibility | Decoupled External Adapters | Blocking Milestone |
|---|---|---|---|---|
| [`payment_gateway_port.md`](file:///Users/soham/Github/Drape/docs/architecture/interfaces/payment_gateway_port.md) | `drape.commerce` | Authorize, capture, refund transactions; handle webhooks. | Stripe Elements, Mock Gateway, Merchant of Record (Paddle/Lemon Squeezy) | M2 (E-Commerce Foundation) |
| [`tax_calculation_port.md`](file:///Users/soham/Github/Drape/docs/architecture/interfaces/tax_calculation_port.md) | `drape.commerce` | Calculate real-time checkout sales tax, VAT, and customs duties. | Stripe Tax, TaxJar, Avalara, Static Matrix | M2 (E-Commerce Foundation) |
| [`identity_port.md`](file:///Users/soham/Github/Drape/docs/architecture/interfaces/identity_port.md) | `drape.identity` | Authenticate credentials, issue tokens, manage social logins & session revocation. | Self-Hosted FastAPI OAuth2/Argon2id, Supabase Auth, Clerk | M1 (Scaffold) / M2 Gate |
| [`object_storage_port.md`](file:///Users/soham/Github/Drape/docs/architecture/interfaces/object_storage_port.md) | `drape.storage` | Generate presigned PUT/GET URLs, delete blobs, set lifecycle headers. | AWS S3, Cloudflare R2, MinIO / Local Disk | M1 (Scaffold and Environment) |
| [`catalog_sync_port.md`](file:///Users/soham/Github/Drape/docs/architecture/interfaces/catalog_sync_port.md) | `drape.catalog` | Ingest and synchronize SKUs, stock, and descriptions from external sources. | Direct Admin DB Sync, Headless Shopify Admin GraphQL, Medusa | M2 (E-Commerce Foundation) |
| [`inference_job_port.md`](file:///Users/soham/Github/Drape/docs/architecture/interfaces/inference_job_port.md) | `drape.ai_orchestration` | Asynchronously submit, poll, and cancel virtual try-on inference jobs. | Mock Runner, FASHN.ai Commercial API, Self-Hosted GPU Worker | M0.7 / M7 (Image VTON) |

