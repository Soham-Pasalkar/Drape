"""
Mock Payment Gateway Adapter for Local Development and Testing.

Implements PaymentGatewayPort with mock transactions.
"""

from typing import Any, Dict, Optional
from app.domain.ports.payment_gateway_port import (
    PaymentGatewayPort,
    PaymentSession,
    PaymentResult,
    RefundResponse,
    PaymentStatus,
    RefundStatus,
)


class MockPaymentGatewayAdapter(PaymentGatewayPort):
    async def create_payment_session(
        self,
        amount_cents: int,
        currency: str,
        customer_id: str,
        idempotency_key: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> PaymentSession:
        return PaymentSession(
            session_id=f"sess_mock_{idempotency_key}",
            client_secret="mock_secret_key_12345",
            checkout_url="http://localhost:3000/checkout/mock-pay",
        )

    async def capture_payment(
        self,
        payment_intent_id: str,
        idempotency_key: str,
    ) -> PaymentResult:
        return PaymentResult(
            transaction_id=f"txn_mock_{payment_intent_id}",
            status=PaymentStatus.CAPTURED,
            amount_cents=10000,
            currency="USD",
        )

    async def refund_payment(
        self,
        payment_intent_id: str,
        amount_cents: int,
        idempotency_key: str,
        reason: Optional[str] = None,
    ) -> RefundResponse:
        return RefundResponse(
            refund_id=f"ref_mock_{idempotency_key}",
            status=RefundStatus.SUCCEEDED,
            amount_cents=amount_cents,
            currency="USD",
            reason=reason,
        )

    async def reconcile_transaction_status(
        self,
        transaction_reference: str,
    ) -> PaymentResult:
        return PaymentResult(
            transaction_id=f"txn_reconciled_{transaction_reference}",
            status=PaymentStatus.CAPTURED,
            amount_cents=10000,
            currency="USD",
        )

    async def verify_webhook_signature(
        self,
        payload_bytes: bytes,
        signature_header: str,
    ) -> bool:
        return signature_header == "valid_mock_signature"

