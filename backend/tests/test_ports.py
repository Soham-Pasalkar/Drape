"""Tests for domain port specifications and mock adapters."""

from datetime import datetime, timezone
import pytest

from app.domain.ports import (
    IdentityPort,
    ObjectStoragePort,
    InferenceJobPort,
    PaymentGatewayPort,
    TaxCalculationPort,
    CatalogSyncPort,
    ShippingAddress,
    JobExecutionState,
    PaymentStatus,
    RefundStatus,
)
from app.infrastructure.adapters.mock_identity_adapter import MockIdentityAdapter
from app.infrastructure.adapters.local_storage_adapter import LocalObjectStorageAdapter
from app.infrastructure.adapters.mock_inference_adapter import MockInferenceJobAdapter
from app.infrastructure.adapters.mock_payment_adapter import MockPaymentGatewayAdapter
from app.infrastructure.adapters.static_tax_adapter import StaticTaxAdapter
from app.infrastructure.adapters.mock_catalog_adapter import MockCatalogSyncAdapter


@pytest.mark.asyncio
async def test_identity_port_mock():
    adapter: IdentityPort = MockIdentityAdapter()
    tokens = await adapter.authenticate_credentials("shopper@example.com", "secret")
    assert tokens.access_token.startswith("mock_access_token_for_")

    session = await adapter.verify_token(tokens.access_token)
    assert session.email == "shopper@example.com"
    assert "customer" in session.roles

    revoked = await adapter.revoke_session(session.session_id)
    assert revoked is True

    with pytest.raises(PermissionError):
        await adapter.verify_token(tokens.access_token)


@pytest.mark.asyncio
async def test_object_storage_port_mock():
    adapter: ObjectStoragePort = LocalObjectStorageAdapter()
    presigned = await adapter.generate_presigned_upload_url(
        "uploads/test.jpg", "image/jpeg", 5000000
    )
    assert "upload/uploads/test.jpg" in presigned.upload_url
    assert presigned.expires_in_seconds == 900

    download_url = await adapter.generate_presigned_download_url("catalog/dress.glb")
    assert "download/catalog/dress.glb" in download_url

    deleted = await adapter.delete_object("uploads/test.jpg")
    assert deleted is True


@pytest.mark.asyncio
async def test_inference_job_port_mock():
    adapter: InferenceJobPort = MockInferenceJobAdapter()
    sub = await adapter.submit_job(
        garment_image_url="http://storage/garment.png",
        person_image_url="http://storage/person.jpg",
        idempotency_key="idemp_123",
    )
    assert sub.status == JobExecutionState.RUNNING

    status = await adapter.poll_job_status(sub.provider_task_id)
    assert status.status == JobExecutionState.RUNNING

    cancelled = await adapter.cancel_job(sub.provider_task_id)
    assert cancelled is True

    status_cancelled = await adapter.poll_job_status(sub.provider_task_id)
    assert status_cancelled.status == JobExecutionState.CANCELLED

    del_id = await adapter.request_provider_data_deletion(sub.provider_task_id)
    assert del_id.startswith("del_req_")
    confirmed = await adapter.check_provider_deletion_confirmation(del_id)
    assert confirmed is True


@pytest.mark.asyncio
async def test_payment_gateway_port_mock():
    adapter: PaymentGatewayPort = MockPaymentGatewayAdapter()
    session = await adapter.create_payment_session(
        amount_cents=15000,
        currency="USD",
        customer_id="cust_1",
        idempotency_key="idemp_pay_1",
    )
    assert session.session_id.startswith("sess_mock_")

    capture = await adapter.capture_payment("pi_123", "idemp_cap_1")
    assert capture.status == PaymentStatus.CAPTURED

    refund = await adapter.refund_payment("pi_123", 5000, "idemp_ref_1")
    assert refund.status == RefundStatus.SUCCEEDED
    assert refund.amount_cents == 5000

    reconciled = await adapter.reconcile_transaction_status("txn_ref_123")
    assert reconciled.status == PaymentStatus.CAPTURED

    valid_sig = await adapter.verify_webhook_signature(b"{}", "valid_mock_signature")
    assert valid_sig is True


@pytest.mark.asyncio
async def test_tax_calculation_port_mock():
    adapter: TaxCalculationPort = StaticTaxAdapter(default_rate=0.10)
    address = ShippingAddress(
        line1="123 Fashion Ave",
        city="New York",
        state_province="NY",
        postal_code="10001",
        country_code="US",
    )
    tax = await adapter.calculate_tax(
        order_amount_cents=10000,
        currency="USD",
        shipping_address=address,
        item_tax_codes=["txcd_apparel"],
    )
    assert tax.total_tax_cents == 1000  # 10% of 10000
    assert len(tax.jurisdictions) == 1
    assert tax.jurisdictions[0].amount_cents == 1000


@pytest.mark.asyncio
async def test_catalog_sync_port_mock():
    adapter: CatalogSyncPort = MockCatalogSyncAdapter()
    summary = await adapter.sync_full_catalog()
    assert summary.items_processed == 10
    assert summary.items_created == 10
    assert len(summary.errors) == 0

    delta = await adapter.sync_delta_updates(datetime.now(timezone.utc))
    assert delta.items_updated == 2

    valid_sig = await adapter.verify_webhook_payload(
        b"{}", "valid_mock_catalog_signature"
    )
    assert valid_sig is True

