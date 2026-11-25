from datetime import UTC, datetime

import pytest

from laptopic_ops.report.build import (
    UNPAID,
    DailyReport,
    PaymentMethodTotal,
    build_report,
    payment_method_of,
)
from laptopic_ops.report.render import render_csv, render_markdown
from laptopic_ops.vendure.models import Order, ProductVariant
from tests.factories import order, payment, variant

WINDOW_START = datetime(2026, 11, 24, 3, 0, tzinfo=UTC)
WINDOW_END = datetime(2026, 11, 25, 3, 0, tzinfo=UTC)


def _report(
    orders: list[Order], variants: list[ProductVariant] | None = None, threshold: int = 3
) -> DailyReport:
    return build_report(
        orders,
        variants or [],
        window_start=WINDOW_START,
        window_end=WINDOW_END,
        low_stock_threshold=threshold,
    )


def test_revenue_and_counts_exclude_cancelled_orders() -> None:
    report = _report(
        [
            order("A", total_with_tax=66900),
            order("B", total_with_tax=23900),
            order("C", state="Cancelled", total_with_tax=99999),
        ]
    )
    assert report.order_count == 2
    assert report.cancelled_count == 1
    assert report.revenue_with_tax == 90800


def test_splits_revenue_by_mollie_method_biggest_first() -> None:
    report = _report(
        [
            order("A", total_with_tax=10000, payments=[payment("ideal")]),
            order("B", total_with_tax=80000, payments=[payment("in3")]),
            order("C", total_with_tax=5000, payments=[payment("ideal")]),
        ]
    )
    assert report.by_payment_method == [
        PaymentMethodTotal(method="in3", order_count=1, revenue_with_tax=80000),
        PaymentMethodTotal(method="ideal", order_count=2, revenue_with_tax=15000),
    ]


def test_payment_method_ignores_failed_attempts_and_falls_back_to_vendure_code() -> None:
    retried = order(payments=[payment("ideal", state="Declined"), payment("in3", state="Settled")])
    assert payment_method_of(retried) == "in3"

    assert payment_method_of(order(payments=[payment(mollie_method=None)])) == "mollie"
    assert payment_method_of(order(payments=[payment("ideal", state="Error")])) == UNPAID
    assert payment_method_of(order(payments=[])) == UNPAID


def test_flags_orders_awaiting_settlement() -> None:
    report = _report(
        [
            order("A"),
            order("B", state="PaymentAuthorized", payments=[payment("in3", state="Authorized")]),
        ]
    )
    assert report.awaiting_settlement == ["B"]
    assert report.needs_attention


def test_low_stock_uses_saleable_stock_and_skips_disabled_variants() -> None:
    report = _report(
        [],
        [
            variant("PLENTY", on_hand=20),
            variant("ALLOCATED", on_hand=5, allocated=4),  # 1 saleable
            variant("EMPTY", on_hand=0),
            variant("EDGE", on_hand=3),  # exactly at the threshold counts as low
            variant("HIDDEN", on_hand=0, enabled=False),
        ],
        threshold=3,
    )
    assert [(item.sku, item.saleable_stock) for item in report.low_stock] == [
        ("EMPTY", 0),
        ("ALLOCATED", 1),
        ("EDGE", 3),
    ]


def test_quiet_day_needs_no_attention() -> None:
    report = _report([order()], [variant("SKU", on_hand=10)])
    assert not report.needs_attention
    assert "Nothing." in render_markdown(report)


def test_refuses_foreign_currencies() -> None:
    with pytest.raises(ValueError, match="USD"):
        _report([order(currency_code="USD")])


def test_markdown_report() -> None:
    report = _report(
        [
            order("A", total_with_tax=66900, payments=[payment("in3")]),
            order(
                "B", state="PaymentAuthorized", total_with_tax=3900, payments=[payment("ideal", "Authorized")]
            ),
        ],
        [variant("DL-7420-16-512", on_hand=0)],
    )
    assert render_markdown(report) == (
        "# laptopic daily report\n"
        "\n"
        "Period: 2026-11-24 03:00 UTC to 2026-11-25 03:00 UTC\n"
        "\n"
        "## Orders\n"
        "\n"
        "- Placed orders: **2** (cancelled: 0)\n"
        "- Revenue incl. VAT: **EUR 708.00**\n"
        "\n"
        "| Payment method | Orders | Revenue incl. VAT |\n"
        "|---|---:|---:|\n"
        "| in3 | 1 | EUR 669.00 |\n"
        "| ideal | 1 | EUR 39.00 |\n"
        "\n"
        "## Needs attention\n"
        "\n"
        "Payment authorized but not settled (1):\n"
        "- B\n"
        "\n"
        "Low stock (saleable units <= 3):\n"
        "- DL-7420-16-512 (Product DL-7420-16-512): 0\n"
    )


def test_csv_report_has_one_metric_per_row() -> None:
    report = _report([order("A", total_with_tax=66900, payments=[payment("in3")])], [variant("X", 1)])
    rows = render_csv(report).splitlines()

    assert rows[0] == "window_start,metric,key,value"
    assert "2026-11-24T03:00:00+00:00,revenue_with_tax_cents,,66900" in rows
    assert "2026-11-24T03:00:00+00:00,orders_by_payment_method,in3,1" in rows
    assert "2026-11-24T03:00:00+00:00,low_stock,X,1" in rows
