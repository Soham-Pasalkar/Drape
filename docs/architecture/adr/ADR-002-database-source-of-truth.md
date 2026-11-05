# ADR-002: Database Architecture — PostgreSQL as Canonical Relational Authority

* **Status:** accepted
* **Deciders:** Technical Architect (Antigravity Agent), Human Project Owner
* **Date:** 2026-11-05
* **Technical Story:** Links to PRD Requirements [`FR-001`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#fr-001)–[`FR-014`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#fr-014), [`SEC-001`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#sec-001), [`SEC-002`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#sec-002) and Risk [`RSK-012`](file:///Users/soham/Github/Drape/docs/aidlc/RISK_REGISTER.md#rsk-012)

## Context and Problem Statement

DRAPE manages critical relational entities (product SKUs, pricing variants, stock reservations, order line items, financial charges, customer wardrobe items, and deletion logs) alongside unstructured display metadata and AI task parameters.

The database architecture must provide strict data integrity, financial correctness, multi-tenant isolation, and auditable data erasure, while supporting fast discovery searches and future AI embedding extensions without requiring a complex multi-database sprawl.

## Decision Drivers

* **Financial and Inventory Integrity:** E-commerce transactions require strict ACID guarantees with serializable or row-locked concurrency controls to prevent overselling inventory or double-charging carts.
* **Security & Multi-Tenant Defense-in-Depth:** User wardrobe items, saved looks, and try-on jobs must be protected at both the application query layer and the database engine level.
* **Low Operational Footprint:** Operating multiple disparate database engines (e.g. relational + NoSQL document store + search cluster + vector DB) creates unsustainable administrative overhead for early development phases.
* **Strict Deletion Tracking:** Coordinated privacy erasure and disaster recovery re-sync require an immutable relational audit ledger.

## Considered Options

* **Option 1: Polyglot Persistence Sprawl** (PostgreSQL for commerce, MongoDB for catalog/wardrobe, Elasticsearch for product search, Pinecone for vector embeddings).
* **Option 2: Pure Document Database** (MongoDB or DynamoDB storing full JSON documents for products, orders, and customer accounts).
* **Option 3: Unified PostgreSQL as Canonical Relational Authority** (PostgreSQL 16+ handling structured relations, native full-text search, restricted `jsonb` attributes, Row-Level Security, and conditional in-database vector extensions).

## Decision Outcome

Chosen option: **"Option 3: Unified PostgreSQL as Canonical Relational Authority"**, because PostgreSQL provides unmatched relational maturity, robust ACID transactional safety for commerce, native Row-Level Security (RLS) for tenant isolation, extensible full-text search, and future vector support via extensions (`pgvector`). This unifies all data storage under a single battle-tested operational engine.

### Strict Boundary Rules on `jsonb` Usage & PII Retention Governance

To prevent developers from treating PostgreSQL as an untyped document store and compromising relational integrity or privacy compliance, the following rules are codified:
* **Permitted `jsonb` Fields:**
  1. `catalog_products.display_attributes`: Polymorphic, non-relational display parameters (e.g. sleeve length, collar style, care labels).
  2. `commerce_payments.raw_gateway_response`: Audit record of external webhook payloads from payment processors. **PII Retention & Legal Governance Rules:**
     - Webhook payloads often contain customer billing metadata (e.g. email, billing postal code, transaction references). Storing these payloads must never be assumed to be automatically exempt under GDPR Article 17(3)(b) or other privacy laws without formal legal validation.
     - Only data strictly necessary for defined financial accounting, tax verification, or dispute resolution purposes may be retained.
     - Unnecessary personal information (e.g. customer IP addresses, device user-agents, cardholder names if not required for settlement disputes) must be redacted by ingestion middleware prior to database persistence.
     - Retention periods for payment response logs cannot be open-ended; they must be explicitly defined, justified by applicable jurisdictional laws in launch markets ([`DEC-PRV-001`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-prv-001), [`DEC-MKT-002`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-mkt-002)), and subjected to formal legal counsel review before launch.
     - Retained records must be protected by restricted database role permissions, audit logging, and automated expiry or review policies.
  3. `ai_jobs.execution_metadata`: Opaque technical parameter blobs returned by external model runners (e.g. seed, inference duration, step count).
* **Strictly Prohibited from `jsonb`:**
  1. Primary and foreign key relationships.
  2. Inventory stock counts, currency transaction values, and pricing calculations.
  3. State machine lifecycle statuses (`job_status`, `order_status`, `deletion_status`).
  4. Core customer identity PII (e.g. user profile names, addresses, phone numbers), which must reside in structured, typed relational columns subject to schema-level access controls and automated erasure workflows.

### Row-Level Security (RLS) Architecture, Limitations & Bypass Protections

PostgreSQL Row-Level Security (RLS) provides a database-level defense-in-depth layer to mitigate multi-tenant cross-talk. However, RLS is not an absolute or self-contained security guarantee; its efficacy depends strictly on correct policy logic, least-privilege role segregation, application-layer authorization, and tested tenant context management.

The following architecture controls must be enforced:
1. **Superuser and Privileged Role Bypass Limitations:** By PostgreSQL design, superusers and any role granted the `BYPASSRLS` attribute bypass all row-level security policies unconditionally. Furthermore, table owners bypass RLS by default unless explicitly constrained. Consequently:
   - The runtime application connects exclusively using a dedicated least-privilege role (`drape_app`) created explicitly without `SUPERUSER` and without `BYPASSRLS`.
   - All multi-tenant tables (`wardrobe_*`, `commerce_orders`, `ai_jobs`, `privacy_*`) must execute `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` and `ALTER TABLE <table_name> FORCE ROW LEVEL SECURITY;`. The `FORCE` directive ensures that even table owners are bound by RLS policies during routine operations.
   - Database migrations (Alembic) and administrative maintenance tasks run under separate, highly restricted maintenance roles whose executions are isolated from runtime web traffic.
   - Role inheritance and schema permissions (`GRANT`) must be carefully audited to prevent unintended privilege escalation.
2. **Transaction-Local Tenant Scoping:** In multi-tenant queries, the application sets the tenant context within each transaction block using `SET LOCAL app.current_user_id = '<user_uuid>';`. Scoping the variable with `LOCAL` ensures it automatically lapses upon transaction `COMMIT` or `ROLLBACK`.
3. **Connection Pooler Tenant Cleanup:** Connection poolers (e.g. PgBouncer or SQLAlchemy async pools) reuse physical database connections across requests. If a connection is returned to the pool without clearing session state, subsequent requests could inherit a prior user's context if `SET LOCAL` were ever inadvertently omitted. Connection poolers must be configured with reset directives (`DISCARD ALL` or explicit cleanups on checkout/checkin) to prevent tenant leakage across requests.
4. **Defense-in-Depth, Not Primary Authorization:** RLS acts as a secondary safety net to catch accidental query omissions (`WHERE user_id = ...`). It does not replace application-layer authentication, role-based permission checks, or input validation.

### Positive Consequences

* **Single Operational Engine:** Backup/restore, Point-In-Time Recovery (PITR), replication, and security hardening apply to a single database engine.
* **Transactional ACID Atomicity:** Cart checkout, inventory decrements, and payment records succeed or roll back atomically.
* **Row-Level Security Defense-in-Depth:** When correctly configured and tested, PostgreSQL RLS policies enforce tenant data boundaries, adding a critical defense layer against accidental queries leaking user wardrobe items or private try-on jobs.
* **Evolutionary Search Capability:** Full-text search with GiST/GIN indexes satisfies launch discovery needs without the memory overhead of Elasticsearch or OpenSearch.

### Negative Consequences / Trade-offs

* **Schema Rigidity:** Adding attributes to product models requires formal database migrations.
  - *Mitigation:* Alembic migrations integrated into automated CI/CD; non-relational visual metadata permitted in controlled `display_attributes` `jsonb` columns.
* **Vertical Scaling Boundary:** A single primary database instance has write throughput limits.
  - *Mitigation:* Read-heavy catalog queries can be directed to PostgreSQL read replicas; write contention is minimized through short transaction boundaries and indexed lookups.

## Pros and Cons of the Options

### Option 1: Polyglot Persistence Sprawl

* Good, because each specialized tool is optimized for its exact access pattern.
* Bad, because it introduces complex distributed data synchronization pipelines, high licensing/hosting costs, and eventual consistency lag across services.
* Bad, because coordinated deletion across 4 separate data systems exponentially increases privacy compliance failure risk.

### Option 2: Pure Document Database

* Good, because flexible JSON schemas allow rapid catalog attribute iteration.
* Bad, because it lacks robust relational constraints and multi-document ACID transactions across checkout, inventory, and ledger domains.
* Bad, because it increases the likelihood of inventory race conditions and data corruption.

### Option 3: Unified PostgreSQL as Canonical Relational Authority

* Good, because it provides rock-solid ACID transactions, referential integrity, and proven durability.
* Good, because native RLS provides defense-in-depth security for sensitive customer wardrobe and try-on data.
* Good, because it satisfies text search and vector retrieval requirements under a single operational footprint.
* Bad, because strict relational schemas require disciplined migration tooling (Alembic).

## Compliance and Verification

* **M1 (Repository Scaffold):** Database connection pooling and Alembic migration framework established.
* **Schema Audits:** Automated CI test suite verifies that all tables enforce foreign keys and that no core entities or status fields reside within `jsonb` columns.
* **RLS Integration Tests:** Security test cases verify that tenant queries with mismatched `app.current_user_id` return zero rows.

