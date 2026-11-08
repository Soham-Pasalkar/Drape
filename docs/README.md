# DRAPE — Documentation Index

Welcome to the DRAPE technical documentation directory. This repository maintains current system specifications, development guides, delivery reports, and a preserved historical archive of engineering decisions.

---

## 1. Primary Documentation

| Section | Document | Description |
|---|---|---|
| **Architecture** | [SYSTEM_ARCHITECTURE.md](architecture/SYSTEM_ARCHITECTURE.md) | Modular monolith architecture, hexagonal ports & adapters, and database schema. |
| **AR Baseline** | [REVISED_AR_ARCHITECTURE.md](architecture/REVISED_AR_ARCHITECTURE.md) | Specification for the frozen M0.9 AR virtual try-on baseline (pose, depth, kinematics, XPBD). |
| **Garment Pipeline** | [GARMENT_ASSET_PIPELINE.md](architecture/GARMENT_ASSET_PIPELINE.md) | 3D garment asset pipeline, anchor point geometry, vertex structures, and simulation data. |
| **ADR Catalog** | [Architecture Decision Records](architecture/adr/) | Canonical ADRs covering database choice, WebGL rendering, body tracking, and AI job ports. |
| **Domain Ports** | [Domain Port Interfaces](architecture/interfaces/) | Technical contracts for identity, payment gateway, tax calculation, and storage adapters. |

---

## 2. Feature Specifications

| Feature | Document | Description |
|---|---|---|
| **DRAPE Studio** | [DRAPE_STUDIO_DOCUMENTATION.md](features/DRAPE_STUDIO_DOCUMENTATION.md) | Technical architecture of the daily AI stylist, wear diary, rotation tracking, and outfit planner. |

---

## 3. Developer & Testing Guides

| Topic | Document | Description |
|---|---|---|
| **Development** | [DEVELOPMENT_GUIDE.md](development/DEVELOPMENT_GUIDE.md) | Local environment onboarding, virtual environments, migrations, and demo seed scripts. |
| **Testing & QA** | [TESTING_GUIDE.md](development/TESTING_GUIDE.md) | Execution guide for backend pytest (109 tests), commerce suite (21 tests), and AR baseline (282 tests). |

---

## 4. Engineering Reports

| Report | Document | Status |
|---|---|---|
| **Release Report** | [FINAL_REPOSITORY_RELEASE_REPORT.md](reports/FINAL_REPOSITORY_RELEASE_REPORT.md) | Official release report documenting git lineage, merge into `main`, and verification results. |
| **Completion Report** | [FINAL_PROJECT_COMPLETION_REPORT.md](reports/FINAL_PROJECT_COMPLETION_REPORT.md) | Milestone delivery report summarizing all six functional application modules. |
| **Hygiene Report** | [FINAL_REPOSITORY_HYGIENE_REPORT.md](reports/FINAL_REPOSITORY_HYGIENE_REPORT.md) | Final repository hygiene, asset deduplication, security audit, and documentation restructuring. |

---

## 5. Historical Archive

To maintain complete engineering traceability without cluttering current documentation, historical milestone reports, early research evaluations, and AI-DLC session journals are cataloged below:

### A. Milestones (`archive/milestones/`)
- [Milestone 0.1 Integrity Report](archive/milestones/MILESTONE_0_1_INTEGRITY_REPORT.md)
- [Milestone 0.2 Git Recovery Report](archive/milestones/MILESTONE_0_2_GIT_RECOVERY_REPORT.md)
- [Milestone 0.3 Remote & Branch Integrity Report](archive/milestones/MILESTONE_0_3_REMOTE_AND_BRANCH_INTEGRITY_REPORT.md)
- [Milestone 0.4 Functional & Repository Audit](archive/milestones/MILESTONE_0_4_FUNCTIONAL_AND_REPOSITORY_AUDIT.md)
- [Milestone 0.5 AR Tracking Recovery](archive/milestones/MILESTONE_0_5_AR_TRACKING_RECOVERY.md)
- [Milestone 0.6 Neckline & Sleeve Fitting](archive/milestones/MILESTONE_0_6_NECKLINE_AND_SLEEVE_FITTING.md)
- [Milestone 0.7 Final Garment Fit](archive/milestones/MILESTONE_0_7_FINAL_GARMENT_FIT.md)
- [Milestone 0.8 Neckline & Sleeve Occlusion](archive/milestones/MILESTONE_0_8_NECKLINE_AND_SLEEVE_OCCLUSION.md)
- [Milestone 0.9 Definitive Neckline Elevation](archive/milestones/MILESTONE_0_9_DEFINITIVE_NECKLINE_ELEVATION.md)
- [Catalog Commerce & 3D Garments Delivery](archive/milestones/MILESTONE_CATALOG_COMMERCE_3D_PRODUCTS.md)
- [M0.9 Stable AR Recovery Baseline](archive/milestones/RECOVERY_STABLE_AR_BASELINE_M0_9.md)

### B. Engineering Audits & Roadmaps (`archive/audits/`)
- [Codebase Hygiene Audit](archive/audits/CODEBASE_HYGIENE_AUDIT.md)
- [Dependency Cleanup Report](archive/audits/DEPENDENCY_CLEANUP_REPORT.md)
- [Architectural Decisions Pending](archive/audits/ARCHITECTURAL_DECISIONS_PENDING.md)
- [Implementation Roadmap](archive/audits/IMPLEMENTATION_ROADMAP.md)
- [Refactoring Changelog](archive/audits/REFACTORING_CHANGELOG.md)
- [Repository Structure](archive/audits/REPOSITORY_STRUCTURE.md)

### C. Foundational Research (`archive/research/`)
- [AR Research](archive/research/AR_RESEARCH.md)
- [VTON Research](archive/research/VTON_RESEARCH.md)
- [Backend & Database Research](archive/research/BACKEND_DATABASE_AI_ARCHITECTURE_RESEARCH.md)
- [Garment Pipeline Research](archive/research/GARMENT_PIPELINE_RESEARCH.md)
- [Infrastructure, Privacy & Cost Research](archive/research/INFRASTRUCTURE_PRIVACY_COST_RESEARCH.md)
- [AR Technology Evaluation](archive/research/AR_TECHNOLOGY_EVALUATION.md)
- [Calibration & Body Model Research](archive/research/CALIBRATION_AND_BODY_MODEL_RESEARCH.md)
- [Phase 0.2 Research Plan](archive/research/PHASE_0_2_RESEARCH_PLAN.md)

### D. AI-DLC Development Records (`archive/aidlc/`)
- Preserved development session logs, risk registers, requirements traceability, and handoff manifests.
