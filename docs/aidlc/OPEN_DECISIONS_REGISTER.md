# DRAPE — Consolidated Open Decisions Register

**Document:** Consolidated Open Decisions & Unresolved Questions Register  
**Date:** 2026-11-05  
**AIDLC Phase:** Phase 0.2 Post-Review Governance  
**Roadmap Position:** Milestone 0 (Research, requirements and architecture) — Input to Milestone 0.7  
**Owner / Decision Authority:** Human Project Owner (Business/Commercial), Legal Counsel (Regulatory/Compliance), System Architect (Technical)

---

## 1. Purpose and Governance Rules

This register consolidates all unresolved business, legal, commercial, operational, and architectural decisions identified across Phase 0.1 (`PROJECT_BRIEF.md`, `PRD.md`, `RISK_REGISTER.md`) and Phase 0.2 research (`AR_RESEARCH.md`, `GARMENT_PIPELINE_RESEARCH.md`, `VTON_RESEARCH.md`, `BACKEND_DATABASE_AI_ARCHITECTURE_RESEARCH.md`, `INFRASTRUCTURE_PRIVACY_COST_RESEARCH.md`).

### Governance Rules:
1. **No Silent Assumptions:** Engineering agents must never invent or assume defaults for items in this register.
2. **Blocking Milestone Enforcement:** Each open decision specifies the exact AIDLC milestone where a final resolution becomes release-blocking.
3. **Bounded Architectural Decoupling:** Hexagonal ports and adapters apply strictly to **replaceable technical integrations** (e.g. payment gateway, tax calculation, auth provider, object storage, inference runner). Business, legal, operational, and commercial decisions cannot be abstracted away or eliminated by software interfaces; they remain explicit unresolved inputs with their own blocking milestone gates.

---

## 2. Decision Classification & Summary Matrix

All 26 open decisions are grouped into five distinct decision classes:
1. **Replaceable Technical Integrations:** Technical service providers and protocols decoupled via software interfaces.
2. **Business / Product Decisions:** Strategic scope, features, and policies defined by the product owner.
3. **Legal / Privacy Decisions:** Statutory compliance, data classifications, and regulatory filings requiring legal counsel.
4. **Operational Decisions:** Logistics, vendor contracts, asset creation workflows, and disaster recovery procedures.
5. **Commercial / Economic Decisions:** Corporate structure, merchant models, unit economics, and financial targets.

| Decision ID | Decision Class | Decision Subject | Blocking Milestone | Dependency | Owner / Authority | Current Status |
|---|---|---|---|---|---|---|
| `DEC-MKT-001` | Business / Product | Initial Launch Countries & Rollout Scope | M2 (E-Commerce Foundation) | Corporate strategy; carrier coverage (`DEC-MKT-005`) | Human Owner | Open |
| `DEC-MKT-002` | Commercial / Economic | Merchant of Record (MoR) & Legal Entity Model | M2 (E-Commerce Foundation) | Corporate tax/entity structuring; liability tolerance | Human Owner / Legal | Open |
| `DEC-MKT-003` | Replaceable Tech Integration | Payment Gateway & Currency Adapter (`PaymentGatewayPort`) | M2 (E-Commerce Foundation) | MoR model (`DEC-MKT-002`); launch markets (`DEC-MKT-001`) | Human Owner / Finance | Open |
| `DEC-MKT-004` | Replaceable Tech Integration | Tax & Customs Calculation Engine (`TaxCalculationPort`) | M2 (E-Commerce Foundation) | MoR model (`DEC-MKT-002`); target market tax rules | Human Owner / Finance | Open |
| `DEC-MKT-005` | Operational | Shipping Logistics & Returns 3PL Partner | M2 (E-Commerce Foundation) | Launch markets (`DEC-MKT-001`); warehouse locations | Human Owner / Operations| Open |
| `DEC-MKT-006` | Business / Product | Localization & Initial Supported Languages | M2 (E-Commerce Foundation) | Launch markets (`DEC-MKT-001`); editorial translation | Human Owner / Product | Open |
| `DEC-PRV-001` | Legal / Privacy | Governing Privacy Jurisdictions (GDPR, DPDP, CCPA) | M1 / M2 Gate | Legal entity (`DEC-MKT-002`); launch markets (`DEC-MKT-001`) | Legal Counsel | Open |
| `DEC-PRV-002` | Legal / Privacy | Formal Legal Classification of Photos / Landmarks | M3 / M7 Gate | Governing privacy jurisdictions (`DEC-PRV-001`) | Legal Counsel | Open |
| `DEC-PRV-003` | Legal / Privacy | Lawful Basis for Camera & Photo Processing | M3 / M7 Gate | Legal classification (`DEC-PRV-002`); feature scope | Legal Counsel | Open |
| `DEC-PRV-004` | Legal / Privacy | DPIA Completion & Third-Party DPAs | M1 (Scaffold / Vendors) | Vendor selection (M1); privacy jurisdictions (`DEC-PRV-001`) | Legal Counsel | Open |
| `DEC-IDN-001` | Replaceable Tech Integration | Authentication Strategy & Provider (`IdentityPort`) | M1 / M2 Gate | Auth UX requirements; security / passkey policy | Technical Architect | Open |
| `DEC-IDN-002` | Business / Product | Minimum Age Policy & Age-Gating Controls | M2 (E-Commerce Foundation) | Child privacy statutory rules (`DEC-PRV-001`) | Human Owner / Legal | Open |
| `DEC-IDN-003` | Replaceable Tech Integration | Session Invalidation & Token Revocation Mechanism | M1 / M2 Gate | Auth provider (`DEC-IDN-001`); security threat model | Technical Architect | Open |
| `DEC-RET-001` | Business / Product | Customer Photo Temporary Retention Window | M7 (Image VTON) | Inference SLA; privacy data minimization (`DEC-PRV-001`) | Human Owner / Legal | Open |
| `DEC-RET-002` | Business / Product | Generated Try-On Preview Retention & Expiry Policy | M7 (Image VTON) | Storage unit economics (`DEC-AI-002`); wardrobe UX | Human Owner / Product | Open |
| `DEC-RET-003` | Replaceable Tech Integration | Deletion Propagation Architecture & Truthful Tracking | M2 (E-Commerce Foundation) | Statutory deletion deadlines (`DEC-PRV-001`); provider APIs | Technical Architect | Open |
| `DEC-RET-004` | Operational | Backup Retention Windows & Deletion Ledger Re-Sync | M2 / M7 Gate | Disaster recovery RPO/RTO targets; cloud backup rules | Technical Architect | Open |
| `DEC-CAT-001` | Replaceable Tech Integration | Authoritative Catalog Source / PIM (`CatalogSyncPort`) | M2 (E-Commerce Foundation) | Brand merchant operations; inventory system selection | Human Owner / Operations| Open |
| `DEC-CAT-002` | Legal / Privacy | Commercial Rights Clearance for Product Photos | M2 (E-Commerce Foundation) | Brand supplier contracts; photographer rights | Legal / Brand Owner | Open |
| `DEC-CAT-003` | Operational | 3D Garment Pipeline (Commissioned vs Brand CAD) | M4 (3D Try-On) | 3D artist staffing; brand CAD format interchange | Human Owner / 3D Lead | Open |
| `DEC-CAT-004` | Operational | 3D Garment Budgets (Draw Calls, LODs, Vertices)| M4 (3D Try-On) | Target device matrix (`NFR-001`); WebGL performance | 3D Technical Lead | Open |
| `DEC-A11Y-001` | Operational | Target Accessibility Standard (WCAG 2.1 vs 2.2 AA) | M2 (E-Commerce Foundation) | Legal market obligations (`DEC-MKT-001`); brand UX | UX / Legal | Open |
| `DEC-A11Y-002` | Operational | Keyboard & Screen Reader Scope for 3D/Try-On | M3 / M4 Gate | WebGL canvas accessibility; assistive tech audit | UX / Accessibility | Open |
| `DEC-AI-001` | Business / Product | Feature Sequencing: Live 3D vs Image VTON | M0.7 Consolidation | Workstream B 3D feasibility vs C licensing clearance | Human Owner | Open |
| `DEC-AI-002` | Commercial / Economic | Unit Economics Guardrail (Cost/Try-On Session) | M0.7 / M7 Gate | Commerce margin model; target conversion (`DEC-AI-003`) | Human Owner / Finance | Open |
| `DEC-AI-003` | Commercial / Economic | Commercial Success Baselines (Conversion/Returns) | M2 / M7 Gate | Industry benchmarks; merchant margin expectations | Human Owner | Open |

---

## 3. Detailed Decision Entries

### Category A: Launch Market, Global Commerce & Financial Operations

#### `DEC-MKT-001`: Initial Launch Countries & Rollout Scope
- **Decision Class:** Business / Product Decision
- **Responsible Authority:** Human Project Owner
- **Blocking Milestone:** **M2 (E-Commerce Foundation)**
- **Dependency:** Corporate business strategy; legal entity model (`DEC-MKT-002`); carrier logistics coverage (`DEC-MKT-005`).
- **Current Status:** Open
- **Context:** DRAPE is web-first and global-ready, but global commerce requires country-specific compliance, carrier contracts, and payment settlement.
- **Unresolved Questions:** Which exact market(s) constitute Tier-1 launch (e.g. US, UK, EU, India)? What is the geographic rollout cadence?
- **Options Under Review:** Single primary domestic market first vs. multi-country regional pilot.
- **Architectural Impact:** M0.7 must design internationalization, currency, and market routing as configurable domain abstractions. Interfaces cannot resolve which countries are legally or commercially supported.

#### `DEC-MKT-002`: Merchant of Record (MoR) & Legal Entity Model
- **Decision Class:** Commercial / Economic Decision
- **Responsible Authority:** Human Project Owner / Legal Counsel
- **Blocking Milestone:** **M2 (E-Commerce Foundation)**
- **Dependency:** Corporate entity structuring; merchant banking; financial liability and tax remittance model.
- **Current Status:** Open
- **Context:** Determines who is legally responsible for consumer transactions, tax remittance, invoicing, and dispute handling.
- **Unresolved Questions:** Will DRAPE act as its own direct merchant (Stripe-direct) or utilize a Merchant of Record provider (e.g. Paddle, Lemon Squeezy, Global-e)?
- **Options Under Review:** Direct payment gateway integration vs. Full-service MoR.
- **Architectural Impact:** M0.7 defines a `PaymentGatewayPort` to isolate webhook and settlement integration, but cannot resolve corporate tax liabilities or legal merchant posture.

#### `DEC-MKT-003`: Payment Gateway & Currency Adapter (`PaymentGatewayPort`)
- **Decision Class:** Replaceable Technical Integration
- **Responsible Authority:** Human Project Owner / Finance Lead
- **Blocking Milestone:** **M2 (E-Commerce Foundation)**
- **Dependency:** Merchant of Record decision (`DEC-MKT-002`); target launch markets (`DEC-MKT-001`).
- **Current Status:** Open
- **Context:** Payment providers determine supported payment methods (Apple Pay, Google Pay, UPI, Klarna), transaction fees, and multi-currency conversion.
- **Unresolved Questions:** Which payment gateway(s) will be integrated? Will prices be presented as multi-currency display with single settlement or localized native settlement?
- **Architectural Impact:** Fully decoupled in M0.7 via `PaymentGatewayPort` allowing adapter substitution without cart/order domain modifications.

#### `DEC-MKT-004`: Tax & Customs Calculation Engine (`TaxCalculationPort`)
- **Decision Class:** Replaceable Technical Integration
- **Responsible Authority:** Human Project Owner / Finance Lead
- **Blocking Milestone:** **M2 (E-Commerce Foundation)**
- **Dependency:** Merchant of Record decision (`DEC-MKT-002`); target market tax and duty regulations (`DEC-MKT-001`).
- **Current Status:** Open
- **Context:** Cross-border commerce mandates automated calculation of sales tax, EU VAT (OSS/IOSS), and destination import duties (`RSK-011`).
- **Unresolved Questions:** Which automated tax engine will be used (Stripe Tax, Avalara, TaxJar), or will tax be delegated to an MoR?
- **Architectural Impact:** Decoupled in M0.7 via `TaxCalculationPort` with mockable adapter interfaces.

#### `DEC-MKT-005`: Shipping Logistics & Returns 3PL Partner
- **Decision Class:** Operational Decision
- **Responsible Authority:** Human Project Owner / Operations Lead
- **Blocking Milestone:** **M2 (E-Commerce Foundation)**
- **Dependency:** Target launch markets (`DEC-MKT-001`); warehouse and fulfillment partner locations.
- **Current Status:** Open
- **Context:** Physical garment delivery, tracking, and returns logistics directly impact customer satisfaction and return rates.
- **Unresolved Questions:** Third-party logistics (3PL) integration partner, return portal provider, shipping carrier API integrations.
- **Architectural Impact:** Requires operational partner contracts and tracking webhook adapters.

#### `DEC-MKT-006`: Localization & Initial Supported Languages
- **Decision Class:** Business / Product Decision
- **Responsible Authority:** Human Project Owner / Product Lead
- **Blocking Milestone:** **M2 (E-Commerce Foundation)**
- **Dependency:** Target launch markets (`DEC-MKT-001`); editorial brand translation capacity.
- **Current Status:** Open
- **Context:** Multi-language catalog and interface support.
- **Unresolved Questions:** Launch with English-only or include French/German/Spanish?
- **Architectural Impact:** M0.7 provides i18n locale routing and translation schema support; business scope determines translated catalog availability.

---

### Category B: Regulatory Compliance, Jurisdictions & Data Privacy

#### `DEC-PRV-001`: Governing Privacy Jurisdictions (GDPR, DPDP, CCPA)
- **Decision Class:** Legal / Privacy Decision
- **Responsible Authority:** Legal Counsel
- **Blocking Milestone:** **M1 / M2 Gate**
- **Dependency:** Legal entity incorporation (`DEC-MKT-002`); launch market geography (`DEC-MKT-001`).
- **Current Status:** Open
- **Context:** Different jurisdictions impose distinct consent, data transfer, breach notification, and deletion requirements (EU GDPR, India DPDP Act & 2025 Rules, California CCPA/CPRA).
- **Unresolved Questions:** Which regulatory regimes are legally binding for the initial launch entity and customer base?
- **Architectural Impact:** Dictates privacy policy, consent ledger schema, and statutory deletion timeframes. Software interfaces cannot substitute for legal counsel jurisdiction determination.

#### `DEC-PRV-002`: Formal Legal Classification of Photos & Landmarks
- **Decision Class:** Legal / Privacy Decision
- **Responsible Authority:** Legal Counsel
- **Blocking Milestone:** **M3 (CV) and M7 (VTON) Gates**
- **Dependency:** Governing privacy jurisdictions (`DEC-PRV-001`); regulatory enforcement precedents.
- **Current Status:** Open
- **Context:** Workstream E verified that while DRAPE treats user media as sensitive data internally, formal statutory classification (e.g. biometric data or special-category data under GDPR Art. 9) requires legal determination.
- **Unresolved Questions:** Does monocular 2D pose landmarking or photo-based VTON constitute biometric processing under governing jurisdictions?
- **Architectural Impact:** Determines whether statutory biometric consent disclosures and heightened organizational safeguards are legally mandatory.

#### `DEC-PRV-003`: Lawful Basis for Camera & Photo Processing
- **Decision Class:** Legal / Privacy Decision
- **Responsible Authority:** Legal Counsel
- **Blocking Milestone:** **M3 / M7 Gates**
- **Dependency:** Legal classification (`DEC-PRV-002`); feature scope and user flow.
- **Current Status:** Open
- **Context:** Processing personal data requires an approved lawful basis (e.g. explicit consent vs. contractual necessity).
- **Unresolved Questions:** Confirming explicit consent as the exclusive lawful basis for try-on tools and defining consent withdrawal mechanics.
- **Architectural Impact:** Mandates purpose-specific consent ledger records before camera or photo intake.

#### `DEC-PRV-004`: DPIA Completion & Third-Party DPAs
- **Decision Class:** Legal / Privacy Decision
- **Responsible Authority:** Legal Counsel
- **Blocking Milestone:** **M1 (Scaffold / Vendor Onboarding)**
- **Dependency:** Cloud hosting and vendor selection (M1); governing privacy regimes (`DEC-PRV-001`).
- **Current Status:** Open
- **Context:** Operating AI features and cloud storage requires formal Data Protection Impact Assessments (DPIAs) and signed Data Processing Agreements (DPAs).
- **Unresolved Questions:** Execution of DPAs with chosen cloud hosting, database, storage, and analytics vendors.
- **Architectural Impact:** Precludes production data transfer to any third-party vendor without executed DPAs.

---

### Category C: Identity, Authentication & Account Lifecycle

#### `DEC-IDN-001`: Authentication Strategy & Provider (`IdentityPort`)
- **Decision Class:** Replaceable Technical Integration
- **Responsible Authority:** Technical Architect
- **Blocking Milestone:** **M1 (Scaffold) / M2 (E-Commerce)**
- **Dependency:** User authentication requirements; social login policy; passkey support roadmap.
- **Current Status:** Open
- **Context:** Account management for profiles, order history, and digital wardrobe.
- **Unresolved Questions:** Self-hosted auth (FastAPI OAuth2/JWT) vs. managed identity provider (Supabase Auth, Clerk, Auth0, Firebase Auth)? Support for social logins (Google, Apple) and passkeys?
- **Architectural Impact:** Isolated in M0.7 via `IdentityPort`, permitting adapter substitution without modifying user domain aggregates.

#### `DEC-IDN-002`: Minimum Age Policy & Age-Gating Controls
- **Decision Class:** Business / Product Decision
- **Responsible Authority:** Human Project Owner / Legal Counsel
- **Blocking Milestone:** **M2 (Commerce) / M3 (Try-On)**
- **Dependency:** Child online safety laws in launch markets (COPPA, GDPR Art. 8, India DPDP child data rules; `DEC-PRV-001`).
- **Current Status:** Open
- **Context:** Child privacy laws impose severe penalties on unconsented processing of minors' images.
- **Unresolved Questions:** Minimum platform age (e.g. 16+ or 18+)? Is an age verification check required prior to try-on access?
- **Architectural Impact:** Defines whether age-gate validation logic must precede try-on session initiation.

#### `DEC-IDN-003`: Session Invalidation & Token Revocation Mechanism
- **Decision Class:** Replaceable Technical Integration
- **Responsible Authority:** Technical Architect
- **Blocking Milestone:** **M1 / M2 Gate**
- **Dependency:** Identity provider selection (`DEC-IDN-001`); application security threat model.
- **Current Status:** Open
- **Context:** Secure session lifecycle, refresh token rotation, and immediate cross-device logout on password reset or account compromise.
- **Unresolved Questions:** Stateless JWT with short expiry vs. Redis/database-backed server session revocation.
- **Architectural Impact:** Technical integration detail within authentication adapter and session middleware.

---

### Category D: Data Retention, Media Lifecycles & Deletion SLAs

#### `DEC-RET-001`: Customer Photo Temporary Retention Window
- **Decision Class:** Business / Product Decision
- **Responsible Authority:** Human Project Owner / Legal Counsel
- **Blocking Milestone:** **M7 (Image VTON)**
- **Dependency:** Inference job execution SLA; data minimization policy (`DEC-PRV-001`).
- **Current Status:** Open
- **Context:** User photos uploaded for image VTON require strict retention limits.
- **Unresolved Questions:** What is the maximum permitted temporary storage lifespan (e.g. 1 hour, 24 hours, 7 days) before automated deletion?
- **Architectural Impact:** Configures automated lifecycle expiration rules on private temporary storage buckets.

#### `DEC-RET-002`: Generated Try-On Preview Retention & Expiry Policy
- **Decision Class:** Business / Product Decision
- **Responsible Authority:** Human Project Owner / Product Lead
- **Blocking Milestone:** **M7 (Image VTON)**
- **Dependency:** Storage unit economics (`DEC-AI-002`); wardrobe user experience.
- **Current Status:** Open
- **Context:** Synthetic preview images consume storage and create privacy obligations.
- **Unresolved Questions:** Do generated previews expire automatically after a set window (e.g. 30 days) unless explicitly saved to wardrobe?
- **Architectural Impact:** Configures automated cleanup clocks for unsaved synthetic outputs.

#### `DEC-RET-003`: Deletion Propagation Architecture & Truthful Status Tracking
- **Decision Class:** Replaceable Technical Integration
- **Responsible Authority:** Technical Architect
- **Blocking Milestone:** **M2 (Commerce) / M7 (VTON)**
- **Dependency:** Statutory deletion deadlines (`DEC-PRV-001`); third-party provider API capabilities.
- **Current Status:** Open
- **Context:** User deletion requests must propagate across databases, storage, CDN caches, and third-party AI providers (`SEC-002`).
- **Deletion Completion Semantics:** The system must distinguish three distinct conditions:
  1. *Active DRAPE storage deletion completed:* Relational records tombstoned/anonymized, object storage files deleted, CDN caches invalidated, derived vectors removed (`active_store_status: COMPLETED`).
  2. *External provider deletion confirmed versus merely submitted/acknowledged:* A provider notification, email receipt, or ticket ID is evidence of request submission (`external_provider_status: REQUEST_SUBMITTED`), NOT proof of deletion. Confirmation requires affirmative provider verification (`external_provider_status: DELETION_CONFIRMED`).
  3. *Backup retention expiry reached versus backup still within approved retention:* Backups cannot be selectively wiped in place without invalidating archive integrity; they remain `backup_retention_status: WITHIN_RETENTION_PERIOD` until the snapshot retention window naturally expires.
- **Architectural Impact:** Defines the asynchronous Deletion Coordinator, multi-dimensional status fields, and truthful status reporting to users and APIs.

#### `DEC-RET-004`: Backup Retention Windows & Deletion Ledger Re-Sync
- **Decision Class:** Operational Decision
- **Responsible Authority:** Technical Architect
- **Blocking Milestone:** **M2 / M7 Gate**
- **Dependency:** Disaster recovery RPO/RTO objectives; cloud snapshot lifecycle policies.
- **Current Status:** Open
- **Context:** Database and object storage backups retain snapshots of deleted personal data. Backups expire naturally according to approved retention schedules; they are not immediately erased.
- **Unresolved Questions:** Formal snapshot rotation schedule and automated disaster recovery restore runbook to re-apply the Tombstone Ledger before public service resumption.
- **Architectural Impact:** Establishes disaster recovery restore automation and ensures backups within retention are truthfully tracked.

---

### Category E: Product Catalog, PIM & Asset Supply Pipeline

#### `DEC-CAT-001`: Authoritative Catalog Source / PIM (`CatalogSyncPort`)
- **Decision Class:** Replaceable Technical Integration
- **Responsible Authority:** Human Project Owner / Operations Lead
- **Blocking Milestone:** **M2 (E-Commerce Foundation)**
- **Dependency:** Brand merchant operations; inventory management system / ERP selection.
- **Current Status:** Open
- **Context:** Product data integrity (`RSK-012`) requires a single source of truth for SKUs, variants, prices, inventory, materials, and care instructions.
- **Unresolved Questions:** Direct database catalog management vs. headless Product Information Management (PIM) / ERP sync (e.g. Shopify, Medusa, Akeneo).
- **Architectural Impact:** Decoupled in M0.7 via `CatalogSyncPort` to allow direct DB cataloging or headless PIM synchronization.

#### `DEC-CAT-002`: Commercial Rights Clearance for Product Photos
- **Decision Class:** Legal / Privacy Decision
- **Responsible Authority:** Legal Counsel / Brand Owner
- **Blocking Milestone:** **M2 (E-Commerce Foundation)**
- **Dependency:** Brand supply agreements; photographer contracts.
- **Current Status:** Open
- **Context:** Editorial commerce requires high-resolution campaign photography and clean product cutouts.
- **Unresolved Questions:** Rights-clearance workflow and digital asset licensing agreements for brand-supplied imagery.
- **Architectural Impact:** Precludes publishing any product photo without a documented commercial rights chain.

#### `DEC-CAT-003`: 3D Garment Pipeline (Commissioned vs Brand CAD)
- **Decision Class:** Operational Decision
- **Responsible Authority:** Human Project Owner / 3D Technical Lead
- **Blocking Milestone:** **M4 (First Real 3D Try-On)**
- **Dependency:** 3D artist staffing; brand CAD format interchange capabilities.
- **Current Status:** Open
- **Context:** Workstream B established that glTF/GLB creation requires significant manual cleanup and rigging.
- **Unresolved Questions:** Sourcing strategy for launch 3D assets: in-house 3D artist commissioning vs. intake normalization pipeline for brand-provided CLO/Marvelous Designer files.
- **Architectural Impact:** Dictates asset authoring workflows and initial 3D catalog volume.

#### `DEC-CAT-004`: 3D Garment Budgets (Draw Calls, LODs, Vertices)
- **Decision Class:** Operational Decision
- **Responsible Authority:** 3D Technical Lead
- **Blocking Milestone:** **M4 (First Real 3D Try-On)**
- **Dependency:** Target device matrix (`NFR-001`); mobile WebGL performance measurements.
- **Current Status:** Open
- **Context:** Browser rendering on diverse mobile/desktop devices requires strict asset constraints (`NFR-001`, `NFR-002`).
- **Unresolved Questions:** Maximum triangle budget (e.g. 30k–50k tris), maximum texture resolution (e.g. 2048×2048 KTX2/Basis), and maximum GLB payload size (e.g. 5 MB).
- **Architectural Impact:** Asset ingestion validation gates in 3D pipeline.

---

### Category F: Accessibility, Usability & UI Standards

#### `DEC-A11Y-001`: Target Accessibility Standard (WCAG 2.1 vs 2.2 AA)
- **Decision Class:** Operational Decision
- **Responsible Authority:** UX Lead / Legal Counsel
- **Blocking Milestone:** **M2 (E-Commerce Foundation)**
- **Dependency:** Legal market obligations (`DEC-MKT-001`); brand UX requirements (`NFR-004`).
- **Current Status:** Open
- **Context:** Non-functional requirement `NFR-004` requires an agreed accessibility standard.
- **Unresolved Questions:** Formal adoption of WCAG 2.1 Level AA vs. WCAG 2.2 Level AA.
- **Architectural Impact:** Dictates automated a11y testing suite rules and contrast/keyboard requirements.

#### `DEC-A11Y-002`: Keyboard & Screen Reader Scope for 3D/Try-On
- **Decision Class:** Operational Decision
- **Responsible Authority:** UX Lead / Accessibility Specialist
- **Blocking Milestone:** **M3 / M4 Gate**
- **Dependency:** WebGL canvas accessibility limits; assistive tech screen reader testing.
- **Current Status:** Open
- **Context:** 3D canvases and camera feeds present unique accessibility barriers.
- **Unresolved Questions:** Fallback text descriptions, keyboard-operable camera controls, screen reader announcements for 3D state, and non-visual product exploration alternatives.
- **Architectural Impact:** Defines accessible non-canvas DOM overlays and ARIA state announcements.

---

### Category G: AI Feature Prioritization & Unit Economics

#### `DEC-AI-001`: Feature Sequencing: Live 3D vs Image-Based VTON
- **Decision Class:** Business / Product Decision
- **Responsible Authority:** Human Project Owner
- **Blocking Milestone:** **M0.7 (Architecture Consolidation)**
- **Dependency:** Workstream B 3D feasibility vs Workstream C VTON licensing availability.
- **Current Status:** Open
- **Context:** Workstream A/B (3D) and Workstream C (VTON) represent two distinct technical and economic paths.
- **Unresolved Questions:** Should Live 3D Try-On precede Image-Based VTON in customer delivery, or vice versa?
- **Current Research Recommendation:** Focus on Live 3D Try-On (M3/M4) first due to commercial licensing barriers in current open VTON models; retain Image VTON as conditional M7.
- **Architectural Impact:** Dictates engineering focus for M1/M2 scaffolding and job boundary prioritization.

#### `DEC-AI-002`: Unit Economics Guardrail (Cost/Try-On Session)
- **Decision Class:** Commercial / Economic Decision
- **Responsible Authority:** Human Project Owner / Finance Lead
- **Blocking Milestone:** **M0.7 / M7 Gate**
- **Dependency:** Commerce margin structure; target checkout conversion rates (`DEC-AI-003`).
- **Current Status:** Open
- **Context:** AI generation and GPU serving costs must not exceed business value (`RSK-006`).
- **Unresolved Questions:** What is the maximum acceptable cost threshold per successful try-on generation (e.g. $0.05, $0.10, $0.20)?
- **Architectural Impact:** Defines rate limits, per-user generation quotas, and caching policies.

#### `DEC-AI-003`: Commercial Success Baselines (Conversion & Returns)
- **Decision Class:** Commercial / Economic Decision
- **Responsible Authority:** Human Project Owner
- **Blocking Milestone:** **M2 / M7 Gate**
- **Dependency:** Industry fashion e-commerce benchmarks; merchant margin expectations.
- **Current Status:** Open
- **Context:** PRD Section 17 requires defining success metrics before public launch.
- **Unresolved Questions:** Target baselines for product-to-cart conversion, checkout completion, return rate reduction, and repeat wardrobe visits.
- **Architectural Impact:** Dictates analytics tracking events and business KPI dashboards.

---

## 4. Architectural Decoupling Strategy: Ports vs. Real Dependencies

Milestone 0.7 Architecture Consolidation must not conflate software interfaces with business or legal resolutions:

### 4.1 Where Hexagonal Ports & Adapters Apply
Ports and adapters are applied **strictly to replaceable technical integrations** to decouple DRAPE's core domain models from external third-party SDKs, APIs, and vendors:
1. **`PaymentGatewayPort` (`DEC-MKT-003`):** Defines a standard checkout and payment processing contract (`authorize`, `capture`, `refund`, `handle_webhook`). Adapters can implement Stripe, Adyen, or a Merchant of Record without modifying cart or order business logic.
2. **`TaxCalculationPort` (`DEC-MKT-004`):** Defines tax and duty estimation interfaces (`calculate_cart_tax`). Adapters can implement Stripe Tax, TaxJar, or an internal lookup table.
3. **`IdentityPort` (`DEC-IDN-001`, `DEC-IDN-003`):** Defines user authentication, credential validation, and token revocation contracts. Adapters can connect to self-hosted OAuth2/JWT or managed providers (Supabase Auth, Clerk).
4. **`ObjectStoragePort`:** Defines signed URL generation, binary put/get, and deletion operations. Adapters can implement S3, Cloudflare R2, or local development storage.
5. **`CatalogSyncPort` (`DEC-CAT-001`):** Defines ingestion and reconciliation contracts for importing product data from headless PIMs or direct administrative input.
6. **`InferenceJobPort`:** Defines asynchronous submission, queue status polling, and cancellation for AI workloads, isolating core commerce whether inference runs on a local worker or external API.

### 4.2 Where Architecture Interfaces CANNOT Eliminate Dependencies
Software interfaces cannot solve business, legal, operational, or commercial requirements. These remain **explicit unresolved inputs with their own blocking milestone gates**:
1. **Business / Product Decisions (`DEC-MKT-001`, `DEC-MKT-006`, `DEC-IDN-002`, `DEC-RET-001`, `DEC-RET-002`, `DEC-AI-001`):** A port cannot decide which countries DRAPE ships to, which languages are supported, what age threshold is enforced, or how long user media is retained. These require explicit human owner policies before M2 and M7 release.
2. **Legal / Privacy Decisions (`DEC-PRV-001`–`004`, `DEC-CAT-002`):** An interface cannot resolve statutory jurisdiction, biometric classification, or lawful basis. These require legal counsel determination and signed DPAs before customer data can be processed.
3. **Operational Decisions (`DEC-MKT-005`, `DEC-CAT-003`, `DEC-CAT-004`, `DEC-RET-004`, `DEC-A11Y-001`–`002`):** Interfaces cannot manufacture 3D garment assets, fulfill shipping, or perform disaster recovery restore drills. These require operational workflows, artist pipelines, and contractual agreements.
4. **Commercial / Economic Decisions (`DEC-MKT-002`, `DEC-AI-002`, `DEC-AI-003`):** Interfaces do not determine financial viability, corporate entity liability, or unit economic viability.

> [!IMPORTANT]
> **Key Principle:** Architectural ports ensure technical vendor replaceability; they do NOT eliminate or bypass business, legal, commercial, or operational requirements. All 26 decisions remain tracked with their explicit blocking milestones.

