# ADR-007: Catalog Retrieval Strategy — Relational Filtering & PostgreSQL Full-Text Search

* **Status:** accepted
* **Deciders:** Technical Architect (Antigravity Agent), Human Project Owner
* **Date:** 2026-11-05
* **Technical Story:** Links to PRD Requirements [`FR-001`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#fr-001)–[`FR-008`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#fr-008), [`FR-035`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#fr-035)–[`FR-039`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#fr-039), [`NFR-002`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#nfr-002) and Risk [`RSK-012`](file:///Users/soham/Github/Drape/docs/aidlc/RISK_REGISTER.md#rsk-012)

## Context and Problem Statement

DRAPE's product catalog must support rapid exploration, multi-faceted filtering (brand, category, size, color, price range, fabric), and keyword search across thousands of luxury fashion SKUs. Additionally, future milestones (Milestone 6: AI Stylist & Recommendations) envision semantic similarity search and outfit matching based on embedding vectors.

The catalog retrieval architecture must deliver sub-100ms response times for luxury shopping without introducing premature operational overhead or multi-database synchronization lag. How should catalog search and retrieval be structured?

## Decision Drivers

* **Instantaneous Luxury Shopping Experience:** Editorial product listing pages (PLPs) and faceted search queries must return within 100ms ([`NFR-002`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#nfr-002)).
* **Single Authoritative Data Store:** Avoiding dual-write synchronization bugs between the primary database and a separate search index (e.g. out-of-sync inventory or pricing).
* **Controlled Evolution Toward AI Recommendations:** Supporting semantic embeddings in M6 without forcing an immediate commitment to specialized external vector databases.
* **Low Infrastructure Costs:** Eliminating dedicated search cluster hosting fees during the pre-revenue and launch phases.

## Considered Options

* **Option 1: Dedicated Search Engine Cluster** (Elasticsearch or OpenSearch running alongside PostgreSQL with automated Debezium/Kafka CDC synchronization).
* **Option 2: Dedicated Cloud Vector Database** (Pinecone or Qdrant for all catalog discovery, treating products as high-dimensional embeddings).
* **Option 3: PostgreSQL Native Full-Text Search with Structured B-Tree Filtering & Conditional `pgvector`** (leveraging PostgreSQL's generated `tsvector` columns, GIN indexes, composite relational B-trees, and treating `pgvector` as a conditional candidate for M6).

## Decision Outcome

Chosen option: **"Option 3: PostgreSQL Native Full-Text Search with Structured B-Tree Filtering & Conditional `pgvector`"**, because PostgreSQL 16 natively provides high-performance full-text search (with lexical stemming, weighting, and ranking) that integrates seamlessly with structured relational queries. This eliminates the operational fragility, data synchronization delay, and substantial cloud hosting costs of separate search engines.

### Implementation Architecture

1. **Structured Multi-Faceted Filtering & Query Pattern Validation:**
   - Composite B-tree indexes on `(brand_id, category_id, is_active, price_cents)` and partial indexes on active variants enable structured multi-criteria filtering directly in SQL.
   - In Milestone 2, composite indexes will be benchmarked and calibrated against actual customer query patterns (e.g. multi-select brand filters, dynamic price ranges, in-stock filters) to prevent slow index scans.
2. **Native Full-Text Search (FTS) & Multilingual Support:**
   - Fashion e-commerce involves multilingual terminology (French, Italian, English fabric names, brand origin names). A hardcoded `'english'` dictionary is insufficient for global operations ([`DEC-MKT-006`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-mkt-006)).
   - Products maintain a generated `search_vector` column utilizing dynamic language configuration or unstemmed `simple` dictionary combined with language-specific text search dictionaries: `to_tsvector(coalesce(language_config, 'simple'::regconfig), coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(brand_name, ''))`.
   - Indexed via a Generalized Inverted Index (GIN), providing efficient lexical keyword search across catalog text without external network roundtrips.
3. **`pgvector` Extension as Conditional Candidate:**
   - Vector similarity search for visual embeddings (e.g. CLIP image embeddings or text style embeddings) is designated as a **Conditional Candidate**.
   - It will be evaluated inside the primary PostgreSQL database using the `pgvector` extension (HNSW / IVFFlat indexes) during Milestone 6, **subject to empirical benchmarking against real catalog data**.
   - Standalone vector databases (Pinecone, Qdrant, Milvus) and dedicated search clusters (Elasticsearch) are explicitly **Deferred**. Extraction will be evaluated conditionally based on measured buffer pool contention, memory footprint, and query latency under actual production load, rather than an arbitrary static SKU count.

## Positive Consequences

* **Zero Synchronization Lag:** Price drops, stock updates, and new SKU additions are instantly visible in search results without eventual consistency delays.
* **Radical Operational Simplicity:** No external search cluster JVMs to maintain, no Kafka CDC pipelines to monitor, and no additional SaaS bills.
* **ACID Consistency:** Search queries respect transactional row locking and tenant visibility rules natively.

## Negative Consequences / Trade-offs

* **Lexical Limitation:** PostgreSQL FTS lacks some advanced natural language capabilities found in specialized search engines (e.g. deep fuzzy typo tolerance, phonetic matching, or custom dictionary synonyms).
  - *Mitigation:* Common typos and luxury brand misspellings can be resolved via PostgreSQL `pg_trgm` (trigram) similarity matching on title columns.
* **Memory Contention at Extreme Scale:** Extensive GIN and vector indexes compete with transactional tables for PostgreSQL buffer pool cache (`shared_buffers`).
  - *Mitigation:* Read queries directed to read replicas; specialized search clusters deferred until catalog volume objectively warrants extraction.

## Pros and Cons of the Options

### Option 1: Dedicated Search Engine Cluster (Elasticsearch / OpenSearch)

* Good, because it provides rich typo tolerance, faceted aggregations, and horizontal search scaling.
* Bad, because it requires continuous dual-writing or Change Data Capture (CDC), creating inevitable data drift where search results display stale prices or out-of-stock items.
* Bad, because running Elasticsearch clusters requires heavy RAM allocation and dedicated operational maintenance.

### Option 2: Dedicated Cloud Vector Database (Pinecone / Qdrant)

* Good, because it provides fast Approximate Nearest Neighbor (ANN) vector search.
* Bad, because vector-only search performs poorly on exact relational filters (e.g. "size Medium and price < $150").
* Bad, because it introduces external cloud SaaS dependencies and recurring per-index monthly costs.

### Option 3: PostgreSQL Native FTS with Conditional `pgvector`

* Good, because it unifies transactional data, full-text search, and vector embeddings in a single database.
* Good, because queries execute with zero network overhead and strict ACID guarantees.
* Bad, because massive catalog scale and concurrent search traffic may eventually require extraction to a dedicated search cluster if database buffer cache contention impairs primary transaction throughput.

## Compliance and Verification

* **M2 (E-Commerce Foundation):** Query performance benchmarks in CI evaluate faceted search and FTS execution against target latency budgets across representative synthetic catalog datasets.
* **M6 (AI Stylist & Recommendations):** Empirical benchmark comparing `pgvector` HNSW index latency and memory utilization against retrieval accuracy before activating personalized recommendations.

