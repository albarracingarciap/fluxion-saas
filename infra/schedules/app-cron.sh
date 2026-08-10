#!/usr/bin/env bash
# Invoca un endpoint de cron de la aplicación web.
#
#   ./app-cron.sh /api/cron/evidence-expiry
#
# Lee la configuración de /etc/fluxion/cron.env:
#   FLUXION_WEB_URL=https://<dominio-de-la-app>
#   CRON_SECRET=<el mismo valor que en las variables de fluxion-web>

set -euo pipefail

ENV_FILE=/etc/fluxion/cron.env
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

: "${FLUXION_WEB_URL:?FLUXION_WEB_URL no definida en $ENV_FILE}"
ENDPOINT="${1:?Uso: app-cron.sh /api/cron/<nombre>}"

LOG=/var/log/fluxion-cron.log
OUT=$(mktemp)
trap 'rm -f "$OUT"' EXIT

code=$(curl -sS --max-time 120 -o "$OUT" -w '%{http_code}' \
  ${CRON_SECRET:+-H "Authorization: Bearer ${CRON_SECRET}"} \
  "${FLUXION_WEB_URL}${ENDPOINT}")

printf '%s  %-32s HTTP %s  %s\n' \
  "$(date -Is)" "$ENDPOINT" "$code" "$(head -c 300 "$OUT" | tr -d '\n')" >> "$LOG"

[ "$code" = "200" ]
