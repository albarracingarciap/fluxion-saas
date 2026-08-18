#!/usr/bin/env bash
#
# Copia de los objetos de MinIO (evidencias y documentos regulatorios).
#
# El backup de PostgreSQL guarda los metadatos; sin esto, restaurarlo deja filas
# apuntando a ficheros que no existen.
#
# Instalación: ver infra/backups/README.md
#
set -euo pipefail

CONF=/etc/fluxion/minio-backup.env
DEST=/var/backups/minio
ARCHIVE="$DEST/archive"
LOG=/var/log/fluxion-minio-backup.log
RETENTION_DAYS=14
MC_IMAGE=minio/mc:latest

log() { printf '%s  %s\n' "$(date -Is)" "$*" >> "$LOG"; }

if [[ ! -r "$CONF" ]]; then
  log "ERROR: falta $CONF"
  exit 1
fi
# shellcheck source=/dev/null
source "$CONF"   # MINIO_HOST, MINIO_BACKUP_KEY, MINIO_BACKUP_SECRET

# Las contraseñas se generan sin '/', '+' ni '=' precisamente para poder ir aquí
# sin escapar nada.
MC_HOST="https://${MINIO_BACKUP_KEY}:${MINIO_BACKUP_SECRET}@${MINIO_HOST}"

BUCKETS=(fluxion-evidences fluxion-documents)

# El directorio de cada bucket se crea aquí y no se deja a `mc mirror`: un
# bucket vacío no genera destino, y entonces el `tar` de más abajo aborta por
# no encontrarlo. Fallaba solo cuando no había nada que copiar, que es
# precisamente cuando nadie mira el log.
mkdir -p "$DEST" "$ARCHIVE"
for b in "${BUCKETS[@]}"; do mkdir -p "$DEST/$b"; done

mirror_bucket() {
  local bucket="$1"

  # Sin --remove a propósito: un espejo que replica borrados no es una copia de
  # seguridad, es una segunda copia del mismo error. Los objetos que
  # desaparezcan del bucket se conservan aquí hasta la rotación del archivo.
  docker run --rm \
    -e "MC_HOST_fx=$MC_HOST" \
    -v "$DEST":/backup \
    "$MC_IMAGE" mirror --overwrite "fx/$bucket" "/backup/$bucket" \
    >> "$LOG" 2>&1
}

status=0
for bucket in "${BUCKETS[@]}"; do
  if mirror_bucket "$bucket"; then
    objetos=$(find "$DEST/$bucket" -type f | wc -l)
    bytes=$(du -sb "$DEST/$bucket" | cut -f1)
    log "espejo $bucket: $objetos objetos, $bytes bytes"
  else
    log "ERROR: falló el espejo de $bucket"
    status=1
  fi
done

# Punto en el tiempo. El espejo por sí solo no permite volver al estado de
# antenoche: si algo se corrompe y se sincroniza, el espejo también.
STAMP=$(date +%Y%m%d)
TARBALL="$ARCHIVE/minio_${STAMP}.tar.gz"
if tar czf "$TARBALL" -C "$DEST" "${BUCKETS[@]}" 2>>"$LOG"; then
  log "archivo $TARBALL: $(du -h "$TARBALL" | cut -f1)"
else
  log "ERROR: no se pudo crear $TARBALL"
  status=1
fi

find "$ARCHIVE" -name 'minio_*.tar.gz' -mtime "+$RETENTION_DAYS" -delete

# Deja rastro siempre, también cuando no hay nada que copiar: un trabajo
# programado que solo escribe cuando encuentra trabajo es indistinguible de uno
# que ha dejado de ejecutarse.
log "fin (estado $status)"
exit "$status"
