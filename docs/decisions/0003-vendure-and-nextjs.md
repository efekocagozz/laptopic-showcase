# 0003 — Vendure + Next.js instead of Shopify, WooCommerce or Medusa

- **Status:** accepted
- **Date:** 2026-10-27

## Context

The shop has to sell in the Netherlands, in euros, with iDEAL and in3 through Mollie. It is also a portfolio piece
for an IT student, so the code itself has to show architecture, testing and integration skills.

## Options

| Option | For | Against |
|---|---|---|
| **Shopify** | Fast to launch, hosted | Extra ~2% third-party transaction fee when paying through Mollie/in3; little code to show |
| **WooCommerce** | Mature in3/Mollie plugin | PHP + WordPress plugins; mostly configuration, not architecture |
| **Medusa** | Modern TypeScript commerce framework | Mollie/in3 support only via community packages; no official Dutch-market starter |
| **Vendure + Next.js** | TypeScript end to end; plugin architecture (NestJS DI, GraphQL); a maintained Mollie plugin; an official Next.js starter; built-in tax, channels, email and job queue | Self-hosted; Vendure core is GPLv3 (fine for running our own shop) |

## Decision

Vendure 3 (backend) with PostgreSQL, and a Next.js storefront talking to Vendure's Shop API.

## Consequences

- We run and deploy the backend ourselves (Docker setup in the repository).
- Custom behaviour is written as Vendure plugins, which keeps it testable (`@vendure/testing`) and separate from
  the framework.
