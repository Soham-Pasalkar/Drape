"""
DRAPE Domain Port: Payment Gateway.

Defines the abstract interface for payment sessions, capture, refunds,
reconciliation, and webhook verification.
Conforms to docs/architecture/interfaces/payment_gateway_port.md.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, Optional


class PaymentStatus(str, Enum):
    """Normalized payment lifecycle states."""
    REQUIRES_ACTION = "REQUIRES_ACTION"
    AUTHORIZED = "AUTHORIZED"
    CAPTURED = "CAPTURED"
    PARTIALLY_CAPTURED = "PARTIALLY_CAPTURED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    DISPUTED = "DISPUTED"


class RefundStatus(str, Enum):
    """Normalized refund lifecycle states."""
    PENDING = "PENDING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    REQUIRES_ACTION = "REQUIRES_ACTION"


@dataclass(frozen=True)
class PaymentSession:
    """Client session token and redirect URLs for checkout initialization."""
    session_id: str
    client_secret: str
    checkout_url: Optional[str] = None


@dataclass(frozen=True)
class PaymentResult:
    """Outcome of an authorization or capture call."""
    transaction_id: str
    status: PaymentStatus
    amount_cents: int  # Integer minor units
    currency: str
    failure_reason: Optional[str] = None


@dataclass(frozen=True)
class RefundResponse:
    """Outcome of a refund request."""
    refund_id: str
    status: RefundStatus
    amount_cents: int
    currency: str
    reason: Optional[str] = None


class PaymentGatewayPort(ABC):
    """
    Abstract Port for Payment Processing.
    
    Decouples DRAPE commerce from payment gateways (Stripe, MoR, Adyen).
    """

    @abstractmethod
    async def create_payment_session(
        self,
        amount_cents: int,
        currency: str,
        customer_id: str,
        idempotency_key: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> PaymentSession:
        """Initializes a customer checkout payment session."""
        pass

    @abstractmethod
    async def capture_payment(
        self,
        payment_intent_id: str,
        idempotency_key: str,
    ) -> PaymentResult:
        """Captures an authorized payment holding."""
        pass

    @abstractmethod
    async def refund_payment(
        self,
        payment_intent_id: str,
        amount_cents: int,
        idempotency_key: str,
        reason: Optional[str] = None,
    ) -> RefundResponse:
        """Issues a partial or full refund for an order."""
        pass

    @abstractmethod
    async def reconcile_transaction_status(
        self,
        transaction_reference: str,
    ) -> PaymentResult:
        """Queries gateway status to reconcile ambiguous network timeouts."""
        pass

    @abstractmethod
    async def verify_webhook_signature(
        self,
        payload_bytes: bytes,
        signature_header: str,
    ) -> bool:
        """Validates HMAC signature and timestamp integrity on inbound webhooks."""
        pass

