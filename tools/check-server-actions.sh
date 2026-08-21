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
#   ./tools/check-server-actions.sh
#
set -euo pipefail

RAIZ=${1:-apps/web}
fallos=0

# Los ficheros se listan con git y no con `grep -r`.
#
# `grep -r` sobre apps/web recorre node_modules y .next: cientos de miles de
# ficheros, ninguno del proyecto. La primera version tardaba minutos y se
# quedaba colgada, que en la practica significa que la comprobacion no se pasa
# nunca. git ya sabe cuales son nuestros ficheros.
mapfile -t ficheros < <(
  git ls-files -z -- "$RAIZ/**/*.ts" "$RAIZ/**/*.tsx" "$RAIZ/*.ts" "$RAIZ/*.tsx" \
    | xargs -0 -r grep -l -e "^'use server'" -e '^"use server"' 2>/dev/null || true
)

for f in "${ficheros[@]:-}"; do
  [ -n "$f" ] || continue

  # Exportaciones de valor que no son funciones asincronas:
  #   export const / let / var / class / enum
  #   export function sin async
  #   export default sin async
  #
  # `export type` y `export interface` no cuentan: desaparecen al compilar.
  malas=$(grep -nE \
    '^export[[:space:]]+(const|let|var|class|enum)[[:space:]]|^export[[:space:]]+function[[:space:]]|^export[[:space:]]+default[[:space:]]+(function[[:space:]]|[A-Za-z_])' \
    "$f" || true)

  if [ -n "$malas" ]; then
    echo "ERROR: $f exporta valores que no son funciones asincronas:"
    echo "$malas" | sed 's/^/    /'
    fallos=$((fallos + 1))
  fi
done

if [ "$fallos" -gt 0 ]; then
  echo
  echo "Muevelos a un modulo compartido, por ejemplo lib/<dominio>/catalog.ts."
  exit 1
fi

echo "Sin exportaciones de valor en ficheros 'use server' (${#ficheros[@]} revisados)."
