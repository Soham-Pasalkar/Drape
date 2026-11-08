# DRAPE — Project Brief

**AIDLC phase:** 0, milestone 0.1 (Requirements Analysis)
**Status:** Baseline for validation; not an implementation specification.

## Product overview

DRAPE is a global, web-first fashion-commerce product that combines premium editorial discovery with shopping, a digital wardrobe, and future AI-assisted styling and virtual try-on. It must make the distinction between a visual preview and a physical fit prediction unmistakable.

## Problem statement

Online fashion shoppers lack the confidence, context, and continuity available in a store: product imagery is generic, their existing wardrobe is disconnected from shopping, and conventional size guidance does not make an outfit feel tangible. Brands also need a credible way to present garments digitally without overstating what current computer vision and rendering can determine.

## Vision and mission

**Vision:** make fashion discovery and wardrobe decisions feel personal, editorial, and trustworthy globally.
**Mission:** offer an elegant commerce experience that connects real product data and a customer’s wardrobe to clearly bounded, privacy-conscious AI fashion tools.

## Audience and market

- **Primary audience:** style-conscious digital shoppers who value editorial fashion discovery and want help composing and remembering outfits.
- **Secondary audience:** returning customers managing purchases and seeking complementary pieces.
- **Initial market posture:** global-ready web commerce; launch countries, currencies, catalog, languages, payments, tax/shipping rules, and legal entity are unresolved.

## Core differentiators

1. Editorial, premium fashion-brand experience rather than a generic marketplace.
2. Hybrid try-on roadmap: live 3D exploration and image-based generated previews.
3. Digital wardrobe populated from purchases and optional user additions.
4. Explainable styling recommendations grounded in actual wardrobe and product information.

## Product pillars

| Pillar | Intent |
|---|---|
| Fashion e-commerce | Discover, evaluate, buy, and manage clothing purchases. |
| Hybrid virtual try-on | Explore visual garment previews with clear limits; never claim fit validation. |
| Smart digital wardrobe | Keep purchase-derived and user-added garments searchable and combinable. |
| AI fashion stylist | Suggest outfits, complements, and gaps using declared preferences and available data. |

## Business objectives

- Establish a credible premium fashion destination that converts discovery to purchase.
- Improve informed product evaluation without misleading fit or measurement claims.
- Increase repeat engagement through wardrobe, saved looks, and relevant recommendations.
- Preserve a low-cost, open-source-first route to research and delivery.

## Product principles

- **Truthful AI:** visual output is labelled as a preview; no fabricated measurements, fit scores, or certainty.
- **Data-grounded:** recommendations cite the wardrobe/product attributes used, where feasible.
- **Consent first:** camera, photos, body-related data, and saved outputs are opt-in with clear purpose.
- **Editorial before generic:** photography, typography, whitespace, and storytelling drive the visual system.
- **Progressive capability:** a valuable commerce core must not depend on unvalidated AR research.
- **Global by design, localized by evidence:** do not imply availability, pricing, or delivery that is not supported.

## Confirmed decisions

- Web-first; global target; modular monolith initially.
- Frontend preference: Next.js, React, TypeScript. Backend preference: Python/FastAPI; PostgreSQL + pgvector.
- Three.js/React Three Fiber for 3D, MediaPipe/OpenCV as CV starting points, PyTorch and ONNX Runtime as appropriate.
- GLB/glTF is the intended garment asset format; low-cost, open-source-first is a constraint.
- Visual identity direction: the header is inspired by Sonia Rykiel’s typographic treatment—centered uppercase DRAPE wordmark, heavy geometric proportions, wide deliberate letter spacing, minimal utilities, a separate secondary navigation row, thin rules, and generous whitespace. The intended treatment applies to DRAPE’s own wordmark; it is not permission to reuse Sonia Rykiel’s proprietary logo or fonts.
- Hero direction: one dominant editorial photograph with magazine-cover-style typography layered over it, asymmetric composition, and campaign storytelling inspired by Nudie Jeans. The hero must not use split rectangular images, product cards, or product grids. Nudie Jeans is a visual reference only; its copyrighted photography and other proprietary assets may not be reused.
- Foundation colours: ivory `#F4F0E8`, black `#111111`; blue `#294BFF` and lime `#D7E65A` are selective accents.

## Assumptions to validate

- Customers will grant camera/photo consent when value and deletion controls are clear.
- Product and wardrobe metadata can be sufficiently complete for useful recommendations.
- Suitable garment images and, later, compliant GLB/glTF assets can be sourced or produced affordably.
- The proposed web stack can meet acceptable device coverage and responsiveness after targets are agreed.

## Unresolved questions

- Launch markets, merchant of record, legal entities, payment providers, currencies, tax, shipping, returns, and languages.
- Catalog source, inventory authority, product-information model, DAM/image rights, and asset-production workflow.
- Authentication approach, age policy, accessibility target, retention/deletion policy, and privacy jurisdictions.
- Which try-on mode enters first, its supported devices, output quality bar, vendor/model selection, cost guardrails, and human-review process.
- Definition of commercial success and baselines/targets for conversion, return rate, repeat usage, and recommendation quality.

## Initial success criteria

- A customer can complete a transparent, localized-in-scope product purchase journey.
- The experience meets the approved premium editorial direction and accessible interaction requirements.
- Wardrobe and recommendations operate on attributable data and expose limitations.
- Any try-on release obtains explicit consent, gives actionable failure feedback, supports deletion, and is never marketed as fit assurance.
- Performance, compatibility, privacy, security, model quality, and commercial/licensing gates are validated before production commitments.
