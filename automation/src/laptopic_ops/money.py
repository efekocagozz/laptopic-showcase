"""Money helpers. Amounts are integer cents everywhere, as in the Vendure backend; Decimal is only used
while parsing supplier prices, never float."""

from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

# Dutch standard VAT rate (21%), the same rate the shop's tax category uses.
VAT_RATE = Decimal("0.21")

_CENT = Decimal("0.01")


class InvalidAmountError(ValueError):
    """Raised when a price string cannot be read as a euro amount."""


def parse_dutch_euros(value: str) -> Decimal:
    """Read a euro amount as Dutch spreadsheets export it: "1.234,56", "552,89", "€ 39" or "39.00".

    A comma is the decimal separator; dots before it are thousands separators. Without a comma, a single
    dot followed by one or two digits is read as a decimal point, so "39.00" also works.
    """
    text = value.replace("€", "").replace("\u00a0", "").replace(" ", "").strip()
    if not text:
        raise InvalidAmountError("empty amount")
    if "," in text:
        if text.count(",") > 1:
            raise InvalidAmountError(f'"{value}" has more than one decimal comma')
        euros, cents = text.split(",")
        text = f"{euros.replace('.', '')}.{cents}"
    elif text.count(".") > 1 or (text.count(".") == 1 and len(text.split(".")[1]) == 3):
        # "1.234" or "1.234.567": dots are thousands separators.
        text = text.replace(".", "")
    try:
        amount = Decimal(text)
    except InvalidOperation as error:
        raise InvalidAmountError(f'"{value}" is not a number') from error
    if not amount.is_finite():
        raise InvalidAmountError(f'"{value}" is not a number')
    return amount


def to_cents(euros: Decimal) -> int:
    """Round half up to whole cents (the usual rounding for prices) and return integer cents."""
    return int(euros.quantize(_CENT, rounding=ROUND_HALF_UP) * 100)


def add_vat(price_excl_vat: Decimal) -> Decimal:
    return price_excl_vat * (1 + VAT_RATE)


def format_euros(cents: int) -> str:
    """12345 -> "123.45", the format the backend's supplier feed parser expects."""
    sign = "-" if cents < 0 else ""
    euros, rest = divmod(abs(cents), 100)
    return f"{sign}{euros}.{rest:02d}"
