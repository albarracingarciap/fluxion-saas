#!/usr/bin/env bash
#
# Aplica las migraciones pendientes de supabase/migrations.
#
# Sirve para las dos instancias: el contenedor se elige con la variable CT.
#
#   /root/migrate.sh                      # instancia compartida (supabase-db)
#   CT=fluxion-sb-db /root/migrate.sh     # stack propio
#
# Cada migración se aplica en una transacción junto con su registro en la tabla
# de control. Una migración que no pueda ir en transacción debe llevar la línea
# `-- migrate: sin-transaccion` al principio.
#
# Y funciona sobre una base de datos VIRGEN: crea la tabla de control si no
# existe. Sin eso, la primera consulta falla con "schema does not exist" y el
# `set -e` corta antes de aplicar nada — que es justo lo que pasa al levantar
# una instancia nueva, el momento en el que mas falta hace.
#
set -euo pipefail

REPO=${REPO:-/root/fluxion-repo}
CT=${CT:-supabase-db}
PSQL="docker exec -i $CT psql -U supabase_admin -d postgres"

if ! docker ps --format '{{.Names}}' | grep -qx "$CT"; then
  echo "ERROR: el contenedor '$CT' no esta en marcha"
  exit 1
fi

echo "Instancia: $CT"
cd "$REPO" && git pull --ff-only

# Tabla de control. Es la misma que usa la CLI de Supabase; aqui solo se
# escribe `version`, que es lo unico que este runner necesita.
$PSQL -q -c "CREATE SCHEMA IF NOT EXISTS supabase_migrations;"
$PSQL -q -c "CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
               version    text PRIMARY KEY,
               statements text[],
               name       text
             );"

applied=$($PSQL -At -c "SELECT version FROM supabase_migrations.schema_migrations")

nuevas=0
for f in "$REPO"/supabase/migrations/*.sql; do
  v=$(basename "$f" | cut -d_ -f1)

  if grep -qx "$v" <<< "$applied"; then
    echo "  ya aplicada   $v"
    continue
  fi

  nombre=$(basename "$f")
  echo "→ aplicando     $v  ($nombre)"

  registro="INSERT INTO supabase_migrations.schema_migrations(version, name) VALUES ('$v', '$nombre');"

  if grep -q '^-- migrate: sin-transaccion' "$f"; then
    # Excepción explícita para sentencias que no admiten transacción (por
    # ejemplo CREATE INDEX CONCURRENTLY). Se aplica sentencia a sentencia y se
    # registra después: si falla a medias, hay que revisarla a mano.
    echo "  (sin transacción, marcada en el fichero)"
    $PSQL -v ON_ERROR_STOP=1 -q -f - < "$f"
    $PSQL -v ON_ERROR_STOP=1 -q -c "$registro"
  else
    # La migración y su registro van en la MISMA transacción: o se aplican las
    # dos cosas o ninguna. Antes el registro iba en otra llamada (una migración
    # aplicada podía quedar sin registrar y repetirse) y `-1` con la entrada por
    # `<` no abría transacción: psql solo la abre con -c o -f.
    { cat "$f"; printf '\n%s\n' "$registro"; } | $PSQL -v ON_ERROR_STOP=1 --single-transaction -q -f -
  fi

  echo "  aplicada      $v"
  nuevas=$((nuevas + 1))
done

echo "Listo. $nuevas migraciones nuevas."
