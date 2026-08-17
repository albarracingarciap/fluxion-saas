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
