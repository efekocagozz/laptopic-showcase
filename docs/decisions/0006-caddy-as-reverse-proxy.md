# 0006 — Caddy as the reverse proxy (not Nginx)

- **Status:** accepted
- **Date:** 2026-11-25

## Context

In production (`docker-compose.prod.yml`) the shop runs as several containers on one server: the Next.js
storefront (port 3001), the Vendure server (port 3000), the worker and Postgres. Something has to sit in front of
them:

- **HTTPS.** Next.js and Vendure only speak plain HTTP, and a shop with a checkout must use HTTPS. Mollie's
  redirects and webhooks also need a public HTTPS URL.
- **Routing by domain.** `shop.<domain>` should reach the storefront and `api.<domain>` the Vendure server, both
  on the normal ports 80/443.
- **One front door.** Only ports 80 and 443 should be open to the internet. The apps and the database stay on
  Docker's internal network.

This is the job of a **reverse proxy**. The two common choices are Nginx and Caddy.

## Decision

Use **Caddy 2** (`caddy:2-alpine`), configured in [`deploy/Caddyfile`](../../deploy/Caddyfile):

```
{$SHOP_DOMAIN} {
    encode zstd gzip
    reverse_proxy storefront:3001
}

{$API_DOMAIN} {
    encode zstd gzip
    header { Strict-Transport-Security "..."; X-Content-Type-Options nosniff; ... }
    reverse_proxy server:3000
}
```

Caddy requests and renews Let's Encrypt certificates for both domains itself. The certificates live in the
`caddy_data` volume.

## Why Caddy

- **Automatic HTTPS is built in.** Naming a domain is enough; there's no certbot, no renewal cron job and no
  reload hook. Expired certificates are a classic small-shop outage, and this removes that failure mode.
- **Less config to get wrong.** The whole proxy setup is about 20 readable lines, with safe TLS defaults
  (modern protocols, HTTP → HTTPS redirect). For a project maintained by one person, that matters more than
  extra tuning options.
- **Fits the existing setup.** It's one more container in the compose file, configured with the same
  environment variables (`SHOP_DOMAIN`, `API_DOMAIN`) as the rest of the stack.

## Trade-offs

- **Nginx is more widely used.** More companies run it, there are more examples online, and teams are more
  likely to know it already. A team that already runs Nginx would reasonably keep it.
- **Nginx has more tuning and modules** for very high traffic. A webshop of this size doesn't need them.
- **Caddy needs a writable volume for its certificates.** If `caddy_data` is lost, it requests new certificates,
  and Let's Encrypt has rate limits, so the volume is part of the server backup.

## Alternatives considered

- **Nginx + certbot.** Works, but it needs a second container or a host cron job for renewals, plus a reload
  after each renewal. The same routing looks like this:

  ```nginx
  server {
      listen 443 ssl;
      server_name shop.example.nl;
      ssl_certificate     /etc/letsencrypt/live/shop.example.nl/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/shop.example.nl/privkey.pem;
      gzip on;
      location / {
          proxy_pass http://storefront:3001;
          proxy_set_header Host $host;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
  }
  # ...plus a port 80 server block that redirects to HTTPS, the same block for the API domain,
  # and certbot running on a schedule to renew the certificates.
  ```

  The concepts are identical, so switching later only means rewriting `deploy/Caddyfile`. Nothing in the
  application changes.
- **Traefik.** Also has automatic HTTPS and reads routing from Docker labels. It's more than this setup needs,
  and configuration spread across labels is harder to read than one file.
- **A managed platform (Railway, Fly.io).** HTTPS and routing are included, so no proxy is needed. This is still
  an option for the hosting decision (D10 in `docs/implementation-plan.md`). The Docker/Caddy setup keeps the
  shop runnable on any VPS.
