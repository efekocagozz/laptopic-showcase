import re
from pathlib import Path

import httpx
import pytest
import respx

from laptopic_ops.feed.normalise import FeedFormatError, FeedRow, normalise_supplier_export
from laptopic_ops.feed.source import MAX_FEED_BYTES, FeedSourceError, read_source
from laptopic_ops.feed.writer import render_feed, render_rejects, write_atomically

AUTOMATION_DIR = Path(__file__).parent.parent
EXAMPLE_EXPORT = AUTOMATION_DIR / "examples" / "supplier-export.csv"
# The backend's own sample feed: the exact format its supplier sync parser accepts.
BACKEND_SAMPLE_FEED = AUTOMATION_DIR.parent / "backend" / "supplier-feed" / "sample.csv"

HEADER = "Artikelnummer;Omschrijving;Voorraad;Adviesprijs excl. BTW"


def test_example_export_becomes_the_backend_sample_feed() -> None:
    feed = normalise_supplier_export(EXAMPLE_EXPORT.read_text(encoding="utf-8"))

    assert render_feed(feed.rows) == BACKEND_SAMPLE_FEED.read_text(encoding="utf-8")
    assert [(reject.line, reject.message) for reject in feed.rejected] == [
        (7, "Missing SKU"),
        (8, "Duplicate SKU TP-T490-8-256"),
        (9, 'Invalid stock "op aanvraag"'),
    ]


def test_rendered_feed_matches_backend_parser_rules() -> None:
    """Mirror of the patterns in backend/src/plugins/supplier-sync/supplier-feed.ts."""
    feed = normalise_supplier_export(EXAMPLE_EXPORT.read_text(encoding="utf-8"))
    lines = render_feed(feed.rows).splitlines()

    assert lines[0] == "sku,stock,price"
    for line in lines[1:]:
        sku, stock, price = line.split(",")
        assert sku
        assert re.fullmatch(r"\d+", stock)
        assert re.fullmatch(r"\d+(\.\d{1,2})?", price)
        assert float(price) > 0


def test_adds_vat_and_converts_dutch_decimals() -> None:
    feed = normalise_supplier_export(f"{HEADER}\nSKU-1;Laptop;3;1.000,00\n")
    assert feed.rows == [FeedRow(sku="SKU-1", stock_on_hand=3, price_with_tax=121000)]


def test_accepts_comma_separated_files_with_bom_and_any_column_order() -> None:
    text = "﻿Voorraad,Artikelnummer,Adviesprijs excl. BTW\n5,SKU-1,10.00\r\n"
    feed = normalise_supplier_export(text)
    assert feed.rows == [FeedRow(sku="SKU-1", stock_on_hand=5, price_with_tax=1210)]


def test_handles_quoted_cells_containing_the_delimiter() -> None:
    feed = normalise_supplier_export(f'{HEADER}\nSKU-1;"Laptop; 14 inch";3;100,00\n')
    assert [row.sku for row in feed.rows] == ["SKU-1"]
    assert feed.rejected == []


@pytest.mark.parametrize(
    ("row", "message"),
    [
        ("SKU 1;Laptop;3;100,00", 'Invalid SKU "SKU 1" (no spaces or commas allowed)'),
        ("SKU-1;Laptop;-2;100,00", 'Invalid stock "-2"'),
        ("SKU-1;Laptop;2,5;100,00", 'Invalid stock "2,5"'),
        ("SKU-1;Laptop;3;gratis", 'Invalid price: "gratis" is not a number'),
        ("SKU-1;Laptop;3;0,00", 'Invalid price "0,00" (must be above zero)'),
        ("SKU-1;Laptop;3;-10,00", 'Invalid price "-10,00" (must be above zero)'),
        ("SKU-1;Laptop;3", "Expected 4 columns, found 3"),
    ],
)
def test_rejects_invalid_rows_with_reason(row: str, message: str) -> None:
    feed = normalise_supplier_export(f"{HEADER}\n{row}\nSKU-OK;Sleeve;1;10,00\n")

    assert [reject.message for reject in feed.rejected] == [message]
    assert feed.rejected[0].line == 2
    assert [row.sku for row in feed.rows] == ["SKU-OK"], "valid rows still go through"


def test_skips_blank_lines() -> None:
    feed = normalise_supplier_export(f"{HEADER}\n\n;;;\nSKU-1;Laptop;3;100,00\n")
    assert len(feed.rows) == 1
    assert feed.rejected == []


@pytest.mark.parametrize("text", ["", "\n", "sku;stock\nA;1\n"])
def test_unusable_files_raise(text: str) -> None:
    with pytest.raises(FeedFormatError):
        normalise_supplier_export(text)


def test_render_rejects_quotes_messages() -> None:
    feed = normalise_supplier_export(f'{HEADER}\nSKU-1;Laptop;"op, aanvraag";1,00\n')
    assert render_rejects(feed.rejected) == 'line,message\n2,"Invalid stock ""op, aanvraag"""\n'


def test_write_atomically_replaces_file_and_leaves_no_temp_files(tmp_path: Path) -> None:
    target = tmp_path / "feeds" / "supplier.csv"
    write_atomically(target, "old\n")
    write_atomically(target, "new\n")

    assert target.read_text() == "new\n"
    assert [path.name for path in target.parent.iterdir()] == ["supplier.csv"]


def test_write_atomically_keeps_old_file_when_writing_fails(tmp_path: Path) -> None:
    target = tmp_path / "supplier.csv"
    target.write_text("old\n")

    with pytest.raises(UnicodeEncodeError):
        write_atomically(target, "\udcff")  # a lone surrogate cannot be encoded as UTF-8

    assert target.read_text() == "old\n"
    assert [path.name for path in tmp_path.iterdir()] == ["supplier.csv"]


def test_read_source_reads_cp1252_files(tmp_path: Path) -> None:
    path = tmp_path / "export.csv"
    path.write_bytes("Omschrijving\nCafé\n".encode("cp1252"))
    assert read_source(str(path)) == "Omschrijving\nCafé\n"


def test_read_source_missing_file(tmp_path: Path) -> None:
    with pytest.raises(FeedSourceError, match="File not found"):
        read_source(str(tmp_path / "nope.csv"))


@respx.mock
def test_read_source_downloads_over_http() -> None:
    respx.get("https://supplier.example/export.csv").respond(200, content=EXAMPLE_EXPORT.read_bytes())
    with httpx.Client() as client:
        assert read_source("https://supplier.example/export.csv", client).startswith("Artikelnummer;")


@respx.mock
def test_read_source_reports_http_errors() -> None:
    respx.get("https://supplier.example/export.csv").respond(503)
    with httpx.Client() as client, pytest.raises(FeedSourceError, match="503"):
        read_source("https://supplier.example/export.csv", client)


@respx.mock
def test_read_source_refuses_huge_downloads() -> None:
    respx.get("https://supplier.example/export.csv").respond(200, content=b"x" * (MAX_FEED_BYTES + 1))
    with httpx.Client() as client, pytest.raises(FeedSourceError, match="larger than"):
        read_source("https://supplier.example/export.csv", client)
