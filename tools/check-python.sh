#!/usr/bin/env bash
#
# Comprobacion estatica de los servicios Python.
#
# Existe por un fallo concreto: al migrar agent1 a AsyncOpenAI quedo una
# anotacion `Optional[OpenAI]` con el nombre ya no importado. La sintaxis era
# valida, asi que `ast.parse` no dijo nada; el servicio arranco, reviento al
# importar y Traefik devolvio 502 sin mas pista.
#
#   pip install pyflakes
#   ./tools/check-python.sh
#
set -euo pipefail

RUTAS=(
  services/agents/fluxion_agents
  services/telemetry/fluxion_telemetry
  services/renderer/fluxion_renderer
  services/connector-mlflow/fluxion_connector_mlflow
  packages/py-common/fluxion_common
)

fallos=0
for r in "${RUTAS[@]}"; do
  [[ -d "$r" ]] || continue
  # Solo los nombres indefinidos: las importaciones sin usar son ruido heredado
  # y no rompen nada en ejecucion.
  if python -m pyflakes "$r" 2>&1 | grep -E "undefined name|redefinition of unused"; then
    fallos=1
  fi
done

if [[ $fallos -eq 1 ]]; then
  echo "FALLO: hay nombres indefinidos"
  exit 1
fi

echo "Sin nombres indefinidos en los servicios Python."
