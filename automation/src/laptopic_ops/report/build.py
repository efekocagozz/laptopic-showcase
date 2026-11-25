"""Build the daily operations report from Admin API data. Pure functions: easy to test without a server."""

from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime

from laptopic_ops.vendure.models import Order, Payment, ProductVariant

SHOP_CURRENCY = "EUR"
CANCELLED_STATE = "Cancelled"
# Payment authorized but not yet settled: someone (or a webhook) still has to finish the payment.
AWAITING_SETTLEMENT_STATE = "PaymentAuthorized"
# Payment states that mean money was (or will be) received, used to decide how an order was paid.
_SUCCESSFUL_PAYMENT_STATES = frozenset({"Authorized", "Settled"})
UNPAID = "unpaid"


@dataclass(frozen=True)
class PaymentMethodTotal:
    method: str
    order_count: int
    revenue_with_tax: int


@dataclass(frozen=True)
class LowStockVariant:
    sku: str
    name: str
    saleable_stock: int


@dataclass(frozen=True)
class DailyReport:
    window_start: datetime
    window_end: datetime
    order_count: int
    cancelled_count: int
    revenue_with_tax: int
    """Placed, non-cancelled orders including VAT, in cents."""
    by_payment_method: list[PaymentMethodTotal]
    awaiting_settlement: list[str]
    """Order codes stuck in PaymentAuthorized."""
    low_stock: list[LowStockVariant]
    low_stock_threshold: int

    @property
    def needs_attention(self) -> bool:
        return bool(self.awaiting_settlement or self.low_stock)


def build_report(
    orders: Sequence[Order],
    variants: Sequence[ProductVariant],
    *,
    window_start: datetime,
    window_end: datetime,
    low_stock_threshold: int,
) -> DailyReport:
    foreign = sorted({order.currency_code for order in orders} - {SHOP_CURRENCY})
    if foreign:
        raise ValueError(f"Unexpected currency {', '.join(foreign)}: the shop sells in {SHOP_CURRENCY} only")

    active = [order for order in orders if order.state != CANCELLED_STATE]
    return DailyReport(
        window_start=window_start,
        window_end=window_end,
        order_count=len(active),
        cancelled_count=len(orders) - len(active),
        revenue_with_tax=sum(order.total_with_tax for order in active),
        by_payment_method=_totals_by_payment_method(active),
        awaiting_settlement=[order.code for order in active if order.state == AWAITING_SETTLEMENT_STATE],
        low_stock=_low_stock(variants, low_stock_threshold),
        low_stock_threshold=low_stock_threshold,
    )


def payment_method_of(order: Order) -> str:
    """How the customer paid: Mollie's method ("ideal", "in3") when known, else Vendure's method code."""
    successful = [payment for payment in order.payments if payment.state in _SUCCESSFUL_PAYMENT_STATES]
    if not successful:
        return UNPAID
    return _method_name(successful[-1])


def _method_name(payment: Payment) -> str:
    if payment.metadata and payment.metadata.method:
        return payment.metadata.method
    return payment.method


def _totals_by_payment_method(orders: Sequence[Order]) -> list[PaymentMethodTotal]:
    counts: Counter[str] = Counter()
    revenue: Counter[str] = Counter()
    for order in orders:
        method = payment_method_of(order)
        counts[method] += 1
        revenue[method] += order.total_with_tax
    return [
        PaymentMethodTotal(method=method, order_count=count, revenue_with_tax=revenue[method])
        for method, count in sorted(counts.items(), key=lambda item: (-revenue[item[0]], item[0]))
    ]


def _low_stock(variants: Sequence[ProductVariant], threshold: int) -> list[LowStockVariant]:
    low = [
        LowStockVariant(sku=variant.sku, name=variant.name, saleable_stock=variant.saleable_stock)
        for variant in variants
        if variant.enabled and variant.saleable_stock <= threshold
    ]
    return sorted(low, key=lambda variant: (variant.saleable_stock, variant.sku))
