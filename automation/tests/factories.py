"""Small builders for Admin API models, so tests only spell out the fields they care about."""

from datetime import UTC, datetime

from laptopic_ops.vendure.models import Order, Payment, PaymentMetadata, ProductVariant, StockLevel

PLACED_AT = datetime(2026, 11, 24, 12, 0, tzinfo=UTC)


def payment(mollie_method: str | None = "ideal", state: str = "Settled", amount: int = 10000) -> Payment:
    metadata = PaymentMetadata(method=mollie_method) if mollie_method else None
    return Payment(method="mollie", state=state, amount=amount, metadata=metadata)


def order(
    code: str = "ORDER1",
    state: str = "PaymentSettled",
    total_with_tax: int = 10000,
    payments: list[Payment] | None = None,
    currency_code: str = "EUR",
) -> Order:
    return Order(
        code=code,
        state=state,
        order_placed_at=PLACED_AT,
        total_with_tax=total_with_tax,
        currency_code=currency_code,
        payments=[payment(amount=total_with_tax)] if payments is None else payments,
    )


def variant(sku: str, on_hand: int, allocated: int = 0, enabled: bool = True) -> ProductVariant:
    return ProductVariant(
        sku=sku,
        name=f"Product {sku}",
        enabled=enabled,
        stock_levels=[StockLevel(stock_on_hand=on_hand, stock_allocated=allocated)],
    )
