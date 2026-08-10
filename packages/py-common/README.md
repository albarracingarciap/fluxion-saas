# `fluxion_common`

Librería compartida por los servicios Python del monorepo. Sin dependencias
externas: solo biblioteca estándar.

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

## Qué falta y cuándo llega

| Módulo | Cuándo |
|---|---|
| `db` | Conexión a Postgres con `SET LOCAL ROLE` + `request.jwt.claims`, para que los servicios escriban **con RLS activa** en lugar de con `service_role` |
| `auth` | Validación local de JWT (mismo `JWT_SECRET` que GoTrue), sin llamada de red |
| `signals` | Cliente para `POST /api/ingest/v1/signals` |

Se añadirán al construir la capa de ingesta. No se escriben antes: código
compartido sin dos consumidores reales es código especulativo.

## La regla

Aquí solo entra lo que usan **dos o más** servicios. Lo que necesita uno solo
vive en ese servicio.
