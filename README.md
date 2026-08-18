# Fluxion

Plataforma de gobernanza y gestión de riesgos de IA: inventario de sistemas,
clasificación AI Act, FMEA, análisis de brechas, SoA ISO 42001, evidencias y ejecución.

## Estructura

```
apps/
  web/                  Next.js 14 (App Router). Frontend + server actions + API routes
services/
  agents/               FastAPI · Agente 1 (clasificación AI Act) y Agente 4 (asistente SGAI)
  connector-mlflow/     Módulo: sincroniza el registro de modelos de MLflow
packages/
  py-common/            fluxion_common: utilidades compartidas por los servicios Python
supabase/
  migrations/           Esquema de base de datos. Fuente de verdad
infra/
  schedules/            Tareas programadas del sistema
docs/
  infra/              Topología, red, backups y diagnóstico del VPS
  ingesta.md          Contrato de la API que usan los módulos
recursos/               Baseline, catálogos de origen, material de diseño
tools/                  Utilidades sueltas
```

## Convenciones

**Servicios.** Cada servicio vive en `services/<nombre-con-guiones>/` y contiene un
paquete Python `fluxion_<nombre_con_guiones_bajos>/`. El prefijo evita colisiones con
paquetes de PyPI y hace evidente qué es código propio.

**Contexto de build.** Todos los Dockerfiles se construyen con contexto en la **raíz**
del monorepo, no en su carpeta. Es necesario para copiar `packages/py-common`.

```
fluxion-web                contexto: .   dockerfile: apps/web/Dockerfile
fluxion-agents             contexto: .   dockerfile: services/agents/Dockerfile
fluxion-connector-mlflow   contexto: .   dockerfile: services/connector-mlflow/Dockerfile
```

**Migraciones.** `<timestamp>_<modulo>_<descripcion>.sql` en `supabase/migrations/`.
Una migración aplicada no se edita nunca; se corrige con otra nueva. Ver
[`recursos/db/README.md`](recursos/db/README.md).

## Desarrollo

```bash
# Frontend
cd apps/web && npm install && npm run dev        # http://localhost:3000

# Servicio de agentes
export PYTHONPATH="$PWD/packages/py-common:$PWD/services/agents"
pip install -r services/agents/requirements.txt
uvicorn fluxion_agents.main:app --reload --port 8001
```

`apps/web/.env.local` para el frontend; las variables del servicio de agentes se
inyectan desde Dokploy en producción.

## Módulos

El Core —inventario, clasificación, FMEA, gaps, evidencias, SoA, tareas— está
siempre. Un **módulo** es una capacidad que se despliega aparte, se contrata
aparte y puede no estar: se activa por organización en
`fluxion.organization_modules`.

Los módulos no escriben en la base de datos: publican por la API de ingesta.
El contrato está en [`docs/ingesta.md`](docs/ingesta.md) y la implementación de
referencia es [`services/connector-mlflow/`](services/connector-mlflow/).

## Despliegue

Dokploy sobre VPS. Tres servicios hoy; cada módulo nuevo será uno más con el
mismo patrón.

Migraciones de base de datos: `/root/migrate.sh` en el VPS, que hace `git pull` y
aplica lo pendiente según `supabase_migrations.schema_migrations`.
