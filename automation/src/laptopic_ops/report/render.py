"""Render a DailyReport as Markdown (for people: email, chat) or CSV (for spreadsheets)."""

import csv
import io

from laptopic_ops.money import format_euros
from laptopic_ops.report.build import DailyReport

_TIME_FORMAT = "%Y-%m-%d %H:%M %Z"


def render_markdown(report: DailyReport) -> str:
    start = report.window_start.strftime(_TIME_FORMAT).strip()
    end = report.window_end.strftime(_TIME_FORMAT).strip()
    lines = [
        "# laptopic daily report",
        "",
        f"Period: {start} to {end}",
        "",
        "## Orders",
        "",
        f"- Placed orders: **{report.order_count}** (cancelled: {report.cancelled_count})",
        f"- Revenue incl. VAT: **EUR {format_euros(report.revenue_with_tax)}**",
        "",
    ]
    if report.by_payment_method:
        lines += ["| Payment method | Orders | Revenue incl. VAT |", "|---|---:|---:|"]
        lines += [
            f"| {total.method} | {total.order_count} | EUR {format_euros(total.revenue_with_tax)} |"
            for total in report.by_payment_method
        ]
        lines.append("")

    lines += ["## Needs attention", ""]
    if not report.needs_attention:
        lines += ["Nothing. All payments are settled and stock is above the threshold.", ""]
    if report.awaiting_settlement:
        lines.append(f"Payment authorized but not settled ({len(report.awaiting_settlement)}):")
        lines += [f"- {code}" for code in report.awaiting_settlement]
        lines.append("")
    if report.low_stock:
        lines.append(f"Low stock (saleable units <= {report.low_stock_threshold}):")
        lines += [f"- {item.sku} ({item.name}): {item.saleable_stock}" for item in report.low_stock]
        lines.append("")
    return "\n".join(lines)


def render_csv(report: DailyReport) -> str:
    """One row per metric, so the file can be appended to a spreadsheet day after day."""
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(["window_start", "metric", "key", "value"])
    start = report.window_start.isoformat()
    writer.writerow([start, "order_count", "", report.order_count])
    writer.writerow([start, "cancelled_count", "", report.cancelled_count])
    writer.writerow([start, "revenue_with_tax_cents", "", report.revenue_with_tax])
    for total in report.by_payment_method:
        writer.writerow([start, "orders_by_payment_method", total.method, total.order_count])
        writer.writerow([start, "revenue_by_payment_method_cents", total.method, total.revenue_with_tax])
    for code in report.awaiting_settlement:
        writer.writerow([start, "awaiting_settlement", code, ""])
    for item in report.low_stock:
        writer.writerow([start, "low_stock", item.sku, item.saleable_stock])
    return buffer.getvalue()
