# Fluxion

Plataforma de gobernanza y gestión de riesgos de IA: inventario de sistemas,
clasificación AI Act, FMEA, análisis de brechas, SoA ISO 42001, evidencias y ejecución.

## Estructura

```
apps/
  web/                  Next.js 14 (App Router). Frontend + server actions + API routes
services/
  agents/               FastAPI · Agente 1 (clasificación AI Act) y Agente 4 (asistente SGAI)
packages/
  py-common/            fluxion_common: utilidades compartidas por los servicios Python
supabase/
  migrations/           Esquema de base de datos. Fuente de verdad
infra/
  schedules/            Tareas programadas del sistema
docs/                   Documentación de arquitectura y decisiones
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
fluxion-web      contexto: .   dockerfile: apps/web/Dockerfile
fluxion-agents   contexto: .   dockerfile: services/agents/Dockerfile
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

## Despliegue

Dokploy sobre VPS. Dos servicios hoy (`fluxion-web`, `fluxion-agents`); cada módulo
nuevo será un servicio más con el mismo patrón.

Migraciones de base de datos: `/root/migrate.sh` en el VPS, que hace `git pull` y
aplica lo pendiente según `supabase_migrations.schema_migrations`.
