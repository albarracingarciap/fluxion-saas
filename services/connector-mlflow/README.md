# Conector MLflow

Publica en Fluxion una señal por cada versión de modelo del registro de MLflow.

Es el primer módulo del catálogo y el más simple a propósito: sirve para validar
de punta a punta la cadena **origen externo → clave API → ingesta → señal →
cronología del sistema → aviso**.

## Qué hace

Por cada versión de modelo encontrada:

| Señal | Cuándo | Gravedad |
|---|---|---|
| `inventory.model_registered` | Siempre | `info` |
| `inventory.model_promoted` | La versión tiene alias `production`/`prod`/`champion`, o etapa `Production` | `medium` |

La segunda es la que importa para gobernanza: significa que el sistema de IA que
figura en el inventario **ya no es el que describe su dossier técnico**.

## No guarda estado

El conector no recuerda qué envió. En cada pasada reenvía el registro completo y
el Core descarta lo conocido por `dedupe_key`:

```
mlflow:<modelo>:v<version>
mlflow:<modelo>:v<version>:production
```

Eso lo hace reiniciable, redesplegable y reproducible sin volumen ni base de
datos propia. Es el motivo por el que existe `dedupe_key` en el contrato.

## Vincular un modelo con un sistema del inventario

Mientras no exista la pantalla de conciliación (Fase 3), el puente es una
etiqueta en MLflow:

```
fluxion.system_id = <uuid del sistema en Fluxion>
```

Puesta en el **modelo registrado** o en una **versión concreta** — la de la
versión manda. Sin etiqueta, la señal se registra a nivel de organización: sigue
siendo visible, pero no aparece en la cronología de ningún sistema.

## Configuración

| Variable | Oblig. | Notas |
|---|:--:|---|
| `FLUXION_API_URL` | ✅ | `https://fluxion-ai.es` |
| `FLUXION_API_KEY` | ✅ | Clave con **solo** `signals:write` |
| `MLFLOW_TRACKING_URI` | ✅ | `http://<host-mlflow>:5000` |
| `MLFLOW_USERNAME` | | Si MLflow tiene autenticación básica |
| `MLFLOW_PASSWORD` | | Ídem |
| `POLL_INTERVAL_SECONDS` | | Por defecto 900 (15 min) |
| `RUN_ONCE` | | `true` para una pasada y salir. Útil para probar |

## Despliegue en Dokploy

Servicio nuevo, con **contexto de build en la raíz** del monorepo:

```
Docker File          services/connector-mlflow/Dockerfile
Docker Context Path  .
```

**Red**: MLflow no publica su puerto en el host, así que el conector tiene que
poder alcanzarlo. O se adjunta el servicio a la red del stack de MLflow, o se
expone MLflow tras un dominio en Traefik. `FLUXION_API_URL` va por Internet y no
tiene ese problema.

## Probar sin desplegar

Desde la raíz del monorepo:

```bash
export PYTHONPATH="$PWD/packages/py-common:$PWD/services/connector-mlflow"
pip install -r services/connector-mlflow/requirements.txt

export FLUXION_API_URL=https://fluxion-ai.es
export FLUXION_API_KEY=flx_...
export MLFLOW_TRACKING_URI=http://localhost:5000
export RUN_ONCE=true

python -m fluxion_connector_mlflow.main
```

Arranca comprobando la credencial con `/api/ingest/v1/ping`: si la clave está
mal, falla en el primer segundo en lugar de a las tres horas.

## Lo que no hace

No crea sistemas en el inventario. Eso es la Fase 3: descubrimientos en tabla de
staging y conciliación humana explícita. Un inventario de cumplimiento no se
autopuebla sin que alguien lo confirme.
