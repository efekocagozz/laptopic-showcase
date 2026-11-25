# Deployment

How to run laptopic in production on one Linux server (a VPS) with Docker. The stack in
`docker-compose.prod.yml`:

```
Internet ─► Caddy (HTTPS, ports 80/443)
              ├─ shop.example.nl ─► storefront (Next.js)
              └─ api.example.nl  ─► server (Vendure Shop/Admin API, Dashboard, Mollie webhooks, images)
            worker (emails, search index, nightly supplier sync)
            postgres (data in a Docker volume)
```

Caddy gets and renews the HTTPS certificates itself. Only ports 80 and 443 are open to the internet.

## 1. What you need

- A Linux server with Docker (2 vCPU / 4 GB RAM is plenty; e.g. Hetzner, DigitalOcean, TransIP: €5–15/month).
- Two domain names pointing to the server's IP address (A/AAAA records), e.g. `shop.jouwdomein.nl` and
  `api.jouwdomein.nl`.
- An SMTP account for sending email (e.g. Resend, Postmark, Mailgun, or your mail host), with your domain verified
  there so emails don't land in spam.
- A Mollie **test** API key (this project refuses live keys).

## 2. First deployment

```bash
git clone https://github.com/efekocagozz/laptopic.git /opt/laptopic
cd /opt/laptopic
cp .env.production.example .env.production
nano .env.production            # fill in every value; generate secrets with: openssl rand -base64 48
chmod 600 .env.production

# Database, API server and worker
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build postgres server worker

# Optional, only on an empty database: the demo catalogue (+ the Mollie payment method if MOLLIE_API_KEY is set)
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm server node dist/seed/seed.js

# Storefront (its build reads products from the running server) and HTTPS proxy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build storefront caddy
```

Then open `https://shop.jouwdomein.nl` and the Dashboard at `https://api.jouwdomein.nl/dashboard`.

**If the server or worker doesn't start**, look at its log:
`docker compose -f docker-compose.prod.yml logs server`. On purpose, a production server refuses to start with
missing settings, placeholder or short secrets, `http://` URLs, a live Mollie key, or no SMTP settings, and it lists
every problem at once (`backend/src/config/production-environment.ts`).

Without demo data you add products in the Dashboard; create the Mollie payment method with
`docker compose -f docker-compose.prod.yml run --rm server node dist/seed/setup-mollie.js`.

## 3. Updating

```bash
cd /opt/laptopic
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build postgres server worker
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build storefront caddy
```

Database migrations run automatically when the server starts. Make a backup first (next section).

## 4. Backups

`scripts/backup-db.sh` writes a compressed database dump to `backups/` and keeps the newest 14. Run it daily with
cron:

```bash
crontab -e
# add:
15 3 * * * cd /opt/laptopic && ./scripts/backup-db.sh >> backups/backup.log 2>&1
```

Also copy `backups/` off the server (e.g. `rclone` to cloud storage) and back up the `assets` volume (uploaded
product images). Restore a dump with:

```bash
gunzip -c backups/vendure-YYYY-MM-DD_HHMM.sql.gz | \
  docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres psql -U vendure -d vendure
```

Test a restore once, on a copy, before you need it.

## 5. Security checklist

| | Where |
|---|---|
| HTTPS everywhere, HSTS | Caddy + storefront headers (`storefront/next.config.ts`) |
| Secrets only in `.env.production` on the server (`chmod 600`), never in git | `.gitignore` |
| Server refuses to start with weak/placeholder secrets or http URLs | `backend/src/config/production-environment.ts` |
| CSRF protection on the APIs, CORS limited to the shop domain | `backend/src/vendure-config.ts` |
| Login cookie `httpOnly`, `secure`, `SameSite=Lax` | `storefront/src/platform/vendure/auth-token.ts` |
| No GraphQL playground, no dev mailbox, no test payment method in production | `APP_ENV=production` |
| Database and API server not reachable from the internet | `docker-compose.prod.yml` (no public ports) |
| Containers run as a non-root user | Dockerfiles |
| Dependency updates | Dependabot (`.github/dependabot.yml`); CI must pass before merging |

Also do on the server: a firewall that only allows 22, 80 and 443 (`ufw allow OpenSSH && ufw allow 80,443/tcp &&
ufw enable`), SSH with keys only, and automatic security updates (`unattended-upgrades`).

### Known dependency advisories

`npm audit` reports advisories in packages that Vendure 3.8.1 depends on (`@graphql-tools/utils`, `graphql-scalars`,
`nodemailer`). They are denial-of-service issues, or prototype pollution that is only reachable through schema
merging and `@defer`/`@stream`, which this shop doesn't use with untrusted input. Fixing them means replacing
Vendure's own dependencies with new major versions, which could break Vendure, so we wait for Vendure's update
(Dependabot opens the pull request). Rate limiting for public forms is best added at the proxy if abuse appears.

## 6. Monitoring

- `docker compose -f docker-compose.prod.yml ps` shows health; the server and storefront have health checks and
  restart automatically.
- Add a free uptime monitor (e.g. UptimeRobot) for `https://shop.jouwdomein.nl` and
  `https://api.jouwdomein.nl/health`.
- Logs: `docker compose -f docker-compose.prod.yml logs -f server worker storefront`.

## 7. Operations automation (optional)

`automation/` ([README](../automation/README.md)) runs on the host with cron, outside Docker. It needs Python 3.12.

```bash
cd /opt/laptopic/automation
python3.12 -m venv .venv && .venv/bin/pip install .
```

- **Supplier file:** `laptopic-ops feed` writes the import file on the host, e.g. `/srv/feeds/supplier.csv`. The
  worker reads it inside its container, so mount that folder read-only into the `worker` service
  (`volumes: ["/srv/feeds:/feeds:ro"]`) and set `SUPPLIER_FEED_PATH=/feeds/supplier.csv` in `.env.production`.
  Schedule `feed` before the sync runs at 03:00.
- **Daily report:** `laptopic-ops report` needs `VENDURE_ADMIN_API_URL=https://api.jouwdomein.nl/admin-api` and
  the superadmin credentials from `.env.production`, or better, a separate read-only Administrator.
- Example crontab lines are in the automation README. Exit code 1 means "look at this", and 2 means "failed".
  Let cron mail the output, or wrap the command in your alerting.
