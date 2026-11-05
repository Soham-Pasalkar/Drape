"""
DRAPE Domain Port: Tax & Fiscal Calculation.

Defines the abstract interface for determining checkout sales tax, VAT,
and customs duties.
Conforms to docs/architecture/interfaces/tax_calculation_port.md.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass(frozen=True)
class ShippingAddress:
    """Standardized physical delivery address."""
    line1: str
    city: str
    state_province: str
    postal_code: str
    country_code: str  # ISO-3166-1 alpha-2


@dataclass(frozen=True)
class TaxJurisdiction:
    """Tax details for a specific fiscal jurisdiction."""
    jurisdiction_level: str  # country, state, county, city
    jurisdiction_name: str
    rate: float  # e.g. 0.0825
    amount_cents: int


@dataclass(frozen=True)
class TaxBreakdown:
    """Comprehensive tax calculation summary."""
    total_tax_cents: int
    currency: str
    jurisdictions: List[TaxJurisdiction]
    is_tax_exempt: bool = False


class TaxCalculationPort(ABC):
    """
    Abstract Port for Tax & Duties Calculation.
    
    Decouples DRAPE commerce from automated tax engines (Stripe Tax, Avalara, TaxJar).
    """

    @abstractmethod
    async def calculate_tax(
        self,
        order_amount_cents: int,
        currency: str,
        shipping_address: ShippingAddress,
        item_tax_codes: List[str],
        customer_tax_id: Optional[str] = None,
    ) -> TaxBreakdown:
        """Calculates precise tax amounts for an order breakdown."""
        pass

