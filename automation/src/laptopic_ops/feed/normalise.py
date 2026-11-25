"""Turn the supplier's own export into rows the shop can import. Pure functions: no files, no network.

The supplier (a Dutch wholesaler) exports a spreadsheet like this, semicolon-separated, Dutch decimal
commas, prices excluding VAT:

    Artikelnummer;Omschrijving;Voorraad;Adviesprijs excl. BTW
    TP-T14G3-32-512;ThinkPad T14 Gen 3 32GB/512GB;2;552,89

The backend's supplier sync (backend/src/plugins/supplier-sync/supplier-feed.ts) expects
`sku,stock,price` with prices including VAT and a dot as decimal separator. This module bridges the two
and applies the same row rules as the backend, so problems show up here, with the supplier's own line
numbers, instead of at 03:00 in the sync job. The backend stays the final authority and validates again.
"""

import csv
import io
import re
from dataclasses import dataclass

from laptopic_ops.money import InvalidAmountError, add_vat, parse_dutch_euros, to_cents

# Supplier column names (lower-cased) mapped to what we need. Only these three columns are read.
SKU_COLUMN = "artikelnummer"
STOCK_COLUMN = "voorraad"
PRICE_EXCL_VAT_COLUMN = "adviesprijs excl. btw"
REQUIRED_COLUMNS = (SKU_COLUMN, STOCK_COLUMN, PRICE_EXCL_VAT_COLUMN)

_STOCK_PATTERN = re.compile(r"^\d+$")
# The backend splits its CSV on commas without quoting, so a SKU must not contain one.
_SKU_PATTERN = re.compile(r"^[^,\s]+$")


@dataclass(frozen=True)
class FeedRow:
    sku: str
    stock_on_hand: int
    price_with_tax: int
    """Price including VAT, in cents."""


@dataclass(frozen=True)
class RejectedRow:
    line: int
    """1-based line number in the supplier file (the header is line 1)."""
    message: str


@dataclass(frozen=True)
class NormalisedFeed:
    rows: list[FeedRow]
    rejected: list[RejectedRow]


class FeedFormatError(ValueError):
    """The file as a whole is unusable, e.g. required columns are missing."""


def normalise_supplier_export(text: str) -> NormalisedFeed:
    lines = text.lstrip("﻿").splitlines()
    if not lines or not lines[0].strip():
        raise FeedFormatError("The supplier file is empty")

    delimiter = ";" if ";" in lines[0] else ","
    reader = csv.reader(io.StringIO("\n".join(lines)), delimiter=delimiter)
    header = [column.strip().lower() for column in next(reader)]
    missing = [column for column in REQUIRED_COLUMNS if column not in header]
    if missing:
        raise FeedFormatError(f"Missing column(s): {', '.join(missing)}")
    index = {column: header.index(column) for column in REQUIRED_COLUMNS}

    rows: list[FeedRow] = []
    rejected: list[RejectedRow] = []
    seen_skus: set[str] = set()

    for line_number, cells in enumerate(reader, start=2):
        if not any(cell.strip() for cell in cells):
            continue
        if len(cells) != len(header):
            rejected.append(RejectedRow(line_number, f"Expected {len(header)} columns, found {len(cells)}"))
            continue
        result = _parse_row(cells, index, seen_skus)
        if isinstance(result, str):
            rejected.append(RejectedRow(line_number, result))
        else:
            seen_skus.add(result.sku)
            rows.append(result)

    return NormalisedFeed(rows, rejected)


def _parse_row(cells: list[str], index: dict[str, int], seen_skus: set[str]) -> FeedRow | str:
    """Return the row, or a message explaining why it was rejected."""
    sku = cells[index[SKU_COLUMN]].strip()
    stock = cells[index[STOCK_COLUMN]].strip()
    price = cells[index[PRICE_EXCL_VAT_COLUMN]].strip()

    if not sku:
        return "Missing SKU"
    if not _SKU_PATTERN.match(sku):
        return f'Invalid SKU "{sku}" (no spaces or commas allowed)'
    if sku in seen_skus:
        return f"Duplicate SKU {sku}"
    if not _STOCK_PATTERN.match(stock):
        return f'Invalid stock "{stock}"'
    try:
        price_excl_vat = parse_dutch_euros(price)
    except InvalidAmountError as error:
        return f"Invalid price: {error}"
    price_with_tax = to_cents(add_vat(price_excl_vat))
    if price_with_tax <= 0:
        return f'Invalid price "{price}" (must be above zero)'
    return FeedRow(sku=sku, stock_on_hand=int(stock), price_with_tax=price_with_tax)
