# Hexagonal Domain Port: TaxCalculationPort

**Document:** Domain Port Specification — Real-Time Tax & Duty Calculation  
**Port Name:** `TaxCalculationPort`  
**Domain:** `drape.commerce`  
**Status:** **AUTHORITATIVE ARCHITECTURAL SPECIFICATION**  
**Blocking Milestone:** M2 (E-Commerce Foundation)  
**Related Open Decisions:** [`DEC-MKT-002`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-mkt-002), [`DEC-MKT-004`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-mkt-004)

---

## 1. Domain Purpose & Boundary

The `TaxCalculationPort` defines the boundary between DRAPE's shopping cart/checkout service and external sales tax, VAT, and customs duty calculation engines.

International e-commerce requires jurisdiction-specific tax calculations (state/county sales taxes in the US, destination-based VAT in the EU/UK, GST in India, and cross-border import duties). Programming against this port allows DRAPE to compute precise checkout taxes without embedding tax tables or jurisdiction logic into the commerce core.

---

## 2. What This Port Abstracts vs. What It CANNOT Abstract

### What It Abstracts (Replaceable Technical Integration):
* Real-time calculation of applicable sales tax, VAT, and GST line items during checkout across heterogeneous providers.
* Address deliverability normalization and tax-district boundary resolution (distinguishing geographic deliverability from fiscal tax jurisdiction determination).
* Calculation of cross-border customs duties and import tariffs based on origin, destination, Harmonized System (HS) product codes, and shipping fees.

### What It CANNOT Abstract (Preserved Real-World Dependencies):
* **Tax Nexus & Corporate Registration ([`DEC-MKT-002`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-mkt-002), [`DEC-MKT-004`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-mkt-004)):** A software port cannot decide where DRAPE has economic nexus or register the corporate entity with state or national tax authorities.
* **Tax Remittance Responsibility:** If DRAPE uses a Merchant of Record, the MoR remits taxes; if DRAPE is a direct merchant, DRAPE must file returns. The port only computes numbers.
* **Provider Selection & Tax Policy:** Selecting an enterprise tax engine (Stripe Tax, Avalara, TaxJar) and establishing policy for tax exemption handling remains an open business decision.

---

## 3. Failure Behavior, Outage Policies & Caching Boundaries

### Failure Behavior & Legally Reviewed Outage Policy
* **`TaxCalculationError`:** Raised when external tax APIs are unreachable, return HTTP 5xx, or encounter malformed response payloads.
* **Explicit Policy Prohibition on Guessed Rates:** In live production, the system **must not** silently apply guessed or flat destination tax rates as an automatic fallback. Under-calculating tax creates corporate tax liability, while over-calculating violates consumer protection laws in multiple jurisdictions.
* **Legally Reviewed Outage Handling:** Checkout failure behavior when tax providers are unreachable must follow an explicit, legally reviewed policy ([`DEC-MKT-004`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-mkt-004)): typically halting checkout completion with a transparent user notification ("Tax service temporarily unavailable; please retry in a moment") and alarming on-call operations, rather than guessing arbitrary percentages.
* **`AddressJurisdictionResolutionError`:** Raised when an address is physically deliverable but cannot be resolved to an authoritative fiscal tax jurisdiction.

### Caching Boundaries & Input Materiality
* Tax calculations depend on multi-variable inputs: origin fulfillment warehouse address, destination address, product classification (HS codes), individual SKU line amounts, shipping fees, currency, and customer tax classification (e.g. B2B VAT registration vs. B2C consumer).
* Any caching must incorporate a composite SHA256 key comprising **all** materially relevant inputs: `(origin_address, destination_address, items_with_hs_codes, shipping_cost, currency, customer_tax_id)`. Caches are strictly restricted to short TTLs (e.g. 5 minutes) to avoid applying stale rates across tax boundary changes.

---

## 4. Abstract Interface Definition (Python / Typing)

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, List, Optional


@dataclass(frozen=True)
class Address:
    country: str  # ISO 3166-1 alpha-2 (e.g. "US", "GB", "IN")
    postal_code: str
    state_province: Optional[str]
    city: str
    line1: str
    line2: Optional[str] = None


@dataclass(frozen=True)
class AddressValidationResult:
    is_deliverable: bool
    normalized_address: Optional[Address]
    tax_jurisdiction_code: Optional[str]
    validation_notes: List[str]


@dataclass(frozen=True)
class TaxItem:
    sku: str
    hs_code: Optional[str]  # Harmonized System tariff code for apparel
    quantity: int
    unit_price: Decimal


@dataclass(frozen=True)
class TaxCalculationRequest:
    origin_address: Address
    destination_address: Address
    items: List[TaxItem]
    shipping_cost: Decimal
    currency: str
    customer_tax_id: Optional[str] = None  # e.g. EU VAT number for reverse-charge


@dataclass(frozen=True)
class TaxLineItemBreakdown:
    sku: str
    taxable_amount: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    jurisdiction_name: str


@dataclass(frozen=True)
class TaxCalculationResponse:
    total_tax: Decimal
    total_duties: Decimal
    currency: str
    line_item_breakdown: List[TaxLineItemBreakdown]


class TaxCalculationPort(ABC):
    """Outbound hexagonal port for sales tax, VAT, and duty calculations."""

    @abstractmethod
    async def calculate_tax(
        self, request: TaxCalculationRequest
    ) -> TaxCalculationResponse:
        """Computes authoritative taxes and duties based on complete transaction context."""
        pass

    @abstractmethod
    async def validate_address_and_jurisdiction(
        self, address: Address
    ) -> AddressValidationResult:
        """Validates deliverability and resolves authoritative fiscal tax jurisdictions."""
        pass
```

---

## 5. Planned Adapters

### 5.1 Production Candidates (Selection Open via DEC-MKT-004)
1. **`StripeTaxAdapter` (Candidate):** Connects to Stripe Tax API if Stripe is selected for payments.
2. **`TaxJarAdapter` / `AvalaraAdapter` (Candidates):** Enterprise tax calculation engines specializing in complex multi-state and cross-border customs duties.

### 5.2 Test Adapters (Strictly for Local Development & CI Suites)
1. **`StaticMatrixTaxAdapter`:** In-memory flat-rate testing adapter strictly for automated unit/integration tests and local development without third-party API dependencies. **Strict Governance Rule:** The static adapter is strictly prohibited from compilation or execution in live production environments.

