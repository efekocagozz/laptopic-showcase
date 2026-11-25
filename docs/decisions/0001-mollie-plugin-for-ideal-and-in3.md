# 0001 — Use the community Mollie plugin for iDEAL and in3

- **Status:** accepted (in3 still to be confirmed with a live test-mode payment, see below)
- **Date:** 2026-10-27

## Context

The shop must accept iDEAL and in3 (pay in 3 installments) through Mollie, in test mode. `PROJECT.md` asks us to
check first whether the official Vendure Mollie plugin supports in3 before writing a custom payment handler.

Vendure 3.6 removed `@vendure/payments-plugin`; Mollie now lives in `@vendure-community/mollie-plugin` (1.0.1).

## What we found

The plugin's README says it uses Mollie's Orders API, but its code (1.0.1) uses the **Payments API**, which Mollie
recommends since deprecating the Orders API, and on which all methods — including pay-later ones — are available
since April 2025. For each payment it sends:

- the order **lines** and **billing address** (what pay-later methods such as in3 need),
- any `molliePaymentMethodCode` we pass, so we can preselect `in3` or `ideal`,
- a webhook URL; on a webhook it **re-fetches the payment from Mollie by ID** before changing the order, so the
  webhook body is never trusted.

It exposes `molliePaymentMethods` (each method with Mollie's `minimumAmount` / `maximumAmount` for the order) and
supports **full and partial refunds** through `paymentRefunds.create` with an amount.

## Decision

Use `@vendure-community/mollie-plugin` as-is. Do not write a custom `PaymentMethodHandler`.

- The payment method is created from `.env` by `npm run setup:mollie` (or by `npm run seed`), and only accepts
  keys starting with `test_`.
- The storefront lists Mollie's methods as separate options (iDEAL, in3, ...) and preselects the chosen one on
  Mollie's hosted checkout. If Mollie's method list can't be loaded, it falls back to one "via Mollie" option.
- `test/mollie-payment.e2e-spec.ts` covers payment creation, webhook, duplicate webhook, failed payment, unknown
  payment method, and partial + full refunds, with Mollie's API mocked.

## Gotchas found while integrating

- When the storefront passes its own `redirectUrl`, the plugin does **not** append the order code (it only does
  that for the fallback URL configured on the payment method). The storefront includes the code itself.
- Mollie gives no guarantee on webhook timing. The confirmation page polls and, after 10 s, calls
  `syncMolliePaymentStatus` as a fallback.
- Mollie can't reach `localhost`: in development, set `VENDURE_PUBLIC_URL` to a tunnel URL for webhooks.

## Still to verify with a live test key

The development environment used so far could not reach `api.mollie.com`, so in3 has not yet been exercised
against Mollie's test mode. To confirm:

1. Put the test key in `backend/.env`, run `npm run setup:mollie`, start a tunnel and set `VENDURE_PUBLIC_URL`.
2. Put an order of €100+ in the cart and open the payment step: `in3` should be listed (it's only offered if
   in3 is enabled on the Mollie test profile and the amount is in range).
3. Pay with in3 in Mollie's test checkout and check the order reaches `PaymentSettled`.
4. Refund part of it in the Dashboard and check the refund in the Mollie dashboard.

If in3 does not appear, enable it for the test profile in the Mollie dashboard first.

## Consequences

- We depend on a young community package (1.0.x); the version is pinned and the e2e tests guard upgrades.
- in3 eligibility shown to customers is driven by the backend (Milestone 4), using Mollie's min/max per method.
