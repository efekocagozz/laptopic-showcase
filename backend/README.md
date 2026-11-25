# laptopic backend

Vendure 3.8 server, worker and Dashboard for the laptopic shop. Generated with
[`@vendure/create`](https://docs.vendure.io/) and adapted for a Dutch store (EUR, 21% BTW, prices incl. VAT).

## Getting started

Requires Node 24 / npm 11 (see `/.nvmrc`) and Docker.

```bash
cp .env.example .env     # then set COOKIE_SECRET, SUPERADMIN_PASSWORD and DB_PASSWORD
npm ci
npm run db:up            # Postgres from ../docker-compose.yml, using the DB_* values in .env
npm run seed             # Dutch store setup + demo catalogue (refuses to run twice)
npm run dev              # server, worker and Dashboard
```

| URL | What |
|---|---|
| http://localhost:5173/dashboard | Dashboard in development (log in with `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD`). After `npm run build` it is also served at http://localhost:3000/dashboard |
| http://localhost:3000/shop-api | Shop API used by the storefront |
| http://localhost:3000/graphiql/shop | GraphiQL playground for the Shop API |
| http://localhost:3000/mailbox | Dev mailbox (emails are written to disk, not sent) |

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Server, worker and Dashboard in watch mode |
| `npm run db:up` / `db:down` | Start / stop Postgres |
| `npm run db:reset` | **Delete all data** and start an empty Postgres |
| `npm run seed` | Run migrations, then load the store setup and catalogue into an empty database |
| `npm run setup:mollie` | Create or update the Mollie payment method from `MOLLIE_API_KEY` (test keys only) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests: a real Vendure server on in-memory SQLite, Mollie mocked |
| `npm run typecheck` | TypeScript check without building |
| `npm run build` | Compile server, worker and Dashboard into `dist/` |

## Layout

- `src/vendure-config.ts` — all configuration; values come from `.env`.
- `src/index.ts` / `src/index-worker.ts` — start the server (runs pending migrations first) and the worker.
- `src/migrations/` — database migrations. Commit them.
- `src/plugins/` — our own Vendure plugins.
- `test/` — e2e tests (`*.e2e-spec.ts`) and `test-environment.ts`, which starts a test server with the seed data.
- `src/seed/` — demo data: `initial-data.ts` (country, VAT, shipping, collections), `products.csv`
  (Vendure's [import format](https://docs.vendure.io/guides/developer-guide/importing-data/)), placeholder
  images in `assets/`, and `catalogue.spec.ts`, which validates the CSV.
- `static/email/templates/` — Dutch email templates.

## Store setup

The seed sets the default channel to **EUR** with **prices including VAT**, Dutch content (`nl`), one country and
zone (Nederland), BTW rates 21% / 9% / 0%, and PostNL shipping at € 4,95. Prices in `products.csv` are in euros
including VAT; Vendure stores them as integer cents.

A **Testbetaling** payment method uses Vendure's dummy handler so checkout can be tested without Mollie. That
handler is only registered when `APP_ENV=dev`.

## Mollie

Payments go through [`@vendure-community/mollie-plugin`](https://docs.vendure.io/current/community-plugins/mollie-plugin)
(see [decision 0001](../docs/decisions/0001-mollie-plugin-for-ideal-and-in3.md)).

1. Put your Mollie **test** key in `.env` as `MOLLIE_API_KEY` and run `npm run setup:mollie`.
2. Mollie sends webhooks to `VENDURE_PUBLIC_URL`. Locally that has to be a public tunnel, e.g.
   `cloudflared tunnel --url http://localhost:3000`, then set `VENDURE_PUBLIC_URL` to the tunnel URL and restart.
   Without a tunnel, the storefront's confirmation page falls back to asking the backend to check Mollie
   (`syncMolliePaymentStatus`) after 10 seconds.
3. Use Mollie's test checkout to choose the outcome (paid, failed, cancelled).

## Emails

Customer emails are Dutch (`static/email/templates/`, handlers in `src/email/email-handlers.ts`):

| Email | When |
|---|---|
| Order confirmation | Order paid. VAT per rate, company details, withdrawal right with the model form, warranty, terms and privacy links. Not an invoice (see `docs/legal-compliance.md`) |
| Order shipped (`order-shipped`) | All items shipped; includes the tracking codes from the fulfillments |
| Return requested (`return-requested`) | Customer submitted a return request; BCC to the shop |
| Email verification, password reset, email change | Account actions |

Company details are placeholders in `src/email/company.ts`. In development, emails are written to disk and shown at
http://localhost:3000/mailbox.

## Returns

`src/plugins/returns/` adds the Shop API mutation `requestReturn` (order code + email address + reason). It records
a private note on the order and sends the confirmation email. Staff handle the return and refund in the Dashboard
with Vendure's built-in cancel/refund (refunds go back through Mollie).

## Supplier sync

`src/plugins/supplier-sync/` imports stock and prices from a supplier CSV every night at 03:00 (a Vendure scheduled
task on the worker). Start it manually from the Dashboard's scheduled tasks page, or with the Admin API mutation
`runScheduledTask(id: "supplier-sync")`.

```csv
sku,stock,price
TP-T14G3-16-256,8,549.00
```

- Prices are euros incl. VAT with a dot as decimal separator. Rows with a different number of columns than the
  header (e.g. `549,00`) are rejected instead of being misread.
- Only existing variants are updated; unknown SKUs are reported, never created.
- Price changes over 50% are skipped and reported as suspicious (stock is still updated).
- The feed path is `SUPPLIER_FEED_PATH`. In development it defaults to `supplier-feed/sample.csv`; elsewhere the
  task is off until a feed is configured.

## Migrations

Changing custom fields or adding entities needs a migration:

```bash
npx vendure migrate     # choose "Generate a new migration"
```

Pending migrations run automatically when the server starts. `synchronize` stays `false`.

## Production notes

See [docs/deployment.md](../docs/deployment.md) for the full setup.

- Never deploy with `APP_ENV=dev`: it allows any CORS origin, exposes the unauthenticated dev mailbox and enables
  the dummy payment handler. Set `APP_ENV=production` and `NODE_ENV=production`.
- Set `CORS_ORIGINS` to the storefront's origin and `ASSET_URL_PREFIX` to the public assets URL.
- Vendure refuses to start in production with the default superadmin password. The password is only used when the
  superadmin is first created; change it later in the Dashboard.
- An email transport (SMTP etc.) must be configured before going live; until then emails are written to disk.
- Deployment (Dockerfile, hosting) is planned for Milestone 7.
