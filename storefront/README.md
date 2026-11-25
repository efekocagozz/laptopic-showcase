# laptopic storefront

Dutch Next.js 16 storefront for laptopic. Forked from Vendure's official
[nextjs-starter-vendure](https://github.com/vendurehq/nextjs-starter-vendure) at commit `7d06ae0`
(recorded in `.vendure/storefront.json`, MIT licence in `LICENSE`).

## Getting started

Start the backend first (see `../backend/README.md`), then:

```bash
cp .env.example .env.local   # set REVALIDATION_SECRET
npm ci
npm run dev                  # http://localhost:3001
```

| Script | What it does |
|---|---|
| `npm run dev` | Development server on port 3001 |
| `npm run build` / `npm start` | Production build (needs the backend running) |
| `npm test` | Architecture and translation tests (Node test runner) |
| `npm run test:e2e` | Playwright checkout test against a running storefront + backend |
| `npm run lint` / `npm run check-types` | ESLint / TypeScript |

## How it is organised

The starter's structure is kept (see [docs/architecture.md](docs/architecture.md)):

```text
src/
  app/          Next.js routing only — thin files that delegate to features
  features/     Vertical slices: products, cart, checkout, account, ... each with its own
                GraphQL operations (graphql.ts), server actions (actions.ts), components and messages
  platform/     Shared mechanics: Vendure API client (vendure/api.ts), i18n, cache revalidation
  site/         Laptopic-specific composition: navbar, footer, homepage, logo
  components/ui Generic design primitives (shadcn/ui)
```

Rules enforced by ESLint and `tests/architecture`: features never import from `site/`, and features only use
each other's top-level files.

## What we changed from the starter

- **Language:** Dutch (`nl`) is the default and is served without a URL prefix; English lives under `/en`.
  German was removed. Translations live next to each feature in `messages/nl.json` and `messages/en.json`.
- **URL paths stay English** (`/cart`, `/checkout`, `/product/...`). Localised paths (`/winkelwagen`) would need
  next-intl `pathnames` and changes to every link; we chose to keep the starter's routing so upstream updates stay
  easy to adopt. Page titles and all visible text are Dutch.
- **EUR only:** the currency picker hides itself for single-currency channels; prices default to EUR.
- **Design:** own colour palette (deep green + amber for in3) in `src/app/[locale]/globals.css`, Inter and
  Plus Jakarta Sans fonts, Laptopic logo (`src/site/brand/logo.tsx`), new homepage hero with an in3 explainer,
  customer-service links in the footer.
- **Product page:** the first in-stock variant is preselected so a price is always visible.
- **Accessibility:** labels on the cart's icon-only buttons; the language picker collapses to an icon on phones.
- **Legal (see `docs/legal-compliance.md`):** order button "Bestellen en betalen", terms/privacy/withdrawal links right
  above it, company details in the footer (`src/config/company.ts`), product condition on product pages, legal
  and service pages in `src/features/info/pages.ts`, login cookie `httpOnly` + `secure` in production.
- **Production:** security headers (HSTS, nosniff, frame denial, referrer and permissions policy), no
  `X-Powered-By`, images only from `ASSET_HOSTNAME` (private addresses only for local builds), `public/robots.txt`.
- **GraphQL types** (`src/graphql-env.d.ts`) are generated from our own backend:
  `npx gql.tada generate output` while the backend runs.

## Upstream updates

The starter ships tooling to adopt new upstream releases (`npm run upgrade:*`, `.upgrades/`,
[docs/upgrades.md](docs/upgrades.md)). Our changes are deliberate deviations; keep this list up to date so
they can be carried forward.
