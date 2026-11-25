from decimal import Decimal

import pytest

from laptopic_ops.money import InvalidAmountError, add_vat, format_euros, parse_dutch_euros, to_cents


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("552,89", Decimal("552.89")),
        ("1.234,56", Decimal("1234.56")),
        ("€ 39", Decimal("39")),
        ("39.00", Decimal("39.00")),
        ("1.234", Decimal("1234")),
        ("0,5", Decimal("0.5")),
        ("1\u00a0234,00", Decimal("1234.00")),
    ],
)
def test_parse_dutch_euros(text: str, expected: Decimal) -> None:
    assert parse_dutch_euros(text) == expected


@pytest.mark.parametrize("text", ["", "abc", "1,2,3", "NaN", "Infinity"])
def test_parse_dutch_euros_rejects_garbage(text: str) -> None:
    with pytest.raises(InvalidAmountError):
        parse_dutch_euros(text)


def test_to_cents_rounds_half_up() -> None:
    assert to_cents(Decimal("668.9969")) == 66900
    assert to_cents(Decimal("0.005")) == 1
    assert to_cents(Decimal("0.0049")) == 0


def test_add_vat_uses_21_percent_without_float_error() -> None:
    # 0.1 + 0.2 style float errors would show up here; Decimal keeps it exact.
    assert add_vat(Decimal("100")) == Decimal("121.00")
    assert to_cents(add_vat(Decimal("552.89"))) == 66900


@pytest.mark.parametrize(("cents", "text"), [(66900, "669.00"), (5, "0.05"), (0, "0.00"), (-150, "-1.50")])
def test_format_euros(cents: int, text: str) -> None:
    assert format_euros(cents) == text
