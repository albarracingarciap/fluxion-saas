#!/usr/bin/env bash
#
# Prueba de restauracion desde la copia externa.
#
# La copia diaria comprueba que el fichero esta en el destino. Eso no demuestra
# que se pueda descifrar ni que el volcado sea valido: para saberlo hay que
# bajarlo, descifrarlo y abrirlo.
#
# Una copia que nunca se ha restaurado no es una copia, es una esperanza.
#
# Se ejecuta semanalmente. Ver infra/backups/README.md
#
set -euo pipefail

CONF=/etc/fluxion/offsite.env
RCLONE_CONF=/etc/fluxion/rclone.conf
LOG=/var/log/fluxion-offsite.log
IMAGEN=rclone/rclone:latest
TRABAJO=/tmp/fluxion-restore

log() { printf '%s  %s\n' "$(date -Is)" "$*" >> "$LOG"; }

# shellcheck source=/dev/null
source "$CONF"

mkdir -p "$TRABAJO"
rm -f "$TRABAJO"/*.dump

# ── 1 · El volcado mas reciente del destino ──────────────────────────────────

ultimo=$(docker run --rm \
  -v "$RCLONE_CONF":/config/rclone/rclone.conf:ro \
  "$IMAGEN" lsf "${REMOTO}:supabase" --include "full_*.dump" 2>/dev/null \
  | sort | tail -1)

if [[ -z "$ultimo" ]]; then
  log "VERIFICACION FALLIDA: no hay ningun volcado en el destino"
  exit 1
fi

# ── 2 · Bajarlo y descifrarlo ────────────────────────────────────────────────
# rclone descifra al vuelo; si la contrasena fuese incorrecta, esto falla aqui.

if ! docker run --rm \
      -v "$RCLONE_CONF":/config/rclone/rclone.conf:ro \
      -v "$TRABAJO":/restore \
      "$IMAGEN" copy "${REMOTO}:supabase/${ultimo}" /restore \
      >> "$LOG" 2>&1; then
  log "VERIFICACION FALLIDA: no se pudo descargar o descifrar $ultimo"
  exit 1
fi

tam=$(stat -c%s "$TRABAJO/$ultimo" 2>/dev/null || echo 0)
if [[ "$tam" -lt 1000 ]]; then
  log "VERIFICACION FALLIDA: $ultimo bajo con $tam bytes"
  exit 1
fi

# ── 3 · Que el volcado sea legible de verdad ─────────────────────────────────
# pg_restore -l lee el indice del archivo. Un fichero truncado o corrupto falla
# aqui, y es la unica prueba que distingue "hay un fichero" de "hay una copia".

if docker run --rm -v "$TRABAJO":/restore \
     --entrypoint pg_restore postgres:15-alpine -l "/restore/$ultimo" \
     > /dev/null 2>> "$LOG"; then
  objetos=$(docker run --rm -v "$TRABAJO":/restore \
            --entrypoint pg_restore postgres:15-alpine -l "/restore/$ultimo" \
            2>/dev/null | grep -c ';' || echo 0)
  log "VERIFICACION OK: $ultimo descifrado y legible, $tam bytes, $objetos entradas"
  rm -f "$TRABAJO/$ultimo"
  exit 0
fi

log "VERIFICACION FALLIDA: $ultimo se descargo pero pg_restore no lo reconoce"
exit 1
