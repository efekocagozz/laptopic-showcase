"""Write the import file the backend's supplier sync reads (SUPPLIER_FEED_PATH)."""

import csv
import io
import os
import tempfile
from collections.abc import Iterable
from pathlib import Path

from laptopic_ops.feed.normalise import FeedRow, RejectedRow
from laptopic_ops.money import format_euros

FEED_HEADER = "sku,stock,price"


def render_feed(rows: Iterable[FeedRow]) -> str:
    lines = [FEED_HEADER]
    lines += [f"{row.sku},{row.stock_on_hand},{format_euros(row.price_with_tax)}" for row in rows]
    return "\n".join(lines) + "\n"


def render_rejects(rejected: Iterable[RejectedRow]) -> str:
    """Rejected rows as CSV for whoever fixes the supplier file. Messages can contain commas and quotes."""
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(["line", "message"])
    writer.writerows([reject.line, reject.message] for reject in rejected)
    return buffer.getvalue()


def write_atomically(path: Path, content: str) -> None:
    """Write to a temporary file in the same directory, then rename it over the target.

    A rename within one file system is atomic, so the nightly sync job sees either the old file or the
    complete new one, never a half-written file.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as file:
            file.write(content)
            file.flush()
            os.fsync(file.fileno())
        os.replace(temp_name, path)
    except BaseException:
        Path(temp_name).unlink(missing_ok=True)
        raise
