# 0002 — in3 eligibility is decided by a backend plugin

- **Status:** accepted
- **Date:** 2026-10-27

## Context

Customers should see "3 × € X met in3" on product and cart pages, and in3 should only be offered when it can
actually be used: order total within the allowed range, euros, and a Dutch address. `CLAUDE.md` requires
business rules to live in the backend and the amount range to be enforced server-side.

## Decision

A small Vendure plugin, `backend/src/plugins/in3/`:

- `in3-quote.ts` — the rules as a pure function (`quoteIn3`), unit tested on its edges (exact min/max, one cent
  outside, rounding, currency, country).
- `In3EligibilityService` — applies the rules to a `ProductVariant` (price incl. VAT) or an `Order` (total incl.
  shipping and VAT, billing or shipping country).
- Shop API fields `ProductVariant.in3Quote` and `Order.in3Quote` — the storefront displays these and never
  recalculates them.
- `In3PaymentInterceptor` — refuses `createMolliePaymentIntent` for an ineligible order when the payment could
  become in3 (in3 named, or no method named), before anything is sent to Mollie.

The range defaults to in3's usual € 50 – 3,000 and can be narrowed with `In3Plugin.init({ minAmount, maxAmount })`.

## Alternatives considered

- **Compute "3 × € X" in the storefront.** Rejected: duplicates a business rule in two places.
- **Read the range from Mollie's method list (and cache it).** Mollie's own min/max already applies at checkout
  (the storefront only lists methods Mollie returns, and Mollie rejects out-of-range payments). Fetching it for
  every product page adds an API dependency and caching for little gain. The shop's configured range is used for
  display and enforcement; set it to match the Mollie profile.
- **Change the Mollie plugin or wrap its resolver.** The interceptor checks the one mutation on the way in
  without forking the plugin. It uses Vendure's `internal_getRequestContext()` to get the request context, which
  Vendure marks as internal; if a future Vendure version changes it, the e2e test `test/in3.e2e-spec.ts` fails.

## Mollie's own method picker

If a payment names no Mollie method, Mollie shows its own picker, which may include in3. The interceptor therefore
also checks payments *without* a method: for an order that is not in3-eligible it refuses them, so the customer has
to name a method (e.g. iDEAL). Found in the code review; covered by `test/in3.e2e-spec.ts`. At payment time an order
without an address country is not eligible (`requireCountry`), while product and cart pages don't need it yet.

## Consequences

- The installment amount is an indication (rounded up to whole cents); in3 decides the exact split.
- No payment surcharge is ever added for in3: the plugin only reads totals, it never changes them.
