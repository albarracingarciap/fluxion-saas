---
id: TEC-DESPLIEGUE
titulo: Despliegue
tipo: tecnica
modulo: transversal
audiencia: tecnica
version: 0.1
fuente:
  - docs/infra/README.md
  - docs/infra/migracion-supabase-propio.md
  - infra/supabase/docker-compose.propio.yaml
  - infra/supabase/env.propio.example
  - infra/db/migrate.sh
  - services/telemetry/docker-compose.yml
  - apps/web/Dockerfile
  - apps/web/next.config.mjs
  - services/agents/Dockerfile
  - services/renderer/Dockerfile
  - services/telemetry/Dockerfile
  - services/connector-mlflow/Dockerfile
  - services/connector-shadow-ai/Dockerfile
  - .dockerignore
  - recursos/db/README.md
---

# Despliegue

Cómo se despliega Fluxion:
- **Plataforma:** Dokploy (Docker Swarm con Traefik) sobre un VPS.
- **Base de datos:** un stack propio de Supabase autoalojado.
- **Ficheros:** MinIO.
- **Esquema:** se aplica con `infra/db/migrate.sh`.

Ver [Arquitectura](arquitectura.md).

## Componentes

### Servicios de Fluxion

| Servicio | Tipo en Dokploy | Imagen base | Puerto | Dominio público |
|---|---|---|---|---|
| `fluxion-web` | Application | `node:20-alpine`, tres etapas, usuario `nextjs` | 3001 | Sí |
| `fluxion-agents` | Application | `python:3.11-slim` | 8001 | — |
| `fluxion-renderer` | Application | `python:3.11-slim-bookworm` con Chromium | 8000 | No: solo interno |
| `fluxion-telemetry` | Compose | `python:3.11-slim-bookworm` | 8000 | Sí, para los exportadores OTLP |
| `connector-mlflow` | Application (worker) | `python:3.11-slim` | — | No |
| `connector-shadow-ai` | Application (worker) | `python:3.11-slim-bookworm` | — | No |

**Reglas comunes:**
- Todas las imágenes se construyen con contexto en la raíz del monorepo. `.dockerignore` excluye
  `node_modules`, `.next`, `.env*`, `docs/`, `recursos/`, `supabase/`, `infra/` y `tools/`.
- Los servicios internos no publican puertos: no se usa **Advanced › Ports** en Dokploy. La web llega al
  renderer por la red `dokploy-network`.
- Para redesplegar se usa **Redeploy** en Dokploy, nunca `docker restart`: en Swarm deja tareas
  duplicadas.

### Web

- Next.js 14.2 con `output: 'standalone'`; arranca con `node server.js`.
- **Variables de compilación:** `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` se pasan como
  `ARG`. De la URL se deriva el host permitido de `next/image`. Si cambian, hay que reconstruir la imagen.
- **Server Actions:** `bodySizeLimit` de 26 MB.

> TODO: confirmar `NEXT_PUBLIC_APP_URL`. La usan los avisos y las tareas programadas, pero no se pasa
> como variable de compilación. El código tiene dos valores por defecto distintos.

### Supabase autoalojado (stack propio)

`infra/supabase/docker-compose.propio.yaml` parte del compose oficial, sin `analytics`, `vector`,
`realtime`, `imgproxy` ni `functions`. `CONTAINER_PREFIX` evita choques de nombres con otros stacks.

| Servicio | Imagen |
|---|---|
| `db` | `supabase/postgres:15.8.1.085` |
| `auth` | `supabase/gotrue:v2.186.0` |
| `rest` | `postgrest/postgrest:v14.8` |
| `storage` | `supabase/storage-api:v1.48.26` (backend `file`) |
| `kong` | `kong/kong:3.9.1` |
| `studio` | `supabase/studio:2026.04.08-sha-205cbe7` |
| `meta` | `supabase/postgres-meta:v0.96.3` |
| `supavisor` | `supabase/supavisor:2.7.4` (sin puertos publicados) |

**Volúmenes persistentes:** en `files/volumes/` del proyecto de Dokploy:
- `db/data`, con los datos de Postgres;
- `storage`;
- `api/kong.yml`;
- scripts de arranque de la base de datos;
- volumen `db-config`, con la clave de pgsodium.

**Kong:** se une a `dokploy-network` para que Traefik lo publique con el dominio de la base de datos.

> TODO: confirmar los puertos de Kong. Publica sus puertos HTTP y HTTPS en el servidor, los mismos que el
> stack compartido con los valores de ejemplo.

### Redes

| Red | Quién |
|---|---|
| `dokploy-network` (externa) | Traefik, web, renderer, Kong, telemetría, MinIO |
| Red por defecto del stack de Supabase | Servicios de Supabase y telemetría, que escribe directamente en Postgres |

> TODO: confirmar la red de la telemetría. Su compose referencia la red de Supabase por un nombre que
> lleva el sufijo del proyecto de Dokploy. Si se recrea el proyecto, la telemetría no conecta con la base
> de datos.

### MinIO

**Proyecto:** compose propio de Dokploy, con un servicio `minio-init` que crea:
- los buckets `fluxion-evidences` (versionado) y `fluxion-documents` (versionado y retención GOVERNANCE de
  10 años);
- el usuario de la aplicación;
- la configuración de CORS.

**Corpus del RAG:** está en otra instancia, la de MLflow.

Ver [Almacenamiento de ficheros](almacenamiento-ficheros.md).

## Modelo de datos

### Migraciones (`infra/db/migrate.sh`)

**Parámetros (variables de entorno):**
- `REPO`: copia del repositorio en el servidor;
- `CT`: contenedor de Postgres, `<CONTAINER_PREFIX>-db` en el stack propio.

**Pasos:**
1. Comprueba que el contenedor está en marcha.
2. Hace `git pull --ff-only`.
3. Crea `supabase_migrations.schema_migrations` si no existe.
4. Recorre `supabase/migrations/*.sql` en orden y salta las versiones ya aplicadas. La versión es el
   prefijo antes del primer `_`.
5. Aplica cada fichero **y su registro en la tabla de control en la misma transacción** (`psql -v ON_ERROR_STOP=1 --single-transaction -f -`): o se aplican las dos cosas o ninguna. Si una migración falla, el script se detiene sin registrarla ni seguir con las siguientes. Una migración que no admita transacción (por ejemplo `CREATE INDEX CONCURRENTLY`) debe llevar la línea `-- migrate: sin-transaccion`: se aplica sentencia a sentencia y se registra después.

```bash
cp infra/db/migrate.sh /root/migrate.sh && chmod +x /root/migrate.sh
CT=<prefijo>-db /root/migrate.sh
```

**Después de migrar:**
- añadir los esquemas nuevos a `PGRST_DB_SCHEMAS`;
- ejecutar `NOTIFY pgrst, 'reload schema';`;
- comprobar `cron.job`.

**Reglas:**
- **Nombres:** las migraciones se nombran `<timestamp>_<modulo>_<descripcion>.sql`.
- **No editar:** una migración aplicada no se modifica: se corrige con otra nueva.
- **Orden de la línea base:**
  `00000000000000_extensions` → `…01_schema` → `…02_public_objects` → `…03_auth_storage` →
  `…04_cron_jobs` → `…05_seed_compliance`. La semilla del
  [catálogo estándar](../glosario.md#catálogo-estándar-de-fluxion) es una migración más.
- **Requisito del fichero 03:** el stack debe haber arrancado una vez antes, para que GoTrue y storage-api
  creen sus tablas.
- **Corpus del RAG:** se carga aparte. Ver [RAG y corpus normativo](rag.md#corpus).

## API

No aplica.

## Dependencias

### Despliegue desde cero

1. **Stack de Supabase:**
   - crear el compose en Dokploy con un `.env` basado en `env.propio.example`;
   - arrancarlo una vez.
2. **Esquema:**
   - aplicar las migraciones con `migrate.sh`;
   - ajustar `PGRST_DB_SCHEMAS`, que debe incluir `fluxion`, `compliance`, `rag` y `telemetry`;
   - recargar PostgREST.
3. **Corpus:** cargar el corpus del RAG.
4. **MinIO:** desplegar MinIO con sus buckets y su usuario.
5. **Servicios:**
   - desplegar cada servicio en Dokploy, con contexto en la raíz y su Dockerfile;
   - configurar sus variables (ver [Configuración](configuracion.md));
   - asignar dominios solo a la web, a la telemetría y a Kong.
6. **Tareas programadas:** instalar `/etc/fluxion/cron.env` y el crontab. Ver
   [Tareas programadas](tareas-programadas.md).
7. **Copias de seguridad:** instalarlas. Ver [Copias de seguridad](copias-de-seguridad.md).
8. **Módulos:** activarlos por organización en `fluxion.organization_modules`.

### Actualización

- **Código:** **Redeploy** del servicio en Dokploy.
- **`NEXT_PUBLIC_*`:** si cambian, reconstruir la web.
- **Esquema:** `migrate.sh` y, si hay esquemas nuevos, `PGRST_DB_SCHEMAS`.

### Comprobaciones después de desplegar

- **Web:** responde y el inicio de sesión funciona en el navegador.
- **Contenedores:** `docker ps` muestra los servicios en marcha. `docker service logs <servicio>` para
  revisarlos.
- **Renderer:** `curl /health` desde `dokploy-network`.
- **MinIO:** `/minio/health/live` responde 200, y listar un bucket sin credenciales da `AccessDenied`.
- **Funcionalidad básica:**
  - adjunto de tarea;
  - consulta al asistente;
  - generación de un PDF;
  - ejecución de `/api/cron/incident-deadlines`;
  - sincronización de los conectores.

### Separación de la base de datos

Fluxion usaba una instancia de Supabase compartida con otros proyectos. `docs/infra/migracion-supabase-propio.md`
documenta el paso a un stack propio:
- el esquema se reconstruye con `migrate.sh`;
- solo se trasladan los datos y el corpus;
- se generan secretos nuevos, así que cambian las claves y caducan las sesiones;
- los secretos de Vault se vuelven a introducir.

Está en la fase 6 de 7. Queda la comprobación final y el cambio al dominio definitivo.

> TODO: confirmar varios documentos y ficheros de despliegue.
> - **`docs/infra/README.md`:** sigue describiendo la instancia compartida.
> - **`README.md` raíz:** dice que hay tres servicios.
> - **README de la telemetría:** la describe como Application, no como Compose.
> - **Imágenes base:** `agents` y `connector-mlflow` no fijan la versión de Debian.
> - **Healthcheck:** ninguna imagen lo define.

## Seguridad

- **Secretos:**
  - van en las variables de cada servicio en Dokploy y en el `.env` del stack;
  - nunca en el repositorio.
- **Servicios internos:** renderer, conectores, agentes y Supavisor no tienen dominio ni puertos
  publicados.
- **Usuario de los contenedores:** las imágenes Python se ejecutan como root; la web, con un usuario sin
  privilegios.

Ver [Seguridad](seguridad.md).

## Configuración

| Variable | Dónde | Descripción |
|---|---|---|
| `CONTAINER_PREFIX` | `.env` del stack de Supabase | Prefijo de los contenedores |
| `PGRST_DB_SCHEMAS` | ídem | Esquemas expuestos por PostgREST |
| `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`, `SITE_URL` | ídem | URLs públicas del stack |
| `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `POSTGRES_PASSWORD`, `VAULT_ENC_KEY` | ídem | Secretos del stack |
| `REPO`, `CT` | Entorno de `migrate.sh` | Repositorio y contenedor de Postgres |

La lista completa por servicio está en [Configuración](configuracion.md).
