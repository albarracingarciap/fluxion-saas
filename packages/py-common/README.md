# `fluxion_common`

Librería compartida por los servicios Python del monorepo. Dependencias mínimas:
solo `httpx`.

## Cómo se consume

No se publica en PyPI ni se instala con pip. Cada servicio la copia dentro de su
imagen desde su propio Dockerfile, con el **contexto de build en la raíz del monorepo**:

```dockerfile
COPY packages/py-common/fluxion_common/ ./fluxion_common/
COPY services/<servicio>/<paquete>/     ./<paquete>/
```

Para desarrollo local, desde la raíz del repo:

```bash
export PYTHONPATH="$PWD/packages/py-common:$PWD/services/agents"
uvicorn fluxion_agents.main:app --reload --port 8001
```

## Qué contiene

| Módulo | Para qué |
|---|---|
| `config` | `require_env()` / `get_env()`. Falla al arrancar, no en la primera petición |
| `logging` | `setup_logging()`. Mismo formato en todos los contenedores |
| `signals` | `SignalsClient`: publica en `/api/ingest/v1/signals` con troceado en lotes y reintentos. Contrato en [docs/ingesta.md](../../docs/ingesta.md) |

Dependencias: solo `httpx`, que necesita `signals`.

## Qué falta y cuándo llega

| Módulo | Cuándo |
|---|---|
| `db` | Conexión a Postgres con `SET LOCAL ROLE` + `request.jwt.claims`, para que los servicios escriban **con RLS activa** en lugar de con `service_role`. Hará falta cuando un módulo necesite leer datos del Core, no solo escribir señales |
| `auth` | Validación local de JWT (mismo `JWT_SECRET` que GoTrue), sin llamada de red |

No se escriben antes: código compartido sin dos consumidores reales es código
especulativo.

## La regla

Aquí solo entra lo que usan **dos o más** servicios. Lo que necesita uno solo
vive en ese servicio.

## `telemetry` — instrumentacion de llamadas a modelos

Instrumentacion **manual**, no automatica. Las librerias de instrumentacion
automatica de LLM capturan por omision el contenido de prompts y respuestas;
aunque el ingestor de Fluxion lo descarta al recibirlo, enviarlo por la red ya
es una decision que no queremos tomar por el cliente. Aqui no hay ninguna
funcion para adjuntar contenido.

```python
from fluxion_common.telemetry import init_telemetry, llm_span

init_telemetry(service_name="mi-servicio", system_id=os.getenv("FLUXION_SYSTEM_ID"))

with llm_span("chat", "openai", "gpt-4o") as call:
    response = client.chat.completions.create(...)
    call.from_openai(response)
```

En streaming hay que pedir `stream_options={"include_usage": True}` y tratar el
fragmento final, que llega **sin `choices`**:

```python
for chunk in stream:
    if not chunk.choices:
        call.from_openai(chunk)
        continue
    ...
```

Sin `OTEL_EXPORTER_OTLP_ENDPOINT` no hace nada. Es deliberado: la telemetria
nunca puede ser el motivo de que un servicio falle.
