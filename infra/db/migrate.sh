#!/usr/bin/env bash
#
# Aplica las migraciones pendientes de supabase/migrations.
#
# Sirve para las dos instancias: el contenedor se elige con la variable CT.
#
#   /root/migrate.sh                      # instancia compartida (supabase-db)
#   CT=fluxion-sb-db /root/migrate.sh     # stack propio
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

  echo "→ aplicando     $v  ($(basename "$f"))"

  # ON_ERROR_STOP y -1: la migracion entera va en una transaccion y, si algo
  # falla, no se registra como aplicada. Una migracion a medias registrada como
  # completa es la peor forma de romper una base de datos, porque el siguiente
  # `migrate.sh` la da por hecha.
  $PSQL -v ON_ERROR_STOP=1 -1 -q < "$f"
  $PSQL -q -c "INSERT INTO supabase_migrations.schema_migrations(version) VALUES ('$v')"

  echo "  aplicada      $v"
  nuevas=$((nuevas + 1))
done

echo "Listo. $nuevas migraciones nuevas."
