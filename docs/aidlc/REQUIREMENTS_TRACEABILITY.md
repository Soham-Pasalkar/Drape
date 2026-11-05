# DRAPE — Requirements Traceability

Milestones below use the approved roadmap: **M0** research, requirements and architecture; **M1** repository scaffold and environment; **M2** e-commerce foundation; **M3** CV camera calibration and body tracking; **M4** first real 3D garment try-on; **M5** garment deformation and occlusion quality; **M6** smart wardrobe and AI stylist; **M7** integration and production hardening. Verification includes acceptance-test evidence plus any required design, legal, accessibility, security, or quality review.

| Product pillar | Requirement IDs | Related journeys | Proposed implementation milestone | Verification method |
|---|---|---|---|---|
| Research, requirements, and architecture | All requirements; RSK-001–016 | J-001–J-008 | M0: Research, requirements and architecture | Approved PRD, risk, traceability, architecture decisions, feasibility, licensing, privacy, cost, and quality evidence. |
| Repository/environment readiness | NFR-001–010, SEC-001–007 | J-001–J-008 | M1: Repository scaffold and environment | Environment readiness checklist; proposed test/monitoring/security approach; no feature acceptance implied. |
| Brand/discovery | FR-001–003, UX-001–004, UX-007, NFR-002–004, NFR-009–010 | J-001, J-003 | M2: E-commerce foundation | Design review; content/data checks; responsive/keyboard/accessibility tests; asset license audit. |
| Commerce/cart/checkout | FR-004–007, FR-017–018, SEC-003–004, SEC-007, NFR-003, NFR-007–009 | J-002, J-003, J-008 | M2: E-commerce foundation | End-to-end cart/checkout/order tests; authorization tests; market matrix; failure/recovery and security review. |
| CV camera calibration and tracking | FR-012, UX-005–006, NFR-001–006, NFR-010, SEC-001–006 | J-004 | M3: CV camera calibration and body tracking | Device matrix; consent/stop test; landmark calibration/tracking quality and failure evidence. |
| First 3D garment try-on | FR-012–013, UX-005–006, NFR-001–006, NFR-010, SEC-001–006 | J-004 | M4: First real 3D garment try-on | Supported-asset rendering evaluation; persistent limitation/stop-control test; performance, privacy, cost, security, and license gates. |
| Garment deformation and occlusion | FR-012–013, UX-005–006, NFR-001–006, NFR-010, SEC-001–006 | J-004 | M5: Garment deformation and occlusion quality | Representative pose/asset visual-quality evaluation, occlusion/deformation failure analysis, and quality-gate review; no physical-fit claim. |
| Smart wardrobe | FR-008–010, SEC-002–005, NFR-005, NFR-007 | J-006, J-008 | M6: Smart wardrobe and AI stylist | Order-to-wardrobe idempotency tests; CRUD/ownership/deletion tests; source audit. |
| AI stylist | FR-011, UX-008, NFR-005–007, SEC-001–006 | J-007 | M6: Smart wardrobe and AI stylist | Data provenance/explanation checks; quality/usability evaluation; consent/deletion/vendor review; cost/load test. |
| Image-based AI try-on (separate workstream) | FR-014–016, UX-005–006, UX-008, NFR-001–007, NFR-010, SEC-001–006 | J-005, J-008 | M0 research/feasibility; conditional M7 integration and production hardening | M0 quality, safety, bias, licensing, provider, privacy, and unit-economics decision gate; if approved and separately planned, M7 end-to-end integration, retention, compare/save/delete, and production-hardening evidence. |
| Cross-cutting production readiness | NFR-001–010, UX-007, SEC-001–007 | J-001–J-008 | M7: Integration and production hardening | Traceable release checklist, compatibility/accessibility/security/license/restore evidence. |

## Traceability rules

1. An implementation task must cite one or more IDs above; additions require a PRD update.
2. A capability cannot pass a milestone solely by happy-path demo; its stated verification evidence is required.
3. AI work is conditional on quality, privacy, licensing, cost, and compatibility gates and may be deferred without blocking M2 commerce. Image-based AI try-on is a separate workstream; it does not create or renumber a roadmap milestone, and no implementation placement is approved beyond the conditional M7 integration/hardening plan.
