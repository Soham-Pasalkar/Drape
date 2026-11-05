# Hexagonal Domain Port: PaymentGatewayPort

**Document:** Domain Port Specification — Payment Gateway & Transaction Coordination  
**Port Name:** `PaymentGatewayPort`  
**Domain:** `drape.commerce`  
**Status:** **AUTHORITATIVE ARCHITECTURAL SPECIFICATION**  
**Blocking Milestone:** M2 (E-Commerce Foundation)  
**Related Open Decisions:** [`DEC-MKT-002`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-mkt-002), [`DEC-MKT-003`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-mkt-003)

---

## 1. Domain Purpose & Boundary

The `PaymentGatewayPort` defines the outbound hexagonal boundary separating DRAPE's core order and checkout processing domains from third-party payment processors, Merchant of Record (MoR) platforms, and external banking networks.

By programming strictly against this interface, DRAPE's shopping cart, checkout orchestration, and order ledger remain entirely decoupled from vendor-specific SDKs (e.g. Stripe, Adyen, Lemon Squeezy, Paddle), token formats, and proprietary webhook payloads.

---

## 2. What This Port Abstracts vs. What It CANNOT Abstract

### What It Abstracts (Replaceable Technical Integration):
* Payment intent creation, customer payment session initialization, and client secret generation.
* Asynchronous charge authorization and capture workflows.
* Transactional refunds and dispute state queries.
* Cryptographic signature verification and payload normalization for external payment webhooks.

### What It CANNOT Abstract (Preserved Real-World Dependencies):
* **Merchant of Record (MoR) & Legal Entity Model ([`DEC-MKT-002`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-mkt-002)):** A software interface cannot determine whether DRAPE acts as the direct merchant (retaining tax liability and banking registrations) or delegates transaction liability to a reseller MoR.
* **Launch Market Payment Methods ([`DEC-MKT-001`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-mkt-001), [`DEC-MKT-003`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-mkt-003)):** The business owner and finance lead must explicitly decide which countries and local rails (UPI in India, iDEAL in Netherlands, Klarna in Europe) are supported.

---

## 3. Failure Behavior, Security Boundaries, Idempotency & Reconciliation

### Failure Behavior & Domain Exceptions
* **`PaymentGatewayError`:** Base exception for network timeouts or upstream provider errors. Handled by transaction rollback and enqueued retries for verified idempotent operations.
* **`PaymentAmbiguousTimeoutError`:** Raised when an outbound network call (capture, refund) times out without an HTTP response. The system **must not** assume failure or blind retry; it triggers an explicit status query via `reconcile_transaction_status` before state transitions.
* **`PaymentAuthorizationError`:** Raised on card declines, insufficient funds, or fraud risk blockages; results in order state remaining `PENDING_PAYMENT` with a customer-facing sanitized error.
* **`PaymentWebhookSignatureError`:** Raised on invalid HMAC signatures or malformed headers; results in immediate HTTP 400 rejection and security event logging.

### Security Boundaries, Durable Webhook Deduplication & Out-of-Order Events
* Customer payment instrument details (raw credit card numbers, CVVs) never touch DRAPE servers. Client-side SDKs tokenize instruments directly against the provider.
* **Durable Webhook Deduplication:** Timestamp-based replay checks (e.g. 5-minute tolerance) alone are insufficient because payment providers retry unacknowledged webhooks over hours or days. The platform must record processed webhook IDs in a durable `processed_webhook_events` table within the PostgreSQL transactional boundary. Duplicate webhook events are acknowledged (HTTP 200) but short-circuited to prevent duplicate order or payment state transitions.
* **Out-of-Order Webhook Protection:** Payment providers do not guarantee in-order delivery. Webhook handlers must inspect the target order's current state machine transition validity and monotonic event timestamps or sequence numbers. State machines must reject or safely reconcile out-of-order transitions (e.g. discarding a stale `payment_intent.created` if the order is already in `CAPTURED` state).

### Idempotency & Provider Limitations
* `create_payment_session`, `capture_payment`, and `refund_payment` require an `idempotency_key`.
* **Important Caveat:** Upstream provider idempotency is **conditional** on that specific vendor's semantics, key retention window (e.g. Stripe enforces 24 hours; others may differ), and key scoping. DRAPE must maintain an internal transaction ledger so that retries beyond provider retention windows do not cause duplicate financial transactions.

---

## 4. Abstract Interface Definition (Python / Typing)

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, Optional


class PaymentStatus(str, Enum):
    REQUIRES_ACTION = "REQUIRES_ACTION"  # 3D Secure / OTP challenge required
    AUTHORIZED = "AUTHORIZED"
    CAPTURED = "CAPTURED"
    PARTIALLY_CAPTURED = "PARTIALLY_CAPTURED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    DISPUTED = "DISPUTED"


class RefundStatus(str, Enum):
    PENDING = "PENDING"          # Asynchronous refund initiated (e.g. bank transfer / card clearing)
    SUCCEEDED = "SUCCEEDED"      # Funds confirmed reversed
    FAILED = "FAILED"            # Refund rejected by issuing bank
    REQUIRES_ACTION = "REQUIRES_ACTION"


@dataclass(frozen=True)
class PaymentSessionRequest:
    order_id: str
    customer_id: str
    customer_email: str
    amount: Decimal  # Fixed-point decimal currency amount
    currency: str  # ISO 4217 (e.g. "USD", "EUR", "INR")
    return_url: str
    idempotency_key: str
    metadata: Dict[str, str]


@dataclass(frozen=True)
class PaymentSessionResponse:
    gateway_reference: str
    client_secret: Optional[str]
    redirect_url: Optional[str]
    status: PaymentStatus


@dataclass(frozen=True)
class CaptureResponse:
    gateway_transaction_id: str
    status: PaymentStatus
    amount_captured: Decimal
    fee_deducted: Optional[Decimal]


@dataclass(frozen=True)
class RefundResponse:
    refund_id: str
    gateway_reference: str
    status: RefundStatus
    amount_refunded: Decimal
    failure_reason: Optional[str] = None


@dataclass(frozen=True)
class WebhookEvent:
    event_id: str
    event_type: str
    order_id: str
    gateway_reference: str
    status: PaymentStatus
    raw_payload: Dict[str, Any]


class PaymentGatewayPort(ABC):
    """Outbound hexagonal port for payment execution, reconciliation, and webhook verification."""

    @abstractmethod
    async def create_payment_session(
        self, request: PaymentSessionRequest
    ) -> PaymentSessionResponse:
        """Initializes a customer payment session with the payment provider."""
        pass

    @abstractmethod
    async def capture_payment(
        self, gateway_reference: str, amount: Decimal, idempotency_key: str
    ) -> CaptureResponse:
        """Captures an authorized payment for order fulfillment (supports partial captures)."""
        pass

    @abstractmethod
    async def reconcile_transaction_status(
        self, gateway_reference: str
    ) -> CaptureResponse:
        """Queries authoritative provider state to resolve ambiguous timeouts or network failures."""
        pass

    @abstractmethod
    async def refund_payment(
        self, gateway_reference: str, amount: Decimal, reason: str, idempotency_key: str
    ) -> RefundResponse:
        """Issues an asynchronous or synchronous full or partial refund."""
        pass

    @abstractmethod
    def parse_and_verify_webhook(
        self, raw_body: bytes, signature_header: str
    ) -> WebhookEvent:
        """Cryptographically verifies incoming webhook signatures and normalizes the event."""
        pass
```

---

## 5. Planned Adapters

### 5.1 Production Adapters
1. **`StripePaymentAdapter` (Primary E-Commerce Candidate):** Integrates Stripe Elements via PaymentIntents API for direct merchant transactions.
2. **`MerchantOfRecordAdapter` (Conditional Commercial Candidate):** Integrates Paddle or Lemon Squeezy if [`DEC-MKT-002`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-mkt-002) selects an MoR model.

### 5.2 Test Adapters (Test Environment Only)
1. **`MockPaymentAdapter`:** In-memory simulator isolated strictly to test suites and local development; allows deterministically triggering success, 3DS challenges, or declines without external network requests. Never instantiated in production runtimes.

