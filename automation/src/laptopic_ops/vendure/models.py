"""Admin API response shapes (DTOs), validated with pydantic. Only the fields the reports need."""

from collections.abc import Sequence
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class _ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, frozen=True, extra="ignore")


class PaymentMetadata(_ApiModel):
    # The Mollie plugin stores Mollie's payment method here ("ideal", "in3", ...).
    method: str | None = None


class Payment(_ApiModel):
    method: str
    """Vendure payment method code, e.g. "mollie"."""
    state: str
    amount: int
    metadata: PaymentMetadata | None = None


class Order(_ApiModel):
    code: str
    state: str
    order_placed_at: datetime | None = None
    total_with_tax: int
    currency_code: str
    payments: list[Payment] = Field(default_factory=list)


class StockLevel(_ApiModel):
    stock_on_hand: int
    stock_allocated: int


class ProductVariant(_ApiModel):
    sku: str
    name: str
    enabled: bool
    stock_levels: list[StockLevel] = Field(default_factory=list)

    @property
    def saleable_stock(self) -> int:
        """Units that can still be sold: on hand minus allocated to placed orders, across stock locations."""
        return sum(level.stock_on_hand - level.stock_allocated for level in self.stock_levels)


class ListResult(_ApiModel):
    """One page of a Vendure list query (`items` + `totalItems`)."""

    items: Sequence[object]
    total_items: int


class OrderList(ListResult):
    items: list[Order]


class ProductVariantList(ListResult):
    items: list[ProductVariant]
