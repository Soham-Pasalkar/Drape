# ADR-001: Backend Topology — Modular Monolith Architecture

* **Status:** accepted
* **Deciders:** Technical Architect (Antigravity Agent), Human Project Owner
* **Date:** 2026-11-05
* **Technical Story:** Links to PRD Requirements [`NFR-001`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#nfr-001), [`NFR-003`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#nfr-003), [`SEC-001`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#sec-001) and Risk [`RSK-006`](file:///Users/soham/Github/Drape/docs/aidlc/RISK_REGISTER.md#rsk-006)

## Context and Problem Statement

DRAPE requires a backend architecture capable of supporting diverse capabilities: core high-fashion e-commerce (browsing, shopping cart, order placement, inventory), customer wardrobe management, and coordination of asynchronous AI virtual try-on workflows.

The system must maintain low operational overhead for a small engineering team while enforcing clean domain boundaries, transactional consistency for financial transactions, and scalable pathways for resource-intensive asynchronous workloads. How should the backend system topology be structured?

## Decision Drivers

* **Operational Simplicity & Low Total Cost of Ownership:** The platform must be deployable, operable, and debuggable by a lean engineering team without requiring dedicated site reliability engineering (SRE) infrastructure.
* **Transactional Integrity for Commerce:** Shopping cart checkouts, inventory decrement, and payment state transitions require strict ACID guarantees without the failure modes of distributed two-phase commits.
* **Domain Partitioning & Long-Term Maintainability:** Codebases must prevent spaghetti dependencies so that individual capabilities (e.g. AI job orchestration) can be reasoned about, tested, or extracted independently in future milestones.
* **Decoupled Asynchronous Workloads:** Long-running AI try-on jobs must never block synchronous e-commerce HTTP request loops.

## Considered Options

* **Option 1: Distributed Microservices Architecture** (independent services for Identity, Catalog, Orders, Wardrobe, AI, each with its own repository, database, and gRPC/REST transport).
* **Option 2: Distributed Serverless Functions** (Next.js serverless functions / AWS Lambda handlers for all API routes).
* **Option 3: Modular Monolith Core with Out-of-Process Background Workers** (single deployable FastAPI codebase strictly partitioned into domain modules, single authoritative PostgreSQL database, and decoupled background workers for asynchronous tasks).

## Decision Outcome

Chosen option: **"Option 3: Modular Monolith Core with Out-of-Process Background Workers"**, because it provides the ideal balance of operational simplicity, strict transactional consistency for commerce, and clean architectural boundaries. It avoids the premature operational overhead, network latency, distributed data inconsistencies, and infrastructure costs of microservices, while avoiding cold starts and connection pooling exhaustion inherent in pure serverless topologies.

### Positive Consequences

* **Single Operational Unit:** Local development, CI/CD pipelines, and single-region hosting require managing only one core API application container, a PostgreSQL database, a candidate queue runner, and background workers.
* **Local ACID Transactions:** Commerce checkout and inventory reservation can execute within atomic PostgreSQL transactions without distributed sagas or two-phase commit coordinators.
* **Elimination of Cross-Service Network Hops:** In-process communication across domain modules incurs minimal function call overhead rather than JSON/gRPC network serialization across microservices.
* **Strict Domain Isolation:** Modularity is enforced via package-level domain boundaries and linting rules prohibiting cross-domain database access, preserving an unblocked future extraction path.

### Negative Consequences / Trade-offs

* **Unified Deployment Blast Radius:** A catastrophic bug or memory leak in one module can potentially crash the entire ASGI worker process if not isolated.
  - *Mitigation:* Heavy computation (3D mesh processing, diffusion model inference) is explicitly banned from the web process. Ingestion and request handling are decoupled via background queues; workers run in separate processes.
* **Shared Database Resource Contention:** All modules share a single PostgreSQL database instance.
  - *Mitigation:* Multi-tenancy is enforced by domain-prefixed table schemas and strict query timeouts. Candidate technologies for high-load optimization (such as PgBouncer connection pooling and PostgreSQL read replicas) are classified as conditional candidates to be validated against benchmarked traffic loads.

## Pros and Cons of the Options

### Option 1: Distributed Microservices Architecture

* Good, because services can be scaled, deployed, and authored in different tech stacks independently.
* Bad, because it introduces immense operational complexity (service meshes, distributed tracing, Kubernetes, multiple CI/CD pipelines).
* Bad, because it creates distributed transaction failure modes for cart/checkout and inflates cloud infrastructure costs before product-market fit.

### Option 2: Distributed Serverless Functions

* Good, because compute automatically scales to zero and requires minimal host management.
* Bad, because cold starts introduce unpredictable latency spikes that violate editorial luxury UX expectations.
* Bad, because managing connection pooling to relational databases under burst traffic requires complex proxy layers.
* Bad, because long-running AI orchestration and streaming SSE responses fit poorly within fixed serverless execution time limits.

### Option 3: Modular Monolith Core with Out-of-Process Background Workers

* Good, because it unifies the codebase in a single repository with shared type definitions and simplified CI/CD.
* Good, because it avoids distributed network serialization delays and supports low-latency request execution for core commerce flows.
* Good, because background workers (with candidate runners such as ARQ/Redis or PostgreSQL transactional outbox/SKIP LOCKED to be evaluated in M1) provide isolated execution for AI orchestration without polluting the HTTP request cycle.
* Bad, because disciplined code review and linting are required to prevent developers from bypassing domain boundaries.

## Provisional Service Extraction Review Triggers (Non-Binding)

The modular monolith is an active architectural choice, not a permanent dogma. Decomposition into standalone microservices is not pre-scheduled, but will be considered for architectural review if any of the following provisional heuristics occur:
1. **Organizational Scaling Contention:** Multiple independent product engineering teams experience severe deployment cadence conflicts or code ownership collisions in a single repository.
2. **Asymmetric Compute Utilization:** Background AI orchestration or media processing exhibits specialized GPU/CPU saturation patterns that cannot be cost-effectively managed within the primary application cluster.
3. **Database Write I/O Saturation:** Sustained primary database write contention exceeds operational thresholds despite query optimization and connection pooling.

## Compliance and Verification

* **M1 (Repository Scaffold):** Package structure will enforce physical folder separation (`drape.identity`, `drape.catalog`, `drape.commerce`, `drape.wardrobe`, `drape.ai_orchestration`, `drape.privacy`).
* **Automated Linting:** Import-linter / Ruff rules in CI will fail any build where a module imports another module's private internal models or executes direct SQL joins across external domain tables.

