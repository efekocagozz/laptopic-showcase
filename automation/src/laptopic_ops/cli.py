"""Command line entry point: `laptopic-ops feed ...` and `laptopic-ops report ...`.

Exit codes are meant for cron and CI:
  0  done, nothing to look at
  1  done, but something needs a person (rejected feed rows, unsettled payments, low stock)
  2  failed; nothing was written
"""

import argparse
import sys
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from pathlib import Path

from laptopic_ops.config import ConfigError, admin_api_settings
from laptopic_ops.feed.normalise import FeedFormatError, normalise_supplier_export
from laptopic_ops.feed.source import FeedSourceError, read_source
from laptopic_ops.feed.writer import render_feed, render_rejects, write_atomically
from laptopic_ops.report.build import build_report
from laptopic_ops.report.render import render_csv, render_markdown
from laptopic_ops.vendure.client import VendureAdminClient, VendureApiError

EXIT_OK = 0
EXIT_ATTENTION = 1
EXIT_FAILED = 2

DEFAULT_REPORT_HOURS = 24
DEFAULT_LOW_STOCK_THRESHOLD = 3


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        if args.command == "feed":
            return _run_feed(args)
        return _run_report(args)
    except (ConfigError, FeedFormatError, FeedSourceError, VendureApiError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return EXIT_FAILED


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="laptopic-ops", description=__doc__.splitlines()[0])
    commands = parser.add_subparsers(dest="command", required=True)

    feed = commands.add_parser("feed", help="Convert the supplier export into the shop's import file")
    feed.add_argument("--input", required=True, help="Supplier export: a file path or an http(s) URL")
    feed.add_argument(
        "--output", required=True, type=Path, help="Import file (the backend's SUPPLIER_FEED_PATH)"
    )
    feed.add_argument("--rejects", type=Path, help="Optional CSV of rejected rows with the reason")

    report = commands.add_parser("report", help="Daily orders, payments and low-stock report (Admin API)")
    report.add_argument("--hours", type=_positive_int, default=DEFAULT_REPORT_HOURS, help="Look-back window")
    report.add_argument(
        "--low-stock", type=_non_negative_int, default=DEFAULT_LOW_STOCK_THRESHOLD, help="Stock threshold"
    )
    report.add_argument("--format", choices=["md", "csv"], default="md")
    report.add_argument("--output", type=Path, help="Write to this file instead of stdout")
    return parser


def _run_feed(args: argparse.Namespace) -> int:
    feed = normalise_supplier_export(read_source(args.input))
    for reject in feed.rejected:
        print(f"line {reject.line}: {reject.message}", file=sys.stderr)
    if args.rejects:
        write_atomically(args.rejects, render_rejects(feed.rejected))
    if not feed.rows:
        # Keep yesterday's file rather than replacing it with an empty one.
        print("error: no valid rows; the import file was not changed", file=sys.stderr)
        return EXIT_FAILED

    write_atomically(args.output, render_feed(feed.rows))
    print(f"Wrote {len(feed.rows)} rows to {args.output} ({len(feed.rejected)} rejected)", file=sys.stderr)
    return EXIT_ATTENTION if feed.rejected else EXIT_OK


def _run_report(args: argparse.Namespace) -> int:
    settings = admin_api_settings()
    window_end = datetime.now(UTC)
    window_start = window_end - timedelta(hours=args.hours)
    with VendureAdminClient(settings.api_url) as client:
        client.login(settings.username, settings.password)
        orders = client.placed_orders_since(window_start)
        variants = client.product_variants()

    report = build_report(
        orders, variants, window_start=window_start, window_end=window_end, low_stock_threshold=args.low_stock
    )
    output = render_markdown(report) if args.format == "md" else render_csv(report)
    if args.output:
        write_atomically(args.output, output)
    else:
        sys.stdout.write(output)
    return EXIT_ATTENTION if report.needs_attention else EXIT_OK


def _positive_int(value: str) -> int:
    number = int(value)
    if number <= 0:
        raise argparse.ArgumentTypeError("must be a positive whole number")
    return number


def _non_negative_int(value: str) -> int:
    number = int(value)
    if number < 0:
        raise argparse.ArgumentTypeError("must be zero or more")
    return number


if __name__ == "__main__":
    sys.exit(main())
