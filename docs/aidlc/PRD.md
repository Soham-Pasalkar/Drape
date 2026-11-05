# DRAPE — Product Requirements Document

**Status:** Phase 0.1 baseline. “Must/Should/Could/Won’t” expresses current prioritization, not delivery approval. Targets marked **TBD—validate** require evidence before commitment.

## 1–3. Executive summary, problem, vision

DRAPE is a global-ready premium fashion commerce experience with a roadmap for wardrobe, styling, and hybrid try-on. It addresses low-confidence online shopping and disconnected wardrobe decisions through accurate commerce data and carefully bounded AI assistance. Its vision is personal, editorial, trustworthy fashion discovery; it will not represent visual try-on as a measurement or fit system.

## 4–5. Users, needs, and pain points

| Persona | Need / pain point |
|---|---|
| Editorial explorer | Wants distinctive discovery and context; disengages with generic grids and weak storytelling. |
| Intentional shopper | Needs accurate price, availability, size, delivery/returns information before purchasing. |
| Wardrobe builder | Wants purchases and personal garments organized into reusable looks. |
| Privacy-conscious experimenter | Wants to try visual tools without unclear camera/photo use or permanence. |
| Returning customer | Wants past orders, saved looks, and recommendations that respect stated preferences. |

## 6. Scope

**In scope:** commerce discovery and purchase flows; authenticated profiles/orders; purchase-derived and manually added wardrobe items; saved outfits; data-grounded recommendations; staged live and image try-on research/release gates.
**Out of scope for this milestone:** implementation, a claim of physical sizing/fit accuracy, native applications, exact body measurement output, automated cloth-simulation guarantees, and a committed payment/shipping/model vendor.

## 7. Functional requirements

| ID | Requirement | Pri. | Rationale | Acceptance criteria |
|---|---|---|---|---|
| FR-001 | Present campaign-led homepage discovery and collection navigation. | Must | Establish brand and discovery. | Approved collection links resolve; editorial blocks are distinguishable from purchasable products. |
| FR-002 | Support product search, category browsing, filtering, and sorting. | Must | Customers must narrow catalog choices. | A query/filter/sort state is visible, can be cleared, and results reflect it. |
| FR-003 | Show product details: approved images, description, price/currency, variants, availability, care/material data when supplied, and size guidance. | Must | Enables informed decisions. | Selected variant controls purchasability; unavailable data is labelled unavailable, never invented. |
| FR-004 | Maintain a cart with add/change/remove quantity and order summary. | Must | Core purchase journey. | Cart recalculates from authoritative catalog/pricing data and errors are actionable. |
| FR-005 | Complete checkout through a validated provider/market configuration. | Must | Commerce outcome. | Only supported market/payment/shipping options can be submitted; confirmation contains an order reference. |
| FR-006 | Support registration, sign-in/out, profile editing, and consent preferences. | Must | Personal features need accountable identity/consent. | A user can change consent independently of marketing preferences and see its current state. |
| FR-007 | Show authenticated order history and order detail. | Must | Supports post-purchase confidence. | A customer sees only their orders and each detail shows recorded status and line items. |
| FR-008 | Add completed purchased garments to the owner’s wardrobe when matching product data exists. | Should | Preserves commerce-to-wardrobe continuity. | Addition is idempotent, attributable to the order, and is disclosed to the customer. |
| FR-009 | Allow manual wardrobe items with editable category, colour, size, image, and notes; fields may be left unknown. | Should | Handles items bought elsewhere. | User can create/edit/delete their own item; unknown attributes remain unknown. |
| FR-010 | Search/filter wardrobe and create, save, edit, and delete named outfits. | Should | Makes wardrobe actionable. | Saved outfit references accessible owned items and remains editable. |
| FR-011 | Produce outfit/complement/gap suggestions from available wardrobe, product, and preference data with an explanation of inputs. | Should | Differentiator with accountable output. | Each suggestion identifies its source items/data and offers feedback/dismissal; missing data is disclosed. |
| FR-012 | Request explicit camera permission and show a live 3D try-on session only on validated supported devices. | Could | Enables researched live experience. | Before camera activation, purpose/limits are shown; denial/unsupported state has a non-camera fallback. |
| FR-013 | Label live visual output as a preview, not a fit or measurement result, and provide session stop/delete controls. | Must | Prevents harmful overclaim. | Persistent in-context limitation and stop control are visible; no numeric body measurement or fit score is shown. |
| FR-014 | Accept a user-selected suitable photo and a supported product/garment input for image try-on. | Could | Enables asynchronous visual exploration. | Input requirements, consent, unsupported-product state, and retryable validation errors are shown. |
| FR-015 | Generate, display, compare, save, and delete image try-on previews subject to validated policy and capacity. | Could | Makes generated output useful and controllable. | Preview is labelled synthetic/not fit validation; generation state/failure is clear; deletion removes user access and triggers retention workflow. |
| FR-016 | Let users save approved try-on previews and associate them with products/outfits only after consent. | Could | Supports revisiting decisions. | Save is opt-in, association is visible, and item can be removed independently. |
| FR-017 | Provide clear market/locale availability messaging before purchase. | Must | Prevents false global-commerce promises. | Unsupported destination never displays a purchasable shipping promise; price/tax qualifiers are clear. |
| FR-018 | Offer help, return-policy and try-on limitation paths at decision points. | Should | Reduces ambiguity and support burden. | Relevant path is reachable from product, checkout, and try-on screens. |

## 8. Non-functional requirements

| ID | Requirement | Pri. | Rationale | Acceptance criteria |
|---|---|---|---|---|
| NFR-001 | Define and test supported browser/device/OS matrix before each public capability launch. | Must | Camera/3D capability varies. | Published matrix has owner, date, and pass/fail evidence; unsupported users receive fallback. |
| NFR-002 | Set page, interaction, and inference responsiveness budgets through representative measurement; no target is assumed now. | Must | “Fast” is not testable. | Budget proposal and test methodology are approved before performance sign-off. |
| NFR-003 | Maintain graceful degradation for unavailable JS, camera, WebGL, AI service, image upload, or third-party commerce service where feasible. | Must | Core shopping cannot rely on experimental features. | Failure tests preserve product/cart access or explain the blocked action and recovery. |
| NFR-004 | Meet an agreed accessibility standard (target and legal market obligations TBD). | Must | Inclusive, compliant commerce. | Before launch, audit scope/standard and remediated critical findings are recorded. |
| NFR-005 | Record auditable consent, generation, recommendation-version, and order events with retention limits TBD. | Should | Enables support and accountable AI. | Event schema/retention owner are approved before processing production personal data. |
| NFR-006 | Design AI workflows with queueing, capacity limits, cost telemetry, and unavailable-service states. | Must | Inference cost/reliability are uncertain. | Load/cost test and fallback behavior pass agreed thresholds (TBD—validate). |
| NFR-007 | Make product, price, availability, recommendation inputs, and generated-output status traceable to their source/version. | Should | Prevents unexplained or stale claims. | Sample audit can identify source/version for each displayed decision. |
| NFR-008 | Establish backup, recovery, monitoring, and incident objectives before production. | Must | Commerce data is business-critical. | RPO/RTO, alert owners, and restore test result are approved (targets TBD—validate). |
| NFR-009 | Localize content/data formats only for explicitly supported locales and avoid hard-coded market assumptions. | Should | Global-ready does not mean globally available. | Locale test verifies supported currency/date/address content and an unsupported-locale path. |
| NFR-010 | Use commercially authorized models, datasets, fonts, imagery, and 3D assets. | Must | Licensing is release-blocking. | Asset/model inventory contains license, provenance, use restrictions, and approver. |

## 9. User journeys

### J-001 New visitor discovery
**Goal:** discover DRAPE and a relevant collection. **Preconditions:** public site and catalog available. **Main flow:** land on editorial hero → read campaign/collection cue → navigate collection → inspect product. **Alternatives:** search directly; decline optional location/cookie prompt. **Failures:** unavailable catalog/media shows branded fallback and retry/help path. **Outcome:** visitor reaches informed product discovery without account requirement.

### J-002 Registration/profile setup
**Goal:** create an account and set preferences. **Preconditions:** supported identity method and age/market policy. **Main flow:** register → verify as policy requires → set profile/preferences → review separate consent controls. **Alternatives:** sign in existing account; defer optional preferences. **Failures:** duplicate account/verification failure gives safe recovery without exposing account existence unnecessarily. **Outcome:** authenticated account with recorded choices.

### J-003 Browse and purchase
**Goal:** purchase a clothing item. **Preconditions:** supported destination, available variant, checkout provider. **Main flow:** browse/search → view product/size guidance → select variant → cart → destination/shipping/payment → confirm → receive order reference. **Alternatives:** change quantity/variant; save for later if supported. **Failures:** stock, price, payment, or shipping change requires confirmation and preserves cart. **Outcome:** confirmed order or clear non-charge failure.

### J-004 Live 3D try-on
**Goal:** explore a live visual garment preview. **Preconditions:** feature release, compatible device/browser, consent, supported garment asset. **Main flow:** open try-on → see limitation notice → grant camera → calibrate as instructed → view/move preview → stop. **Alternatives:** deny camera/use image try-on or product imagery. **Failures:** permission, landmark, rendering, performance, or asset failure explains limitation and offers fallback. **Outcome:** optional preview only; no fit/measurement conclusion.

### J-005 Image-based AI try-on
**Goal:** see a synthetic garment-on-person preview. **Preconditions:** supported product/input, consent, capacity. **Main flow:** open tool → review guidance/notice → choose photo → validate → submit → view/compare result → optionally save/delete. **Alternatives:** retry photo; abandon. **Failures:** unsafe/invalid image, model failure, queue/capacity issue, or unsupported garment returns reason when safe and recovery option. **Outcome:** labelled synthetic preview or clear failure, never fit validation.

### J-006 Digital wardrobe
**Goal:** organize owned garments. **Preconditions:** authenticated user. **Main flow:** view purchase-derived items → add/edit manual item → search/filter → combine items → save outfit. **Alternatives:** remove order-derived item from wardrobe view without altering order; leave attributes unknown. **Failures:** upload/save failure preserves draft or explains loss before dismissal. **Outcome:** editable private wardrobe and outfits.

### J-007 AI styling
**Goal:** get a useful outfit/complement suggestion. **Preconditions:** authenticated user; enough opted-in wardrobe/preference/product data. **Main flow:** request goal/occasion → receive suggestions and why → inspect products/outfit → save, dismiss, or feedback. **Alternatives:** browse without recommendations; update preferences. **Failures:** insufficient/stale data or unavailable service states what is missing and offers manual discovery. **Outcome:** explainable suggestion, not a claim of personal certainty.

### J-008 Revisit purchases and looks
**Goal:** return to decisions and orders. **Preconditions:** authenticated user. **Main flow:** open profile → orders/saved looks → inspect order or outfit → edit outfit/reorder where supported. **Alternatives:** delete a saved preview/outfit. **Failures:** missing/deleted product or unavailable order action retains historical record with status. **Outcome:** accurate history and controlled saved content.

## 10. User stories

- As an explorer, I want campaign-led entry points so that discovery feels considered (FR-001).
- As a shopper, I want reliable product, variant, and delivery data so I can decide before checkout (FR-002–005, FR-017).
- As a member, I want control of my profile and consents so personal tools do not exceed my choices (FR-006).
- As a customer, I want purchases reflected in my wardrobe so I can build on what I own (FR-007–010).
- As a stylist user, I want to know why a look is suggested so I can judge it (FR-011).
- As a try-on user, I want explicit limitations and deletion controls so I can experiment safely (FR-012–016).

## 11. Acceptance criteria

The testable acceptance criteria for every functional and non-functional requirement are in Sections 7–8. A requirement is not accepted by a visual demonstration alone: source data, consent/failure behavior, and accessibility/compatibility evidence apply where relevant.

## 12. UX and visual requirements

| ID | Requirement | Pri. | Rationale | Acceptance criteria |
|---|---|---|---|---|
| UX-001 | Use a Sonia Rykiel-inspired header treatment: centered uppercase DRAPE wordmark, heavy geometric typographic proportions, wide deliberate letter spacing, minimal utility navigation, separate secondary navigation row, thin dividers, and generous whitespace. | Must | Established premium fashion-brand direction. | Design review verifies the stated DRAPE wordmark treatment and header characteristics; no Sonia Rykiel proprietary logo or font is copied or used without a documented commercial license. |
| UX-002 | Use one dominant editorial photograph for the hero, with magazine-cover-style expressive typography layered over it, asymmetric composition, campaign storytelling inspired by Nudie Jeans, and a subtle CTA. | Must | Rejects a generic e-commerce banner in favor of fashion editorial storytelling. | Hero does not use split rectangular images, product cards, or product grids; photography is rights-cleared and no Nudie Jeans copyrighted photograph or proprietary asset is reused. |
| UX-003 | Order home content: header, hero, latest/curated discovery, shop look, fitting intro, wardrobe/stylist intro, collections, footer. | Should | Establishes intended hierarchy. | Approved wireframe documents each region or an explicit justified change. |
| UX-004 | Use ivory/ink foundation and selective blue/lime editorial accents, validated against photography. | Must | Established palette direction. | Contrast review passes agreed accessibility target; accents are not mandatory on every component. |
| UX-005 | Give every try-on output and input a plain-language purpose, limitations, loading, error, consent, and deletion state. | Must | High-risk interaction needs clarity. | Usability review confirms users can identify preview status and stop/delete action. |
| UX-006 | Keep commerce decisions separate from experimental-AI persuasion. | Must | Avoid misleading conversion pressure. | Product/checkout UI contains no fit score or measurement claim from try-on. |
| UX-007 | Provide responsive layouts and keyboard-operable primary shopping and account paths. | Must | Web-first usability. | Agreed viewport and keyboard test matrix passes (TBD—validate). |
| UX-008 | Preserve source attribution/labels for synthetic and AI-assisted content where shown. | Should | Supports trust. | Generated preview and recommendation disclose their type and relevant limitation. |

## 13. Privacy and security requirements

| ID | Requirement | Pri. | Rationale | Acceptance criteria |
|---|---|---|---|---|
| SEC-001 | Obtain granular, informed opt-in before collecting/processing camera frames, photos, body-related profiles, or saving AI outputs. | Must | Sensitive personal data risk. | Consent specifies purpose, storage/retention, revocation, and is recorded before processing. |
| SEC-002 | Provide access, deletion, and consent withdrawal paths for personal, wardrobe, photo, and saved-preview data, subject to legal/order records. | Must | User control/legal obligations. | User can submit action; system explains scope, exceptions, and completion status. |
| SEC-003 | Apply least-privilege authorization so users access only their account, orders, wardrobe, outputs, and consents. | Must | Prevents data exposure. | Authorization tests reject cross-account read/write attempts. |
| SEC-004 | Protect data in transit and at rest using organization-approved controls; exact standard/key management TBD. | Must | Commerce and image sensitivity. | Security design review documents approved controls before production data. |
| SEC-005 | Minimize collection and retain camera/photo/body data only for approved purposes and durations. | Must | Reduces harm/cost. | Data inventory has owner, purpose, retention/deletion rule, and review date. |
| SEC-006 | Assess providers/models for data use, geographic processing, incident obligations, and deletion support before integration. | Must | Third-party AI/payment risk. | Vendor assessment approved before production personal-data transfer. |
| SEC-007 | Secure account lifecycle and checkout integration against common web threats; controls/tooling TBD. | Must | Account/payment integrity. | Threat model and security tests are approved before public launch. |

## 14. Global commerce considerations

Global-ready requires a market-by-market launch matrix, including merchant model, catalog/price/currency, taxes/duties, address formats, shipping/returns, payment methods, consumer disclosures, privacy, accessibility, language, and customer support. No market is implied supported until the matrix and providers are approved.

## 15. Constraints and dependencies

Constitutional stack preferences are documented in `PROJECT_BRIEF.md`; they are not authorization to add dependencies. Dependencies include authoritative catalog/inventory/pricing, product imagery and rights, compliant assets, identity/payment/shipping services, policies/legal review, and validated model/hosting capacity. Existing `prototype.html` is an untracked prototype with external CDN dependencies and requires separate assessment; it is not a baseline requirement or approved architecture.

## 16. Risks and open questions

See `RISK_REGISTER.md`. The decision gates are: feasible licensed garment assets; representative try-on quality/failure testing; camera/photo privacy model; compatible device coverage; unit economics; and chosen global-commerce launch scope.

## 17. Success metrics

Define baselines and targets before launch for: product-to-cart and checkout conversion, checkout failure rate, return/cancellation reason mix, repeat purchase, saved wardrobe/outfit use, recommendation save/dismiss/feedback, try-on consent/completion/failure/deletion, accessibility defects, performance distribution, support contacts, and cost per generation/session. Metrics must not be used to imply physical fit accuracy without validated evidence.
