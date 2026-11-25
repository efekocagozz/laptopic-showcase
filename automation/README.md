# laptopic-ops — Python automation for shop operations

A small, typed Python 3.12 command line tool that automates two jobs a webshop otherwise does by hand:

| Command | Automates | Talks to |
|---|---|---|
| `laptopic-ops feed` | Turning the supplier's messy spreadsheet export into the clean import file for the nightly stock/price sync | A file or URL in, a file out |
| `laptopic-ops report` | A daily operations report: orders, revenue, iDEAL vs in3 split, unsettled payments, low stock | Vendure Admin API (GraphQL, read-only) |

Both are built for cron: they are non-interactive and they signal problems through exit codes:

| Exit code | Meaning |
|---|---|
| `0` | Done, nothing to look at |
| `1` | Done, but a person should look: rejected feed rows, unsettled payments, low stock |
| `2` | Failed (bad config, unreachable API, unusable file); nothing was written |

## Why it exists

The backend's supplier sync (`backend/src/plugins/supplier-sync/`) imports a strict `sku,stock,price` CSV from
`SUPPLIER_FEED_PATH`, with prices **including** VAT and a dot as the decimal separator. Real suppliers don't
export that. A typical Dutch wholesaler sends something like:

```csv
Artikelnummer;Omschrijving;Voorraad;Adviesprijs excl. BTW
TP-T14G3-32-512;ThinkPad T14 Gen 3 i7 32GB/512GB (refurbished);2;552,89
;Docking station zonder artikelnummer;4;120,00
HP-650G5-8-256;ProBook 650 G5 i5 8GB/256GB;op aanvraag;249,00
```

The file uses semicolons, Dutch decimal commas and prices excluding VAT, and some rows are broken. `feed`
handles the conversion, adds 21% VAT and rejects the broken rows with the supplier's own line numbers. It
writes the import file atomically, so the 03:00 sync never reads half a file. If no valid rows remain, it
keeps yesterday's file.

The shop owner also wants to know each morning what happened and what needs action. `report` reads that from
the Admin API, so nobody has to click through the Dashboard.

The design decision and its trade-offs are in
[docs/decisions/0005-python-ops-automation.md](../docs/decisions/0005-python-ops-automation.md).

## Setup

```bash
cd automation
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Usage

```bash
# Supplier export (file or https URL) -> import file for the backend
laptopic-ops feed --input examples/supplier-export.csv --output ../backend/supplier-feed/supplier.csv --rejects rejects.csv
```

The example export produces exactly `backend/supplier-feed/sample.csv`; three broken rows are rejected:

```
line 7: Missing SKU
line 8: Duplicate SKU TP-T490-8-256
line 9: Invalid stock "op aanvraag"
Wrote 5 rows to ../backend/supplier-feed/supplier.csv (3 rejected)
```

The report reads the same `SUPERADMIN_*` variables as `backend/.env`. `VENDURE_ADMIN_API_URL` defaults to
`http://localhost:3000/admin-api`.

```bash
export SUPERADMIN_USERNAME=superadmin SUPERADMIN_PASSWORD=...
laptopic-ops report                       # Markdown to stdout, last 24 hours
laptopic-ops report --hours 168 --low-stock 2 --format csv --output reports/week.csv
```

Output against the seeded demo shop with two test orders:

```markdown
## Orders

- Placed orders: **2** (cancelled: 0)
- Revenue incl. VAT: **EUR 1157.90**

| Payment method | Orders | Revenue incl. VAT |
|---|---:|---:|
| ideal | 1 | EUR 603.95 |
| in3 | 1 | EUR 553.95 |

## Needs attention

Low stock (saleable units <= 3):
- HP-X3601040G8-32-1000 (HP EliteBook x360 1040 G8 32 GB 1 TB SSD): 1
- ...
```

Running both on a server with cron:

```cron
# 02:30: prepare the supplier file the 03:00 sync imports; mail the rejects if there are any
30 2 * * *  cd /opt/laptopic/automation && .venv/bin/laptopic-ops feed --input "$SUPPLIER_EXPORT_URL" --output /srv/feeds/supplier.csv --rejects /srv/feeds/rejects.csv
# 07:00: morning report
0 7 * * *   cd /opt/laptopic/automation && .venv/bin/laptopic-ops report --output /srv/reports/$(date +\%F).md
```

## How the code is organised

```
src/laptopic_ops/
  cli.py               argparse entry point; maps errors to exit codes
  config.py            settings from environment variables, validated at startup
  money.py             Dutch amounts -> Decimal -> integer cents; VAT_RATE
  feed/normalise.py    pure: supplier export text -> valid rows + rejected rows
  feed/source.py       I/O: read a file or download over HTTP (size limit, timeout, encodings)
  feed/writer.py       I/O: render the backend's CSV format and write it atomically
  vendure/client.py    Admin API client: login (bearer token), paging, GraphQL errors
  vendure/models.py    pydantic models (DTOs) for the API responses
  report/build.py      pure: orders + variants -> DailyReport
  report/render.py     DailyReport -> Markdown or CSV
```

These are the same principles as the rest of the repository (see `CLAUDE.md`):

- **Pure logic is separate from I/O.** Normalising, money and report building are plain functions and need no
  mocks to test. Only `source.py`, `writer.py` and `client.py` touch the outside world.
- **Money is integer cents.** `Decimal` is used only while parsing supplier prices, never `float`. Rounding is
  half-up to the cent, once, after adding VAT.
- **Validate at the boundary.** Config is checked at startup, every API response goes through a pydantic model,
  and every supplier row is checked before it is accepted.
- **The backend stays the authority.** The feed rules mirror `parseSupplierFeed` in
  `backend/src/plugins/supplier-sync/supplier-feed.ts`, and the backend validates the file again on import.
- **Read-only, no secrets in code.** The report only runs queries, and credentials come from the environment.
  The password is kept out of `repr()`.

## Quality checks

```bash
ruff check . && ruff format --check .   # lint + formatting
mypy                                    # strict type checking
pytest                                  # 67 tests
```

The tests cover:

- **Dutch amount parsing and rounding.** For example, `1.234,56`, a no-break space as thousands separator,
  and `NaN`.
- **Every rejection rule.** Includes quoted cells and BOM/cp1252 files.
- **Atomic writes.** The old file survives a failed write.
- **The report rules.** Cancelled orders are excluded, the in3/iDEAL split ignores failed payment attempts,
  and stock counts what can be sold (on hand minus allocated).
- **The Admin API client.** Login, bearer token, paging and GraphQL/HTTP errors, against an API mocked with
  `respx`.

A golden test checks that the example export becomes the backend's own `sample.csv`. In CI, a separate job
runs lint, types and tests. The storefront job also runs `laptopic-ops report` against a real, seeded Vendure
server.
