#!/usr/bin/env bash
#
# Un fichero 'use server' solo puede exportar funciones asincronas.
#
# Exportar una constante desde ahi COMPILA, pasa `tsc --noEmit` y pasa
# `next build`. El fallo aparece en el navegador: el valor llega como
# `undefined` y la pantalla revienta al usarlo.
#
# Paso dos veces el mismo dia —TRIAL_DAYS_OPTIONS y APPROVAL_OBJECT_TYPES— asi
# que deja de ser un descuido y pasa a ser algo que hay que comprobar.
#
#   ./tools/check-server-actions.sh            # desde cualquier carpeta del repo
#   ./tools/check-server-actions.sh apps/web   # raiz alternativa
#
# Compatible con el bash 3.2 de macOS: sin `mapfile` ni `xargs -r`.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

RAIZ=${1:-apps/web}
fallos=0
revisados=0

# Los ficheros se listan con git y no con `grep -r`.
#
# `grep -r` sobre apps/web recorre node_modules y .next: cientos de miles de
# ficheros, ninguno del proyecto. git ya sabe cuales son nuestros ficheros.
# En un pathspec de git, `*` cruza directorios, asi que `$RAIZ/*.ts` cubre todo
# el arbol.
lista=$(git ls-files -- "$RAIZ/*.ts" "$RAIZ/*.tsx")

if [ -z "$lista" ]; then
  echo "ERROR: no hay ficheros .ts/.tsx en $RAIZ. ¿Ruta correcta?"
  exit 2
fi

while IFS= read -r f; do
  [ -n "$f" ] || continue
  grep -qE "^['\"]use server['\"]" "$f" || continue
  revisados=$((revisados + 1))

  # Exportaciones prohibidas:
  #   export const / let / var / class / enum     -> valores
  #   export function (sin async)                 -> funcion sincrona
  #   export default <algo que no es async function>
  #   export { ... } / export * from ...          -> no se puede saber si son
  #                                                  async: hay que exportarlas
  #                                                  con `export async function`
  #
  # `export type` y `export interface` no cuentan: desaparecen al compilar.
  malas=$(grep -nE \
    '^export[[:space:]]+(const|let|var|class|enum)[[:space:]]|^export[[:space:]]+function[[:space:]]|^export[[:space:]]+default[[:space:]]|^export[[:space:]]*(\{|\*)' \
    "$f" | grep -vE '^[0-9]+:export[[:space:]]+default[[:space:]]+async[[:space:]]+function' || true)

  if [ -n "$malas" ]; then
    echo "ERROR: $f exporta algo que no es una funcion asincrona declarada:"
    echo "$malas" | sed 's/^/    /'
    fallos=$((fallos + 1))
  fi
done <<EOF
$lista
EOF

if [ "$revisados" -eq 0 ]; then
  echo "ERROR: no se ha encontrado ningun fichero 'use server' en $RAIZ."
  exit 2
fi

if [ "$fallos" -gt 0 ]; then
  echo
  echo "Mueve los valores a un modulo compartido (por ejemplo lib/<dominio>/catalog.ts)"
  echo "y exporta las acciones con 'export async function'."
  exit 1
fi

echo "Sin exportaciones de valor en ficheros 'use server' ($revisados revisados)."
