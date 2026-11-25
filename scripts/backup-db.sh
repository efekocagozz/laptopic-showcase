#!/usr/bin/env bash
# Database backup for the production stack. Run it on the server, e.g. daily from cron:
#   15 3 * * * cd /opt/laptopic && ./scripts/backup-db.sh >> backups/backup.log 2>&1
# Keeps the newest 14 backups in backups/. Also copy that folder off the server (another disk or cloud
# storage): a backup on the same machine doesn't help if the machine is lost.
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p backups
set -a
# shellcheck disable=SC1091
. ./.env.production
set +a

file="backups/vendure-$(date +%Y-%m-%d_%H%M).sql.gz"
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
    pg_dump -U "${DB_USERNAME:-vendure}" -d "${DB_NAME:-vendure}" --no-owner | gzip > "$file"
echo "Backup written: $file"

# Rotate: keep the 14 newest backups.
find backups -maxdepth 1 -name 'vendure-*.sql.gz' -type f | sort -r | tail -n +15 | while read -r old; do
    rm -f -- "$old"
done
