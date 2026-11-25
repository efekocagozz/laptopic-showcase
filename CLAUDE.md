# CLAUDE.md

Engineering standards for **laptopic**, a Dutch webshop with in3 installments via Mollie.
Read `PROJECT.md` for the product brief, milestones and in3 rules.

## Project status and stack

All milestones in `docs/implementation-plan.md` are built (hosting aside). `backend/` is a Vendure 3.8 project
(Postgres, Dashboard, our plugins, seed data); `storefront/` is a fork of Vendure's official Next.js starter,
translated to Dutch and restyled. Architecture: `docs/architecture.md`; decisions: `docs/decisions/`. Progress and decisions live in `docs/implementation-plan.md`. The code's actual conventions win
over anything here; update this file when they change.

- **Backend (`backend/`)**: Vendure (TypeScript, NestJS, GraphQL, TypeORM), PostgreSQL.
- **Storefront (`storefront/`)**: Next.js (App Router) + TypeScript, consuming the Vendure Shop API.
- **Payments**: Mollie in test mode (iDEAL, in3) through the Vendure Mollie plugin
  (`@vendure-community/mollie-plugin`; the old `@vendure/payments-plugin` is removed in Vendure 3.6).
- **Infra**: root `docker-compose.yml` for local Postgres (via `npm run db:up`); `docker-compose.prod.yml` (Caddy HTTPS,
  storefront, server, worker, Postgres) + Dockerfiles for production, see `docs/deployment.md`; GitHub Actions CI in
  `.github/workflows/ci.yml`; Dependabot.
- **Automation (`automation/`)**: `laptopic-ops`, a Python 3.12 CLI run by cron: supplier export → import file,
  daily report from the Admin API (read-only). See `docs/decisions/0005-python-ops-automation.md`.
- **Docs (`docs/`)**: architecture diagram and decision log.

## Architecture

This is not a classic MVC app. Map the responsibilities onto the frameworks instead of adding layers:

| Concern | Backend (Vendure / NestJS) | Storefront (Next.js) |
|---|---|---|
| Request handling ("controller") | GraphQL resolvers, NestJS controllers (e.g. Mollie webhook) | Route handlers, server actions |
| Business logic | Injectable services inside a Vendure plugin | Feature modules in `src/features/*`; the backend owns real business rules |
| Data access | Vendure `TransactionalConnection` / TypeORM entities, used from services | Shop API GraphQL calls only, through `src/platform/vendure/api.ts`; operations live in each feature's `graphql.ts` |
| Presentation | GraphQL schema + DTO/input types | React components |

- **Resolvers, controllers, route handlers and server actions** parse and validate input, call a service,
  and return a response. They contain no business rules and no direct database queries.
- **Business logic lives in services.** Order, payment, in3 eligibility and refund rules belong in the backend,
  never only in the storefront. The storefront may display derived values (e.g. "3 x €X") but the backend decides.
- **Extend Vendure through plugins**, using its built-ins first: `PaymentMethodHandler`, `OrderProcess`,
  `EventBus`, `JobQueue`, custom fields, `EmailPlugin`. Write custom code only when the official plugin or API
  cannot do the job, and document why in `docs/`.
- **Entities vs DTOs:** TypeORM entities model persisted data; GraphQL input/output types and API payloads are DTOs.
  Do not return entities from storefront code or leak internal fields through the API.
- **Dependency direction:** storefront → Shop API → resolvers → services → data access. Services never import
  resolvers; the storefront never talks to Postgres or Mollie directly (Mollie redirects and webhooks go through Vendure).
- **Use NestJS dependency injection as the framework provides it.** Do not add Clean Architecture, CQRS,
  repositories over TypeORM, factories, or extra interfaces without a concrete, stated reason.
- Follow SOLID pragmatically. One implementation needs no interface.

## Our plugins

- `backend/src/plugins/in3/` — in3 eligibility (`in3Quote` on ProductVariant/Order) and refusing ineligible in3
  payments. Pure rules in `in3-quote.ts`; see `docs/decisions/0002-in3-eligibility-in-the-backend.md`.
- `backend/src/plugins/returns/` — `requestReturn` mutation: order note + `ReturnRequestedEvent`.
- `backend/src/plugins/supplier-sync/` — nightly CSV import of stock and prices (scheduled task); parser in
  `supplier-feed.ts`.
- `backend/src/config/production-environment.ts` — refuses to start in production with missing/weak settings.
  Add new required production settings there (with a test).
- `backend/src/email/` — email handlers (Dutch subjects, order shipped, return requested) and company details.
  Pass plain values to email templates for custom events: email jobs are serialized.

## Toolchain

Node 24 with npm 11 everywhere (`.nvmrc`, `engines` + `engine-strict`, CI, Dockerfiles): npm 10 and 11 write
different lockfiles. Install with `npm ci`; only run `npm install <pkg>` to change dependencies, and commit the
lockfile with it.

## Commands (backend)

Run from `backend/`: `npm run db:up`, `npm run seed` (empty DB only; `npm run db:reset` wipes it),
`npm run dev`, `npm test`, `npm run test:e2e`, `npm run typecheck`, `npm run build`, `npm run setup:mollie`. Scaffold plugins, entities and API extensions
with `npx vendure add`; generate migrations with `npx vendure migrate`. Never enable `synchronize`.

## Commands (storefront)

Run from `storefront/` with the backend running: `npm run dev` (port 3001), `npm test`, `npm run lint`,
`npm run check-types`, `npm run build`, `npm run test:e2e` (Playwright, needs a running storefront).
Regenerate `src/graphql-env.d.ts` after Shop API changes with `npx gql.tada generate output`.
Follow `storefront/docs/architecture.md`: thin `app/` files, features own their GraphQL, actions and messages,
features never import from `site/`.

## Commands (automation)

Run from `automation/` in a virtualenv (`pip install -e ".[dev]"`): `ruff check .`, `ruff format --check .`,
`mypy` (strict), `pytest`. Keep pure logic (`feed/normalise.py`, `money.py`, `report/build.py`) free of I/O;
money is integer cents via `Decimal`, never float. If the backend's supplier feed format changes, update
`feed/normalise.py` and the golden test in `tests/test_feed.py` with it.

## Naming and consistency

- TypeScript: `PascalCase` for classes, types, interfaces, enums and React components; `camelCase` for variables,
  functions, methods and properties; `UPPER_SNAKE_CASE` for true constants and env var names.
- Files: `kebab-case.ts` in the backend, following Vendure/NestJS suffixes (`*.service.ts`, `*.resolver.ts`,
  `*.entity.ts`, `*.plugin.ts`, `*.controller.ts`). Storefront follows the starter: Next.js file names
  (`page.tsx`, `layout.tsx`, `route.ts`) and `kebab-case.tsx` files exporting `PascalCase` components.
- GraphQL: `PascalCase` types, `camelCase` fields, verb-first mutations (`addItemToOrder`), matching Vendure's own API.
- Database: let Vendure/TypeORM name tables and columns; custom fields use `camelCase`.
- UI copy is **Dutch** (`messages/nl.json`, with `en.json` kept in sync); code, comments and admin stay in English.
  URL paths keep the starter's English segments (`/cart`, `/checkout`) — see `storefront/README.md` for why.
- **Domain terms — use these and only these:** `Order`, `OrderLine`, `ProductVariant`, `Customer`, `Payment`,
  `Refund`, `Fulfillment` (Vendure's names); `installment` (not "termijn"/"instalment" in code); `in3` (lower-case
  in identifiers: `in3Eligibility`); prices in **minor units (cents) as integers**, named `...WithTax` / `...` like Vendure.
- Avoid vague names (`Manager`, `Helper`, `Processor`, `Utils`) unless the responsibility is genuinely clear.
- Follow the existing folder structure (`backend/`, `storefront/`, `docs/`) unless there is a clear reason to change it.

## Code quality

- DRY, KISS, YAGNI — without sacrificing readability, correctness, security or maintainability.
- Small, cohesive functions and classes with one clear responsibility. No giant resolvers, god services,
  deeply nested conditionals, or duplicated business rules between backend and storefront.
- No unexplained magic numbers: name things like the in3 min/max order amount, VAT rate (21%), and
  installment count as constants or config.
- Money is always integer cents. Never use floating point for amounts; round only for display.
- Do not compress code just to reduce line count.
- No speculative features and no new dependencies without a reason.
- TypeScript `strict` mode; no `any` without a comment explaining why.
- Handle errors explicitly. Validate untrusted input at the boundary: GraphQL inputs, route handlers,
  server actions, and especially **Mollie webhooks** (never trust the webhook body — re-fetch the payment from Mollie
  by ID before changing order state).
- **Never hardcode secrets.** Use `.env` (gitignored) and keep `.env.example` up to date. Mollie **test keys only**.
- Respect the in3 rules in `PROJECT.md`: no payment surcharge, NL + EUR only, enforce the amount range server-side.

## Testing

- Add or update tests for meaningful business logic and edge cases — at minimum: checkout, in3 eligibility
  and amount range, payment webhooks, order state transitions, refunds and partial refunds.
- Backend unit tests use Vitest (`src/**/*.spec.ts`, `npm test`). Backend e2e tests use `@vendure/testing`
  (`test/**/*.e2e-spec.ts`, `npm run test:e2e`): start a server with `createLaptopicTestEnvironment()` from
  `test/test-environment.ts` and mock Mollie's API with `nock`; never call real external services in tests.
- After changes, run the relevant tests, lint, type check and build when available.
- Never claim tests passed unless they actually ran and passed. Report failures with their output.
- Fix regressions your changes cause.

## Development workflow

1. Inspect the relevant files and understand the existing architecture before changing anything.
2. For substantial changes, propose a brief implementation plan before editing.
3. Reuse existing components, services, plugins and conventions. Check current Vendure/Mollie docs before
   relying on a plugin feature.
4. Make focused changes; do not rewrite unrelated files.
5. Review the final diff for correctness, duplication, naming inconsistencies, security issues and unnecessary
   complexity (`/code-review`, `/simplify`, `/security-review`, `/architecture-review`).
6. Update documentation (`README.md`, `docs/`, this file) when architecture or setup changes.
7. Explain important architectural decisions and trade-offs; record lasting ones in `docs/`.
8. Keep changes small and commit per milestone.

## Learning and mentoring

The developer is an IT student who wants to understand the project rather than delegate all implementation to AI.

When conducting an audit (see `/architecture-review`):

- Explain the relevant architecture in plain language before presenting complex findings.
- For each significant finding, explain what the code currently does, why it is problematic (if it is),
  and which architectural principle applies.
- Include a small, concrete example when it helps clarify the issue.
- Distinguish genuine architectural defects from optional improvements and personal preferences.
- Explain unfamiliar concepts when they are relevant — e.g. Vendure plugins, NestJS dependency injection,
  `TransactionalConnection`, GraphQL resolvers, Next.js server actions, data-access modules.
- Do not rewrite code or implement fixes during the audit.
- After the findings, identify the three most valuable concepts for the developer to learn, ordered by importance.

When asked to fix an issue:

- Explain the proposed change and its trade-offs before implementing it. Make focused changes only after approval.
- Encourage the developer to attempt straightforward fixes independently, then review their solution.

The objective is to improve both the codebase and the developer's ability to reason about its architecture independently.

## Non-negotiable rule

Prefer the simplest implementation that is maintainable, testable, consistent and appropriate for this
project's scale. Do not sacrifice sound architecture merely to minimize code or lines of code.
Do not impose a new architecture until you have inspected the existing project and explained why a change is justified.
