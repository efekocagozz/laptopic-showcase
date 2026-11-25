# Implementation plan

Plan for building laptopic from `PROJECT.md`. Follows the standards in `CLAUDE.md`.
This is a living document: update it when a decision changes, and tick off milestones as they land.

_Last checked against package registries and docs: 2026-10-27._

## 1. Verified facts (resolve before building)

| Question | Finding | Consequence |
|---|---|---|
| Current Vendure version | `@vendure/core` **3.8.1** | Scaffold with `@vendure/create@3.8.1`. |
| Which Mollie plugin? | `@vendure/payments-plugin` is frozen at 3.5.6 and removed from Vendure 3.6+. Mollie now lives in **`@vendure-community/mollie-plugin` 1.0.1** (peer: `@vendure/core ^3.6`, `@mollie/api-client 4.x`). | Use the community package. `PROJECT.md`'s package name is outdated. |
| Orders API or Payments API? | The plugin README still says "Orders API", but the **code calls `payments.create` with order `lines`, `billingAddress` and `captureMode`**. Mollie deprecated the Orders API and says all methods (including pay-later) are available on the Payments API since April 2025. | The plugin is on the API Mollie recommends. The README is stale — trust the code. |
| Does it support in3? | Not named anywhere, but nothing blocks it: it sends order lines and billing address (what pay-later methods need), passes any `molliePaymentMethodCode` (e.g. `in3`), and exposes `molliePaymentMethods` with each method's **`minimumAmount` / `maximumAmount`**. Refunds go through `paymentRefunds.create` with an amount, so partial refunds are supported. | **Likely yes — must prove it** in Milestone 3 with a real test-mode payment before writing any custom handler. |
| Next.js | `next` **16.4.x**. Vendure ships an official Next.js storefront starter (Tailwind). | See decision D3. |

Still unverified (needs a Mollie test key): whether in3 is enabled on the test account, and its exact min/max.

## 2. Architecture

```
 Browser
   │  Dutch storefront (Next.js App Router, server components + server actions)
   ▼
 storefront/  ── lib/vendure/ (one data-access module: GraphQL client + typed queries)
   │  Shop API (GraphQL, session token in httpOnly cookie)
   ▼
 backend/ (Vendure server)                       ┌──────────────┐
   ├─ core: catalog, orders, customers, taxes    │   Mollie     │
   ├─ MolliePlugin (community) ── payments ─────►│ (test mode)  │
   │     ▲ webhook /payments/mollie/... ◄────────┤ iDEAL, in3   │
   ├─ In3Plugin (ours): eligibility + "3 x €X"   └──────────────┘
   ├─ EmailPlugin: Dutch order emails
   └─ (stretch) SupplierSyncPlugin: scheduled import
   │
   ▼
 PostgreSQL (docker-compose)          Vendure worker (job queue: emails, sync)
```

**Where logic lives:** money, in3 eligibility, order state and refunds are decided in the backend.
The storefront renders what the API returns and never talks to Mollie or Postgres directly.

## 3. Decisions

All confirmed by the developer on 2026-10-27 (D3 changed to forking the starter).

- **D1. Repo layout:** `backend/` and `storefront/` as two independent npm projects plus a root
  `docker-compose.yml`. *Why:* simplest to understand; no monorepo tooling to learn. *Trade-off:* two `npm install`s,
  CI runs two jobs. Revisit only if shared code appears.
- **D2. Backend scaffold:** generate with `npx @vendure/create backend` (Postgres), then trim what we don't need.
  *Why:* the official generator wires config, migrations, worker and Dashboard correctly.
- **D3. Storefront:** **fork the official Next.js starter** (`vendurehq/nextjs-starter-vendure`) and restyle it.
  *Decided by the developer.* Cart, checkout and session handling come working out of the box; the work shifts to
  understanding the starter's code, translating it to Dutch, restyling it and adding in3. *Trade-off:* less of the
  code is written by us, so reading and explaining the starter's structure is part of Milestone 2.
- **D4. Styling:** Tailwind CSS with design tokens (colours, type scale, spacing) in one place. No component library
  beyond a few hand-built primitives. Dark mode not required for a shop; mobile-first is.
- **D5. Typed GraphQL:** GraphQL Code Generator for both the storefront and our plugins, so queries are type-checked.
- **D6. Money:** integer cents everywhere (Vendure's convention); format with `Intl.NumberFormat('nl-NL', { currency: 'EUR' })`
  only at display time.
- **D7. Tests:** Vitest (unit), `@vendure/testing` (backend e2e, Mollie mocked with `nock`, which the plugin's own
  tests also use), Playwright (one storefront checkout happy path). GitHub Actions with a Postgres service.
- **D8. Webhooks in development:** Mollie can't reach `localhost`. Use a tunnel (e.g. `cloudflared`) when testing
  live webhooks, and the plugin's `syncMolliePaymentStatus` mutation as a fallback. Automated tests mock Mollie.
- **D9. Demo niche:** refurbished business laptops (ThinkPad, Latitude, EliteBook), demo data only.
- **D10. Hosting:** decide at Milestone 7. Railway or Fly.io are the likely candidates.

## 4. Milestones

Each milestone ends with: tests/lint/typecheck/build green, `/simplify` + `/code-review` (plus `/security-review`
where marked), README/docs updated, one commit (or a few small ones) pushed. **Learning** lists what you should
understand by the end — I'll explain these as we go, and flag easy parts for you to try yourself.

### M1 — Scaffold (backend + database) ✅ done
- `docker-compose.yml` with Postgres 16 and a named volume; `.env.example`; `.gitignore` (incl. `.env`).
- Vendure server + worker + Dashboard from `@vendure/create`; config reads everything from env; migrations enabled
  (no `synchronize` outside first local run).
- Channel set up for NL: default language `nl`, currency EUR, tax zone Netherlands with **21%** standard rate,
  prices entered **including VAT**, shipping method (e.g. PostNL flat rate).
- Seed script: ~20 refurbished laptops with facets (brand, CPU, screen size, condition grade) and variants
  (RAM / SSD), Dutch names and descriptions, placeholder images.
- Fix `README.md` encoding (currently UTF-16) and write setup instructions.
- **Done when:** `npm run db:up && npm run seed && npm run dev` gives a working Dashboard with the seeded catalogue, and a
  Shop API query returns products with EUR prices incl. VAT.
- **Learning:** Vendure's server vs worker, channels/zones/tax, how config + plugins compose, migrations.
- **Result:** 20 laptops + 3 accessories (40 variants), 5 collections, facets Merk / Schermgrootte / Processor /
  Conditie, SVG placeholder images. `npm test` validates the CSV. The dummy "Testbetaling" payment method is
  dev-only. Not done: backend e2e test setup (moved to M3, where the payment flow needs it).

### M2 — Storefront (browse, cart, checkout skeleton) ✅ done
- Fork `vendurehq/nextjs-starter-vendure` into `storefront/` (keep its licence and a note of the upstream commit).
  Walk through its structure first: routing, data fetching, session handling, cart and checkout.
- Point it at our backend, Dutch locale (`nl`), EUR formatting, and remove features we don't need.
- Restyle with our own design tokens (D4) so it doesn't look like the template.
- Dutch routes and copy where the starter's routing allows it (`/winkelwagen`, `/afrekenen`, …) — decide after
  reading how it structures routes.
- Check that form input is validated at the server-action boundary; add it where the starter doesn't.
- Prices shown incl. 21% VAT; accessible forms; responsive from 360px up; Lighthouse sanity check.
- **Done when:** a customer can browse, add variants to the cart and complete addresses/shipping on a phone-sized screen.
- **Learning:** reading an unfamiliar codebase, server vs client components, server actions, the data-access module, sessions in Vendure.
- **Result:** forked at `7d06ae0`; Dutch default (no URL prefix) + English under `/en`; EUR only; own palette,
  fonts, logo and in3 hero; Playwright guest-checkout test passes on desktop and mobile. URL paths stay English
  (decision in `storefront/README.md`).
- **Skills:** frontend design pass, `/security-review` (cookies, session handling).

### M3 — Mollie integration (iDEAL end to end, prove in3) ✅ done (live in3 check pending)
- Set up backend e2e testing with `@vendure/testing`.
- Install `@vendure-community/mollie-plugin` + `@mollie/api-client`; create the payment method in the Dashboard
  with the **test** key from env (documented in README, never committed).
- Checkout payment step: `createMolliePaymentIntent` → redirect to Mollie → back to `/bestelling/[code]`;
  confirmation page handles "still pending" by polling, then `syncMolliePaymentStatus` as fallback.
- **in3 spike (time-boxed):** list methods via `molliePaymentMethods` with an order in range; pay with
  `molliePaymentMethodCode: "in3"` in test mode; refund fully and partially from the Dashboard. Write the result in
  `docs/decisions/0001-mollie-in3.md`. Only if this fails: design a custom `PaymentMethodHandler` (separate plan).
- e2e tests with mocked Mollie: payment intent creation, webhook → `PaymentSettled`, failed/cancelled payment,
  duplicate webhook is idempotent.
- **Done when:** a test-mode iDEAL order reaches `PaymentSettled` via the webhook, and the in3 spike has a written answer.
- **Result:** plugin integrated; 7 e2e tests with mocked Mollie pass; storefront lists Mollie methods, redirects to
  Mollie, and handles late webhooks on the confirmation page. The in3 spike is answered from the plugin's code in
  `docs/decisions/0001-...`; a live test-mode payment couldn't run because the cloud environment blocks
  `api.mollie.com` — the decision record lists the four steps to confirm it locally.
- **Learning:** the Vendure payment flow and order state machine, webhooks and why we re-fetch from Mollie.
- **Skills:** `/security-review` (webhook, redirect URLs, keys).

### M4 — in3 flow ✅ done
- `In3Plugin` (ours, small): an `In3EligibilityService` that takes an amount in cents and returns
  `{ eligible, installmentAmount }` using the **min/max from Mollie's method list** (cached briefly), with a
  configurable shop-side cap (e.g. €50–€3,000) and NL/EUR checks. Exposed as fields on `ProductVariant` and `Order`
  in the Shop API so the storefront never re-implements the rule.
- Storefront: "of in 3 termijnen van €X, 0% rente" on product and cart pages; in3 option in checkout only when eligible.
- Display rounding: Mollie decides the real split; show the amount rounded up to the cent and phrase it as an indication.
- **No surcharge** anywhere for in3 (legal requirement) — covered by a test.
- Refunds/partial refunds via the Dashboard using the plugin handler; tests for both.
- Unit tests for eligibility edge cases (exact min/max, below/above, non-EUR, non-NL billing address);
  e2e test for the order-level field.
- **Done when:** in3 appears exactly when allowed, a test-mode in3 order completes, and refunds work.
- **Learning:** writing a Vendure plugin, NestJS dependency injection, extending the GraphQL schema, field resolvers.
- **Result:** `In3Plugin` with `in3Quote` on variants and orders and server-side refusal of ineligible in3
  payments (decision 0002). 6 unit + 6 e2e tests on the backend, 3 Playwright tests on the storefront.
  Refunds use the Mollie handler's refund (tested in M3), so no in3-specific refund code was needed.

### M5 — Orders and operations ✅ done
- Dutch order-confirmation and shipping emails via Vendure's `EmailPlugin` (dev mailbox locally).
- Invoice basics in the confirmation email: company details placeholders (KVK, BTW-nummer), VAT breakdown
  per rate. PDF invoices are a stretch goal.
- Info pages: 14-day withdrawal right (herroepingsrecht) with model form, delivery times, 2-year guarantee, returns.
- Simple return flow: customer submits a return request for an order (form → stored as an order note + email to the
  shop); admin uses Vendure's built-in cancel/refund. No custom returns entity unless this proves insufficient.
- **Done when:** a completed order sends correct Dutch emails and a return request reaches the admin.
- **Learning:** the EventBus and job queue (why emails run on the worker), Vendure order history.
- **Result:** Dutch emails (confirmation/invoice with VAT per rate, shipped with tracking, return confirmation);
  `ReturnsPlugin` with `requestReturn`; storefront `/returns` form and `/info/*` pages (shipping, returns, withdrawal
  right with model form, warranty, terms). Online returns are accepted up to 30 days after ordering because delivery
  dates aren't recorded. PDF invoices not done (stretch).

### M6 — Supplier sync (stretch) ✅ done
- `SupplierSyncPlugin`: a Vendure scheduled task that reads a supplier CSV (sample file in repo), validates rows,
  and updates stock and prices by SKU through Vendure services on the worker. Report of changed/skipped rows.
- Tests: parsing and validation (unit), import result (e2e).
- **Learning:** scheduled tasks, idempotent imports, validating external data.
- **Result:** `SupplierSyncPlugin` with a nightly scheduled task (also runnable from the Dashboard). Guards: wrong
  column count, duplicate SKUs, invalid stock/price, price changes over 50%. 6 unit tests + 3 e2e tests; verified on
  the dev server via `runScheduledTask`.

### M7 — Quality and deployment ✅ done (except hosting)
- GitHub Actions: lint, typecheck, unit + e2e tests (Postgres service), storefront build, Playwright happy path.
- Dockerfiles for backend (server + worker) and storefront; production compose file.
- Pick hosting (D10) and deploy a demo with Mollie still in test mode.
- **Skills:** full `/security-review` and `/architecture-review` of the whole repo.
- **Result:** CI workflow (backend unit/e2e/build; storefront lint/types/tests/build/Playwright against a seeded
  backend). Dockerfiles verified by building and running both images. Security review: no high-confidence
  vulnerabilities; hardening applied (GraphiQL dev-only). Code review: 10 findings, 8 fixed (incl. sample feed in
  production, in3 via Mollie's own picker), 1 disproven by running the image, 1 documented (rate limiting).
  Architecture review findings left for the developer (see `docs/lessons-learned.md`). Hosting not chosen yet.

### M8 — Portfolio polish ✅ done
- README with screenshots, architecture diagram, how to run, and test instructions.
- Decision log in `docs/decisions/` (why Vendure over Medusa, Mollie plugin vs custom handler, own storefront,
  how in3 refunds work).
- Short write-up of problems and lessons learned.

### M9 — Operations automation in Python ✅ done
- `automation/` (`laptopic-ops`): `feed` turns a supplier's own export (semicolons, Dutch decimal commas, prices
  excl. VAT) into the `sku,stock,price` file the supplier sync imports; `report` builds a daily report from the
  Admin API (orders, revenue, iDEAL vs in3, unsettled payments, low stock). Decision: [ADR 0005](decisions/0005-python-ops-automation.md).
- **Result:** 67 pytest tests, ruff and mypy strict in a separate CI job. The example export converts to exactly
  `backend/supplier-feed/sample.csv`, and the backend's `parseSupplierFeed` accepts the output with no errors.
  The report was verified against a live seeded server, and CI runs it against the seeded backend in the
  storefront job.

## 5. Risks

| Risk | Mitigation |
|---|---|
| in3 not available in test mode or not working through the plugin | Spike first in M3; fallback is a custom handler, planned separately. |
| Community Mollie plugin is young (1.0.x) | Pin the version; e2e tests around the payment flow catch upgrade breakage. |
| Webhooks unreachable during local development | Tunnel + `syncMolliePaymentStatus`; tests mock Mollie. |
| Scope creep (it's a big plan for one person) | M6 is optional; each milestone is shippable on its own. |

## 6. Needed from you

- ~~A Mollie test API key~~ received. It goes in your local `backend/.env` (never in the repo).
- For cloud sessions: allow `api.mollie.com` in the environment's network settings before M3.
