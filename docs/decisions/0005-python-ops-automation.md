# 0005 — Operations automation as a separate Python tool

- **Status:** accepted
- **Date:** 2026-11-25

## Context

Two recurring operations tasks were still manual:

1. **Preparing the supplier file.** The supplier sync plugin imports a strict `sku,stock,price` CSV (prices incl.
   VAT, dot decimals) from `SUPPLIER_FEED_PATH`. Nothing produced that file: suppliers export semicolon-separated
   spreadsheets with Dutch decimal commas and prices excluding VAT, often with broken rows.
2. **Knowing what needs attention.** Each morning someone has to check new orders, the in3/iDEAL split, payments
   that were authorized but not settled, and variants running out of stock. Today that means clicking through
   the Dashboard.

## Decision

A small Python 3.12 command line tool in `automation/` (`laptopic-ops`), run by cron next to the shop:

- `feed` converts the supplier export into the backend's import format. It uses the same row rules as the
  backend parser, rejects bad rows with the supplier's line numbers, and writes the file atomically. It never
  replaces a good file with an empty one.
- `report` logs in to the **Admin API** with the superadmin credentials and only runs read queries. It renders
  a Markdown or CSV report and exits with code 1 when something needs a person.

## Why outside Vendure, and why Python

- **These are operations scripts, not shop logic.** They run on a schedule or by hand, and they only talk to
  the public Admin API, the same API the Dashboard uses. They don't need the server's internals, so they don't
  belong in a plugin. A Vendure plugin would also put them in the worker's deploy and release cycle.
- **The backend keeps the business rules.** The tool doesn't decide prices, stock or order state; it prepares
  input and reads results. The supplier sync still validates the file and still holds back suspicious price
  jumps (`maxPriceChangePercent`).
- **Python suits this kind of work.** The standard `csv` and `decimal` modules handle messy spreadsheet exports
  well, a single-file cron job is simple to deploy, and the shop's other back-office scripts (accounting
  exports, marketplace feeds) are likely to be Python too.

## Trade-offs

- **The feed rules exist twice** (`supplier-feed.ts` and `feed/normalise.py`). That's deliberate: the Python
  side gives early, readable feedback with the supplier's own line numbers, and the backend stays authoritative.
  A golden test keeps them in step: the example export must turn into the backend's own `sample.csv`.
- **A second toolchain** (Python next to Node). It is kept small: two runtime dependencies (`httpx`, `pydantic`),
  its own CI job (ruff, mypy strict, pytest) and Dependabot updates.
- **The report uses superadmin credentials.** That is acceptable for a one-person shop. For a team, create a
  dedicated Administrator with a read-only role and give the tool those credentials instead.

## Alternatives considered

- **Teach the backend plugin the supplier's format.** Rejected. It would couple the plugin to one supplier's
  spreadsheet, and the next supplier would need another code path in the server.
- **A Vendure scheduled task that emails the report.** Possible, but it would run inside the worker and need a
  deploy for every change to the report. A separate tool can change without touching the shop.
