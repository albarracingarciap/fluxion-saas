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
#   ./tools/check-python.sh                    # desde cualquier carpeta del repo
#   PYTHON=/ruta/a/python ./tools/check-python.sh
#
# Si no encuentra Python o pyflakes, FALLA: una comprobacion que no se ha podido
# hacer no puede darse por buena.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

PY=${PYTHON:-}
if [[ -z "$PY" ]]; then
  if command -v python3 >/dev/null 2>&1; then
    PY=python3
  elif command -v python >/dev/null 2>&1; then
    PY=python
  else
    echo "ERROR: no se encuentra python3 ni python. Indica uno con PYTHON=/ruta/a/python."
    exit 2
  fi
fi

if ! "$PY" -m pyflakes --version >/dev/null 2>&1; then
  echo "ERROR: pyflakes no esta instalado para $PY. Instalalo con: $PY -m pip install pyflakes"
  exit 2
fi

RUTAS=(
  services/agents/fluxion_agents
  services/telemetry/fluxion_telemetry
  services/renderer/fluxion_renderer
  services/connector-mlflow/fluxion_connector_mlflow
  services/connector-shadow-ai/fluxion_connector_shadow_ai
  packages/py-common/fluxion_common
)

fallos=0
revisadas=0
for r in "${RUTAS[@]}"; do
  if [[ ! -d "$r" ]]; then
    echo "AVISO: no existe $r; se omite."
    continue
  fi
  revisadas=$((revisadas + 1))
  # Solo los nombres indefinidos: las importaciones sin usar son ruido heredado
  # y no rompen nada en ejecucion.
  #
  # La salida se captura ANTES de evaluarla. Con `pipefail`, poner el pipe
  # directamente en el `if` hace que el codigo de salida sea el de pyflakes
  # —que devuelve 1 cuando ENCUENTRA algo— y la condicion se lee al reves.
  salida=$("$PY" -m pyflakes "$r" 2>&1 | grep -E "undefined name|redefinition of unused" || true)
  if [[ -n "$salida" ]]; then
    echo "$salida"
    fallos=1
  fi
done

if [[ $revisadas -eq 0 ]]; then
  echo "ERROR: no se ha revisado ningun servicio."
  exit 2
fi

if [[ $fallos -eq 1 ]]; then
  echo "FALLO: hay nombres indefinidos"
  exit 1
fi

echo "Sin nombres indefinidos en los servicios Python ($revisadas paquetes revisados)."
