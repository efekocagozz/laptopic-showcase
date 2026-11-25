# 0004 — Fork the official Next.js starter

- **Status:** accepted
- **Date:** 2026-10-27

## Context

The storefront needs product listing, search with filters, a cart, a multi-step checkout, accounts and order
history. Building all of that from scratch is weeks of work before the interesting part (in3) can start.

## Decision

Fork `vendurehq/nextjs-starter-vendure` (commit `7d06ae0`, MIT) into `storefront/` and make it ours:
Dutch as the default language, EUR only, our own design, and new features (Mollie payment step, in3 display,
returns, customer-service pages).

We keep the starter's architecture (thin `app/` routes, vertical feature folders, ESLint-enforced boundaries) and
its URL paths, so upstream releases can still be adopted with its upgrade tooling (`npm run upgrade:*`).

## Alternatives considered

- **Build our own storefront.** More of the code would be written by us, but much of it would be the same cart
  and checkout plumbing the starter already does well.

## Consequences

- Part of the learning is reading and understanding someone else's codebase.
- Paths stay English (`/cart`, `/checkout`); all visible text is Dutch. Localised paths would need next-intl
  `pathnames` and changes to every link.
- Our deviations are listed in `storefront/README.md` so they can be carried forward on upgrades.
