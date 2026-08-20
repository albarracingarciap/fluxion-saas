#!/usr/bin/env bash
#
# Copia externa cifrada de las copias locales.
#
# Las copias de PostgreSQL y de MinIO viven en el mismo servidor que protegen:
# cubren un borrado accidental, no la perdida de la maquina. Esto las saca fuera.
#
# Cifrado en el cliente: Backblaze guarda bloques que no puede abrir. La
# contrasena vive solo en /etc/fluxion/offsite.env, y perderla significa perder
# las copias de forma irreversible.
#
# Instalacion: ver infra/backups/README.md
#
set -euo pipefail

CONF=/etc/fluxion/offsite.env
RCLONE_CONF=/etc/fluxion/rclone.conf
LOG=/var/log/fluxion-offsite.log
IMAGEN=rclone/rclone:latest

log() { printf '%s  %s\n' "$(date -Is)" "$*" >> "$LOG"; }

if [[ ! -r "$CONF" ]]; then
  log "ERROR: falta $CONF"
  exit 1
fi
# shellcheck source=/dev/null
source "$CONF"   # REMOTO, ORIGEN_PG, ORIGEN_MINIO

# ── Aviso solo cuando falla ──────────────────────────────────────────────────
#
# El silencio significa que todo va bien. Avisar tambien de los exitos
# entrenaria a ignorar el canal, y entonces el fallo pasaria igual de
# desapercibido que sin aviso.
avisar() {
  [[ -n "${SLACK_WEBHOOK_INFRA:-}" ]] || return 0
  local texto="$1"
  local carga
  carga=$(printf '{"text": ":rotating_light: *Fluxion . copias* %s\\n%s"}' "$(hostname)" "$texto")
  curl -s -m 10 -X POST \
       -H "Content-Type: application/json" \
       --data "$carga" "$SLACK_WEBHOOK_INFRA" >/dev/null 2>&1 \
    || log "AVISO: no se pudo notificar a Slack"
}

rclone() {
  docker run --rm \
    -v "$RCLONE_CONF":/config/rclone/rclone.conf:ro \
    -v /var/backups:/var/backups:ro \
    -v /tmp/fluxion-restore:/restore \
    "$IMAGEN" "$@"
}

# ── Subida ───────────────────────────────────────────────────────────────────

# `copy` y no `sync`: la rotacion local borra a los 14 dias, y `sync` propagaria
# ese borrado al destino. La retencion remota la decide el ciclo de vida del
# bucket, no lo que quede en el servidor.
copiar() {
  local origen="$1" destino="$2"

  if [[ ! -d "$origen" ]]; then
    log "AVISO: $origen no existe, se omite"
    return 0
  fi

  if rclone copy "$origen" "${REMOTO}:${destino}" \
       --transfers 4 --checkers 8 --stats-one-line --stats 0 \
       >> "$LOG" 2>&1; then
    log "subido $origen -> ${REMOTO}:${destino}"
    return 0
  fi

  log "ERROR: fallo al subir $origen"
  return 1
}

estado=0
copiar "$ORIGEN_PG"    "supabase" || estado=1
copiar "$ORIGEN_MINIO" "minio"    || estado=1

# ── Comprobacion ─────────────────────────────────────────────────────────────
#
# Que `rclone copy` termine con exito no demuestra que el fichero este alli y se
# pueda descifrar. Se comprueba listando y midiendo: un objeto de cero bytes
# subiria igual de bien.

HOY=$(date +%Y%m%d)
remotos=$(rclone lsjson "${REMOTO}:supabase" 2>/dev/null \
          | grep -c "full_${HOY}" || true)

if [[ "$remotos" -ge 1 ]]; then
  bytes=$(rclone size "${REMOTO}:supabase" --json 2>/dev/null \
          | grep -o '"bytes":[0-9]*' | cut -d: -f2 || echo 0)
  log "verificacion: volcado de $HOY presente en destino, $bytes bytes en total"
else
  log "ERROR: el volcado de $HOY NO aparece en el destino"
  estado=1
fi

if [[ "$estado" -ne 0 ]]; then
  avisar "La subida de copias a Backblaze ha fallado. Revisa /var/log/fluxion-offsite.log"
fi

log "fin (estado $estado)"
exit "$estado"
