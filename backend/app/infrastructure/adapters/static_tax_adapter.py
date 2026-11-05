"""
Static Tax Calculation Adapter for Local Development and Testing.

Implements TaxCalculationPort with static rate calculations strictly for local testing.
"""

from typing import List, Optional
from app.domain.ports.tax_calculation_port import (
    TaxCalculationPort,
    ShippingAddress,
    TaxBreakdown,
    TaxJurisdiction,
)


class StaticTaxAdapter(TaxCalculationPort):
    def __init__(self, default_rate: float = 0.0825) -> None:
        self.default_rate = default_rate

    async def calculate_tax(
        self,
        order_amount_cents: int,
        currency: str,
        shipping_address: ShippingAddress,
        item_tax_codes: List[str],
        customer_tax_id: Optional[str] = None,
    ) -> TaxBreakdown:
        tax_amount = int(order_amount_cents * self.default_rate)
        return TaxBreakdown(
            total_tax_cents=tax_amount,
            currency=currency,
            jurisdictions=[
                TaxJurisdiction(
                    jurisdiction_level="state",
                    jurisdiction_name=shipping_address.state_province or "Test State",
                    rate=self.default_rate,
                    amount_cents=tax_amount,
                )
            ],
            is_tax_exempt=False,
        )

