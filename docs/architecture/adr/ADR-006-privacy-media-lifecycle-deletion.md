# ADR-006: Privacy, Media Storage & Asynchronous Deletion Lifecycle

* **Status:** accepted
* **Deciders:** Technical Architect (Antigravity Agent), Human Project Owner
* **Date:** 2026-11-05
* **Technical Story:** Links to PRD Requirements [`SEC-002`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#sec-002), [`SEC-004`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#sec-004) and Risks [`RSK-008`](file:///Users/soham/Github/Drape/docs/aidlc/RISK_REGISTER.md#rsk-008), [`RSK-011`](file:///Users/soham/Github/Drape/docs/aidlc/RISK_REGISTER.md#rsk-011)

## Context and Problem Statement

DRAPE processes sensitive customer data, including voluntary user photographs, AI-generated synthetic try-on previews, wardrobe collections, and camera tracking landmark streams.

Privacy regulations (GDPR Art. 17 "Right to Erasure", CCPA/CPRA, India DPDP Act) require comprehensive deletion of personal data upon customer request or automated retention expiry. In a modern cloud platform, customer data resides across heterogeneous systems: relational database rows, private object storage buckets, CDN edge caches, derived vector search tables, third-party AI provider logs, and immutable database backup archives.

A simplistic synchronous delete operation is technically impossible across distributed systems and leads to false compliance claims. How should the privacy lifecycle, media storage, and deletion propagation be architecturally structured?

## Decision Drivers

* **Truthful Compliance & Legal Defensibility:** The platform must never make false claims of instantaneous global deletion while third-party API queues or database backup snapshots retain data.
* **Separation of Media Processing Modes:** On-device camera video, temporary remote uploads, remote AI inference, and persistent media must have isolated storage, access, and deletion rules.
* **Resilient Multi-Store Purging:** Failure or temporary downtime in one downstream store (e.g. CDN purge API timeout) must not cause the entire deletion workflow to silently abort.
* **Disaster Recovery Safeguards:** Restoring a database from an earlier backup snapshot must not resurrect deleted customer personal data.

## Considered Options

* **Option 1: Synchronous In-Line Hard Deletion** (single API endpoint synchronously attempts to delete database row, S3 object, CDN cache, and third-party vendor before returning HTTP 200).
* **Option 2: Application-Only Soft Deletion** (marking a boolean `is_deleted = true` column in the database without deleting object storage files or downstream caches).
* **Option 3: Coordinated Asynchronous Deletion Coordinator with Independent Multi-Vector Status Tracking and Disaster Recovery Re-Sync** (immediate application tombstone blocking access; asynchronous coordinator purging active stores; multi-dimensional status vectors separating active store, external provider, and backup retention; immutable Tombstone Ledger re-applied upon DR restore).

## Decision Outcome

Chosen option: **"Option 3: Coordinated Asynchronous Deletion Coordinator with Independent Multi-Vector Status Tracking and Disaster Recovery Re-Sync"**, because it provides an honest, legally defensible, and technically resilient deletion architecture that mirrors the actual operational reality of distributed cloud systems.

### 1. Independent Status Vectors (Multi-Dimensional Tracking)

Every deletion task recorded in the `privacy_deletion_ledger` maintains three independent, truthful status fields:

* **`active_store_status`:**
  - `PENDING`: Purge tasks enqueued.
  - `IN_PROGRESS`: Actively purging primary relational tables, private S3/R2 objects (including all object versions and delete markers), CDN edge caches, and derived vector indices.
  - `COMPLETED`: **Active DRAPE storage deletion completed.** Verified absent from all primary runtime systems.
  - `FAILED_ESCALATED`: Purge failed after maximum retries or blocked by storage retention locks; operational alert dispatched while data remains tombstoned.
* **`external_provider_status`:**
  - `NOT_APPLICABLE`: No third-party AI provider was used for this media.
  - `REQUEST_SUBMITTED`: Deletion request dispatched via provider API or authenticated email with timestamp and provider ticket/prediction ID. **Crucial Rule:** A ticket ID, dispatch log, helpdesk auto-acknowledgement, or HTTP 200 "request received" is strictly evidence of request submission, NOT proof of deletion.
  - `REQUEST_ACKNOWLEDGED`: Provider has confirmed receipt of the deletion request, but affirmative deletion has not yet occurred or been verified.
  - `DELETION_CONFIRMED`: Provider has formally and affirmatively verified complete deletion. **Evidence Requirements for Confirmation:** Transition to `DELETION_CONFIRMED` requires either:
    1. An affirmative cryptographic or structured API callback/response explicitly certifying the purged resource ID and completion timestamp; OR
    2. A contractually binding written confirmation from the provider's authorized data protection officer / compliance team explicitly certifying complete destruction across active models, temporary storage, and log caches.
  - `MANUAL_FOLLOWUP_REQUIRED`: Provider failed to confirm deletion within agreed SLA; escalates to legal/procurement for manual follow-up.
* **`backup_retention_status`:**
  - `WITHIN_RETENTION_PERIOD`: Database and storage backups containing pre-deletion snapshots remain in the active backup archive until their policy-governed retention period expires. **Crucial Rule:** Backup expiry must never be marked as completed while any relevant backup snapshot remains within its approved retention schedule.
  - `EXPIRY_REACHED`: Verified aging-out of all backup snapshots. **Verifiable Backup Expiry Criteria:** Transition to `EXPIRY_REACHED` occurs only when the timestamp of the last pre-deletion backup snapshot created prior to the tombstone event chronologically exceeds the approved retention window ([`DEC-RET-004`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-ret-004)), verified programmatically against the cloud provider's snapshot catalog metadata.

### 2. Object Storage Versioning, Replication & Retention Locks
In cloud object storage (S3 / R2), deletion semantics must account for storage configuration:
* **Bucket Versioning:** When versioning is enabled, a standard `DeleteObject` request merely creates a soft "delete marker" while prior object versions remain accessible. The Deletion Coordinator must explicitly iterate and issue `DeleteObject` with specific `VersionId` tags or configure immediate lifecycle expiration on non-current versions to effect permanent deletion.
* **Cross-Region Replication (CRR):** For replicated buckets, delete operations and delete markers must be verified as propagated to secondary replica regions.
* **Retention Locks / Legal Holds:** If an object is governed by an S3 Object Lock (Compliance/Governance mode) or an active legal hold, deletion will fail. The coordinator captures this failure, transitions `active_store_status` to `FAILED_ESCALATED`, and notifies legal/compliance officers rather than hanging or failing silently.

### 3. Tombstone Ledger Append-Only Enforcement & Integrity Protection
The Tombstone Ledger (`privacy_deletion_ledger`) is the authoritative source for tracking erasures and preventing data resurrection during disaster recovery:
* **Database Privilege Segregation:** In PostgreSQL, the application connection role is granted strictly `INSERT` and `SELECT` on `privacy_deletion_ledger`; `UPDATE` and `DELETE` privileges are explicitly revoked at the SQL grant level.
* **Immutable Cold Storage Replication:** Every tombstone event is asynchronously mirrored to an isolated, append-only S3 bucket configured with Object Lock (Write-Once-Read-Many / WORM compliance).
* **Legal Classification & Governance of Pseudonymous Identifiers:**
  - The ledger stores entity UUIDs, deletion timestamps, and status vectors. Direct identifiers (such as names, uploaded photos, and addresses) are purged from active stores.
  - However, DRAPE explicitly recognizes that under applicable privacy jurisprudence (including GDPR Recital 26 and *Breyer* case law), pseudonymous identifiers (e.g. `user_id`, `photo_id` UUIDs) may legally remain personal data if linkable to an individual through external records or residual keys.
  - The architecture **does not** assume or claim that GDPR Article 17(3)(b) or (e) automatically justifies indefinite retention of tombstone UUIDs.
  - Instead, retaining pseudonymous tombstones to enforce disaster recovery re-sync requires a formal governance basis: a documented purpose, demonstrated necessity, strict proportionality, defined retention periods, rigorous access controls, and jurisdiction-specific legal review before launch ([`DEC-PRV-001`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-prv-001), [`DEC-RET-004`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-ret-004)). The technical system supports automated tombstone expiration or archiving once the legal retention window for backup archives elapses.

### 4. Overall Lifecycle Progression & Truthful User Reporting

The overall deletion lifecycle transitions truthfully based on the composite status fields:
1. `REQUESTED`: Deletion requested by customer or triggered by automated retention clock.
2. `TOMBSTONED`: Access immediately revoked at the application/API layer. The user and public APIs can no longer view, download, or reference the item.
3. `ACTIVE_PURGING`: Coordinator actively purging database, object storage versions, CDN cache, and derived vectors.
4. `ACTIVE_DELETION_COMPLETED`: Truthful state indicating **active DRAPE storage deletion is complete**, allowing the system to truthfully confirm internal deletion to the user.
5. `DOWNSTREAM_PENDING`: Explicit intermediate state indicating active stores are completely purged, but `external_provider_status` is `REQUEST_SUBMITTED`/`REQUEST_ACKNOWLEDGED` (pending confirmation) and/or `backup_retention_status` is `WITHIN_RETENTION_PERIOD`.
6. `FULLY_PURGED_AND_EXPIRED`: Final terminal state achieved only when active stores are completed, external provider deletion is affirmatively `DELETION_CONFIRMED` (or `NOT_APPLICABLE`), and backup retention `EXPIRY_REACHED` is verified according to approved retention and legal policy.

### 5. Disaster Recovery Tombstone Re-Sync

Database backup snapshots (e.g. daily snapshots or continuous WAL archives) inevitably contain historical snapshots of deleted customer records. Backups cannot be selectively pruned in place without corrupting archive cryptographic checksums.

To prevent a disaster recovery restore from re-hydrating purged personal data:
* The immutable **Tombstone Ledger** (`privacy_deletion_ledger`) is retrieved from isolated cold storage.
* In the event of a database restore from backup snapshots, an automated post-restore pipeline executes immediately before public traffic resumes, re-applying the Tombstone Ledger to delete or re-anonymize all restored records that were previously marked deleted.

## Positive Consequences

* **Verifiable, Technically Defensible Compliance Reporting:** DRAPE accurately certifies active-store deletion while transparently tracking pending downstream vendor and backup lifecycle states, avoiding false claims of instantaneous global erasure.
* **Fault-Tolerant Propagation:** Downstream CDN or provider outages are queued for automated retry without failing the internal purge.
* **Disaster Recovery Safety:** The tombstone re-sync pipeline substantially mitigates the risk of re-hydrating purged personal data during backup restore drills or operational recoveries.

## Negative Consequences / Trade-offs

* **Coordination Complexity:** Requires maintaining an asynchronous Deletion Coordinator worker and multi-dimensional state tracking ledger.
  - *Mitigation:* Background runner handles coordinator logic; state transitions are strictly governed by explicit status enums.
* **Tombstone Storage & Governance Overhead:** Pseudonymous tombstone records must be maintained across the backup retention lifecycle to enforce DR re-sync.
  - *Mitigation:* Tombstone records contain minimal pseudonymous UUIDs, entity types, and timestamps without direct identifiers; retention duration is calibrated strictly to the approved backup lifecycle window ([`DEC-RET-004`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-ret-004)).

## Pros and Cons of the Options

### Option 1: Synchronous In-Line Hard Deletion

* Good, because it is conceptually simple.
* Bad, because network latency to object storage or third-party APIs blocks the user's HTTP request.
* Bad, because a failure in one store leaves the system in a partial, corrupted state with no retry mechanism.

### Option 2: Application-Only Soft Deletion

* Good, because setting a flag is instantaneous.
* Bad, because personal photos and embeddings remain permanently on disk, violating GDPR/privacy mandates and exposing the company to massive legal liability.

### Option 3: Coordinated Asynchronous Deletion with Multi-Vector Status

* Good, because it provides structured, verifiable multi-tier status reporting.
* Good, because it solves the backup snapshot re-hydration dilemma via automated DR tombstone replay.
* Bad, because it requires dedicated worker processes and careful state machine testing.

## Compliance and Verification

* **M2 (E-Commerce Foundation) & M7 (Image VTON):** Integration test verifies that a deletion request immediately revokes API access, purges S3 objects, invalidates CDN caches, dispatches provider notifications, records truthful status fields, and executes post-restore tombstone replay.

