# Project Brief: Dutch Webshop with in3 Installments (Vendure + Next.js)

## Goal
Build a custom e-commerce shop for the Dutch market where customers can pay in 3 installments with **in3** (via Mollie). The project doubles as a **developer portfolio piece** (student in IT), so code quality, tests, docs and a clear architecture matter. Launching a real store is optional and a later step.

## Decisions already made
- **Backend:** Vendure (Node/TypeScript, NestJS, GraphQL), self-hosted, free. Core is GPLv3, which is fine for running our own shop.
- **Database:** PostgreSQL (Docker).
- **Storefront:** Next.js + TypeScript, consuming Vendure's GraphQL Shop API.
- **Payments:** Mollie in **test mode**, with iDEAL and in3. Use Vendure's Mollie payments plugin.
- **Not using:** Shopify (extra 2% third-party payment fee on Mollie/in3 sales), WooCommerce (we chose a custom stack for portfolio value).
- **Hosting later:** small VPS or Railway/Fly.io (~EUR 5-15/month).

## Business context (for realistic product/demo choices)
- Market: Netherlands, currency EUR, Dutch-language storefront (English admin is fine).
- Original idea was dropshipping laptops. Findings:
  - New laptops have thin margins (~3-10%). Rough example: EUR 800 incl. VAT sale gives ~EUR 27 profit after an assumed ~3% in3 fee (in3 rates are NOT public, so this is an assumption).
  - Refurbished laptops or a niche (e.g. home-office furniture) have better margins (15-30%+).
  - A return can cost more than the profit of several sales (supplier restocking fee, return shipping, unrecovered payment fees).
- For the portfolio build, use a realistic catalogue (e.g. refurbished business laptops: ThinkPad, Latitude, EliteBook) with demo data only.

## in3 facts to respect in the implementation
- Customer pays in 3 equal installments, interest-free, over 60 days. First part at checkout via iDEAL, then at ~30 and ~60 days.
- Order range is typically EUR 50-3,000 (merchant can set min/max).
- in3 does a soft credit check; merchant gets paid regardless of customer repayment.
- Merchant may NOT pass in3 fees on to customers (banned since 30 June 2023): no payment surcharge in checkout.
- Netherlands only, EUR only.
- Approval by in3 is required for real use (not needed for test mode). Verify in3 availability in Mollie test mode.

## Milestones
1. **Scaffold:** Vendure server + admin, Postgres via docker-compose, `.env` handling, seed script with ~20 demo products (laptops with specs/variants).
2. **Storefront:** Next.js app with product list, product detail, cart, checkout, order confirmation. Dutch copy. Price shown incl. 21% VAT.
3. **Mollie integration:** configure the Mollie plugin in test mode, iDEAL working end to end. **First, check whether the plugin supports in3** (including order lines, refunds and min/max amount handling). If it does not, write a custom payment handler.
4. **in3 flow:** show in3 only within the allowed amount range, display "3 x EUR X" on product and cart pages, handle webhooks and payment status updates, handle refunds and partial refunds.
5. **Order & ops:** order confirmation emails, Dutch invoice basics (KVK, BTW number, 21% VAT breakdown), 14-day withdrawal info, return flow.
6. **Supplier sync (stretch):** scheduled job that imports stock and prices from a supplier CSV/API feed.
7. **Quality:** tests for checkout, payment webhooks and order state transitions; GitHub Actions CI; Dockerised deployment.
8. **Portfolio polish:** README, architecture diagram, screenshots, short write-up of decisions and problems (e.g. why Vendure over Medusa, how in3 refunds are handled).

## Suggested repo layout
```
/
  docker-compose.yml
  PROJECT.md
  README.md
  backend/      # Vendure server, plugins, seed scripts
  storefront/   # Next.js app
  docs/         # architecture diagram, decision log
```

## Open questions to resolve early
- Does the official Vendure Mollie plugin cover in3 in current docs? (check before building anything custom)
- Which product niche for demo data (refurbished laptops vs. something with better margins)?
- Which hosting target for the live demo?

## Legal/real-launch checklist (only if going live)
- KVK registration and BTW (VAT) number.
- Dutch/EU consumer law: 14-day withdrawal right, clear delivery times, 2-year legal guarantee on goods, clear returns policy.
- Trust signals: Thuiswinkel Waarborg, Trustpilot/Kiyoh, real company details.
- Apply for in3 through the PSP (Mollie); expect a review of the shop and product range.
- Choose suppliers with EU shipping, a return process and warranty backing.

## Working style for Claude Code
- Keep changes small and tested; commit per milestone.
- Prefer official plugins and documented APIs over custom code; verify current docs before relying on plugin features.
- Never commit secrets; use `.env.example`.
- Use Mollie test keys only.
