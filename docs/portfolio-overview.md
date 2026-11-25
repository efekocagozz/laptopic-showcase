# Portfolio overview: laptopic

A two-minute read for reviewers, and a cheat sheet for talking about the project.

## The problem

A Dutch webshop selling refurbished business laptops wants to offer **in3**: pay in three interest-free
installments, through the payment provider Mollie. in3 comes with real constraints:

- Orders of € 50 – 3,000 only.
- Netherlands and EUR only.
- No surcharge for the customer (banned since 2023).
- The merchant may set its own limits.

The shop also needs the usual operational work: stock and prices from a supplier, Dutch invoices and emails,
returns, and knowing every morning what needs attention.

## What I built

| Part | Technology | Size |
|---|---|---|
| Backend | Vendure 3.8 (TypeScript, NestJS, GraphQL, TypeORM), PostgreSQL | 3 custom plugins, Mollie integration, Dutch emails, seed catalogue (23 products, 40 variants) |
| Storefront | Next.js 16 (App Router), forked from Vendure's official starter | Dutch UI, in3 display, checkout, account, returns form |
| Automation | Python 3.12 (`httpx`, `pydantic`), cron | Supplier export → import file; daily operations report from the Admin API |
| Infrastructure | Docker, Caddy, GitHub Actions, Dependabot | Production compose stack, CI with 4 test layers |

## Key decisions (and why)

1. **Vendure + Next.js instead of Shopify, WooCommerce or Medusa**
   ([ADR 0003](decisions/0003-vendure-and-nextjs.md)). Shopify charges an extra 2% on non-Shopify payments,
   which is too much on a margin of about 3–10% on new laptops. Vendure gives full control over order rules
   and is free to self-host.
2. **Use the community Mollie plugin instead of writing a payment handler**
   ([ADR 0001](decisions/0001-mollie-plugin-for-ideal-and-in3.md)). Reading the plugin's *source*, not its README,
   showed that it uses Mollie's Payments API with order lines. That is what in3 needs.
3. **in3 eligibility is a backend rule** ([ADR 0002](decisions/0002-in3-eligibility-in-the-backend.md)).
   The storefront only displays `in3Quote` from the API. An interceptor refuses ineligible in3 payments before
   Mollie is called.
4. **Fork the official storefront starter** ([ADR 0004](decisions/0004-fork-the-nextjs-starter.md)) instead of
   starting empty. This meant working in someone else's codebase: understanding it, translating it and
   restructuring it into feature folders.
5. **Operations automation as a separate Python tool** ([ADR 0005](decisions/0005-python-ops-automation.md)).
   Cron scripts that only need the public Admin API don't belong inside the shop server. The backend stays the
   authority on the rules.
6. **Caddy as the reverse proxy** ([ADR 0006](decisions/0006-caddy-as-reverse-proxy.md)). It terminates HTTPS
   with automatic Let's Encrypt certificates and routes the shop and API domains, so only ports 80/443 are open.
   Nginx would work the same way, but it needs certbot and more config.

## Hard problems

From [lessons-learned.md](lessons-learned.md):

- **Webhooks are not request/response.** Mollie can call late, twice, or never. The backend re-fetches the payment
  by id (it never trusts the body), e2e tests send duplicates, and the confirmation page falls back to an
  active status check.
- **A rule in the UI is not a rule.** A code review found that a payment *without* a named method let Mollie's own
  page offer in3, which bypassed the eligibility check. The interceptor now covers that path too.
- **Parsers meet input you didn't expect.** A Dutch decimal comma ("549,00") would shift CSV columns. The backend
  parser now rejects it, and the Python `feed` command converts it properly before it gets there.
- **Demo defaults can hurt production.** The supplier sync first defaulted to the sample feed, which would have
  overwritten real stock every night. Now production only syncs a feed that is explicitly configured.

## The Python automation in one minute

- **`laptopic-ops feed`** reads the supplier's export (file or URL; semicolons, Dutch decimals, prices excl. VAT).
  - Validates every row and adds 21% VAT with `Decimal`, rounding half-up to integer cents.
  - Writes the backend's import file atomically and lists rejected rows with the supplier's line numbers.
  - Proof it fits: the example export becomes the backend's own `sample.csv` byte for byte, and the backend
    parser accepts it.
- **`laptopic-ops report`** logs in to the Admin API (bearer token) and pages through recent orders and all
  variants.
  - Reports revenue, the iDEAL vs in3 split (from Mollie's metadata), payments stuck in `PaymentAuthorized` and
    low saleable stock.
  - Outputs Markdown or CSV.
  - Exit code 1 means "a person should look", which is useful for cron alerts.
- **Quality:** 67 tests, mypy strict and ruff, with pure logic kept apart from I/O. CI also runs the report
  against a real seeded server.

## How it was built

The project was developed with an AI coding agent (Claude Code), steered by a written engineering standard
([`CLAUDE.md`](../CLAUDE.md)). The work was checked through architecture, code and security reviews, decision
records and CI. Being able to judge, correct and test AI-generated code is part of what this project
demonstrates.

## What's left

- **Hosting a public demo.** The production stack and guide are ready ([deployment.md](deployment.md)); the host
  isn't chosen yet.
- **A live in3 payment in Mollie test mode.** The cloud environment couldn't reach Mollie; the flow is covered by
  mocked e2e tests.
- **Real invoices (numbering, PDF), and rate limiting on public forms.**

