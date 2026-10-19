---
id: TEC-CONFIGURACION
titulo: Configuración
tipo: tecnica
modulo: transversal
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/next.config.mjs
  - apps/web/Dockerfile
  - apps/web/lib/supabase/fluxion.ts
  - apps/web/lib/storage/objects.ts
  - apps/web/lib/documents/render.ts
  - apps/web/lib/notifications/email.ts
  - apps/web/lib/cron/auth.ts
  - services/agents/fluxion_agents/main.py
  - services/agents/fluxion_agents/models.py
  - services/renderer/fluxion_renderer/main.py
  - services/telemetry/fluxion_telemetry/main.py
  - services/telemetry/fluxion_telemetry/store.py
  - services/connector-mlflow/fluxion_connector_mlflow/main.py
  - services/connector-shadow-ai/fluxion_connector_shadow_ai/main.py
  - services/connector-shadow-ai/fluxion_connector_shadow_ai/scanner.py
  - packages/py-common/fluxion_common/config.py
  - packages/py-common/fluxion_common/telemetry.py
  - infra/supabase/env.propio.example
  - infra/supabase/docker-compose.propio.yaml
  - infra/schedules/app-cron.sh
---

# Configuración

Variables de entorno de cada componente de Fluxion: obligatorias, valores por defecto y comportamiento si
faltan. No se incluyen valores de secretos.

## Componentes

**Dónde se definen:**

| Ámbito | Dónde |
|---|---|
| Servicios desplegados | Variables de cada servicio en Dokploy. En producción no hay ficheros `.env` |
| Stack de Supabase | `.env` del compose en Dokploy, basado en `infra/supabase/env.propio.example` |
| Tareas programadas | `/etc/fluxion/cron.env` |
| Copias de seguridad | `/etc/fluxion/minio-backup.env`, `/etc/fluxion/offsite.env`, `/etc/fluxion/rclone.conf` |
| Desarrollo de la web | `apps/web/.env.local`, sin versionar |
| Desarrollo del servicio de agentes | `services/agents/.env.local`, sin versionar |

**Lectura en los servicios Python:**
- `fluxion_common.config` ofrece `get_env(nombre, valor_por_defecto)`, que trata el valor vacío como
  ausente, y `require_env(nombre)`, que falla al arrancar con `MissingConfig`;
- el servicio de agentes lee el entorno directamente.

> TODO: confirmar la plantilla de variables de la web. No hay `apps/web/.env.example`.

### Web (`apps/web`)

| Variable | Navegador | Obligatoria | Valor por defecto | Uso y comportamiento si falta |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | Sí, en compilación | — | URL de Supabase. Determina además el host permitido de `next/image`. Si cambia, hay que reconstruir |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Sí, en compilación | — | Clave anon |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Sí | — | Service role: auditoría, ingesta, tareas programadas, catálogo, adjuntos |
| `NEXT_PUBLIC_APP_URL` | Sí (por el prefijo) | Recomendada | Varía según el código | Base de los enlaces de avisos y correos |
| `AGENT_SERVER_URL` | No | No | `http://localhost:8001` | Servicio de agentes |
| `RENDERER_URL`, `RENDERER_SECRET` | No | Para PDF | — | Sin ellas, error «El servicio de renderizado no está configurado» |
| `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | No | Para evidencias y PDF | — | Sin ellas, no se pueden subir evidencias ni generar PDF |
| `S3_REGION` | No | No | `us-east-1` | Región |
| `S3_FORCE_PATH_STYLE` | No | No | activado | Solo `false` lo desactiva |
| `S3_BUCKET_EVIDENCES` | No | No | `fluxion-evidences` | Bucket de evidencias |
| `S3_BUCKET_DOCUMENTS` | No | No | `fluxion-documents` | Bucket de PDF |
| `CRON_SECRET` | No | Sí | — | Sin ella, `/api/cron/*` responde 503 |
| `RESEND_API_KEY` | No | No | — | Sin ella no se envía correo, y no hay aviso |
| `RESEND_FROM_EMAIL` | No | No | Remitente del código | Remitente |
| `OPENAI_API_KEY` | No | Para la Declaración de Aplicabilidad | — | Sugerencias de la Declaración de Aplicabilidad |

**Variables fijadas en la imagen:** `NODE_ENV=production`, `NEXT_TELEMETRY_DISABLED=1`, `PORT=3001`,
`HOSTNAME=0.0.0.0`.

**Opciones de `next.config.mjs`:**
- `output: 'standalone'`;
- `images.remotePatterns`: `https://<host de Supabase>/storage/v1/object/public/**` y dos hosts históricos;
- `experimental.serverActions.bodySizeLimit: '26mb'`, para los adjuntos de tareas de 25 MB.

> TODO: confirmar varias variables de la web.
> - **`NEXT_PUBLIC_APP_URL`:**
>   - no se pasa en la compilación;
>   - el código tiene dos valores por defecto con dominios distintos, y en algunos avisos cae a vacío y
>     los enlaces quedan relativos;
>   - como solo se usa en el servidor, no necesitaría el prefijo `NEXT_PUBLIC_`.
> - **Modelo de la Declaración de Aplicabilidad:** está fijado en el código y no es configurable. No se
>   comprueba si falta `OPENAI_API_KEY`.

### Servicio de agentes (`services/agents`)

| Variable | Obligatoria | Valor por defecto | Comportamiento si falta |
|---|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Sí | — | No arranca |
| `OPENAI_API_KEY` | Sí | — | No arranca |
| `VOYAGE_API_KEY` | Para el corpus | — | Falla la primera búsqueda y se responde sin fragmentos |
| `FRONTEND_URL` | No | `http://localhost:3000` | Origen permitido por CORS |
| `FLUXION_CLASSIFICATION_MODEL` | No | `gpt-5.6-terra` | Modelo de clasificación |
| `FLUXION_ASSISTANT_MODEL` | No | `gpt-5.6-terra` | Modelo del asistente |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | — | Sin telemetría propia |
| `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_RESOURCE_ATTRIBUTES` | No | — | Las lee el SDK de OpenTelemetry |
| `FLUXION_SYSTEM_ID` | No | — | Las llamadas quedan «sin adscribir» |
| `FLUXION_ENV` | No | — | Entorno de las trazas |

### Renderer (`services/renderer`)

| Variable | Obligatoria | Valor por defecto | Comportamiento si falta |
|---|---|---|---|
| `RENDERER_SECRET` | Sí | — | Arranca, pero responde 503 a todo |
| `MAX_HTML_BYTES` | No | 20971520 (20 MiB) | Por encima, 413 |
| `LOG_LEVEL` | No | `INFO` | — |

### Telemetría (`services/telemetry`)

| Variable | Obligatoria | Valor por defecto | Comportamiento si falta |
|---|---|---|---|
| `DATABASE_URL` | Sí | — | No arranca. Apunta al contenedor de Postgres (`<CONTAINER_PREFIX>-db`) |
| `DB_POOL_MAX` | No | 8 | — |
| `MAX_BODY_BYTES` | No | 8388608 (8 MiB) | Por encima, 413 |
| `LOG_LEVEL` | No | `INFO` | — |

### Conectores

| Variable | Conector | Obligatoria | Valor por defecto |
|---|---|---|---|
| `FLUXION_API_URL`, `FLUXION_API_KEY` | Ambos | Sí (no arrancan sin ellas) | — |
| `POLL_INTERVAL_SECONDS` | Ambos | No | 900 (MLflow) · 86400 (Shadow AI) |
| `RUN_ONCE` | Ambos | No | `false` |
| `MLFLOW_TRACKING_URI`, `MLFLOW_USERNAME`, `MLFLOW_PASSWORD` | MLflow | No (respaldo) | — |
| `MAX_FICHEROS_CODIGO` | Shadow AI | No | 120 |
| `MAX_BYTES_FICHERO` | Shadow AI | No | 200000 |
| `RESERVA_PETICIONES` | Shadow AI | No | 500 |
| `UMBRAL_CATALOGO` | Shadow AI | No | 4 |

Los tokens de GitHub, GitLab y MLflow se guardan en **Ajustes › Conectores** (Vault), no en el entorno.
Ver [Conectores](conectores.md).

> TODO: confirmar el nivel de log de los conectores. No admiten `LOG_LEVEL`: el log está fijado en `INFO`.

### Stack de Supabase (`env.propio.example`)

| Servicio | Variables principales |
|---|---|
| Comunes | `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRY` (3600), `ANON_KEY`, `SERVICE_ROLE_KEY`, `CONTAINER_PREFIX` |
| URLs | `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`, `SITE_URL`, `ADDITIONAL_REDIRECT_URLS` |
| GoTrue | `DISABLE_SIGNUP` (`false`), `ENABLE_EMAIL_SIGNUP` (`true`), `ENABLE_EMAIL_AUTOCONFIRM` (`false`), `ENABLE_ANONYMOUS_USERS` (`false`), `SMTP_*`, `MAILER_URLPATHS_*`, `GOOGLE_*`/`GITHUB_*`/`AZURE_*` (desactivados), `SAML_*`, `MFA_*`, `SMS_*` |
| PostgREST | `PGRST_DB_SCHEMAS` (`public,storage,graphql_public,fluxion,compliance,rag,telemetry`), `PGRST_DB_MAX_ROWS` (1000) |
| Storage | `STORAGE_TENANT_ID`, `GLOBAL_S3_BUCKET`, `S3_PROTOCOL_ACCESS_KEY_ID/SECRET` (las exige el servicio, aunque no se usan), `REGION` |
| Kong y Studio | `KONG_HTTP_PORT`, `KONG_HTTPS_PORT`, `DASHBOARD_USERNAME`, `DASHBOARD_PASSWORD`, `PG_META_CRYPTO_KEY` |
| Supavisor | `POOLER_TENANT_ID`, `POOLER_DEFAULT_POOL_SIZE` (20), `POOLER_MAX_CLIENT_CONN` (100), `SECRET_KEY_BASE`, `VAULT_ENC_KEY` |

> **Notas:**
> - Si `PGRST_DB_SCHEMAS` no incluye `telemetry`, el panel de [Coste y uso de IA](../funcional/coste-uso-ia.md)
>   recibe 404.
> - Los secretos de Vault están cifrados con la clave de la instancia y no se pueden trasladar a otra.

### Tareas programadas y copias de seguridad

| Fichero | Variables |
|---|---|
| `/etc/fluxion/cron.env` | `FLUXION_WEB_URL` (obligatoria), `CRON_SECRET` (igual que en la web) |
| `/etc/fluxion/minio-backup.env` | `MINIO_HOST`, `MINIO_BACKUP_KEY`, `MINIO_BACKUP_SECRET` |
| `/etc/fluxion/offsite.env` | `REMOTO`, `ORIGEN_PG`, `ORIGEN_MINIO`, `SLACK_WEBHOOK_INFRA` (opcional) |
| Entorno de `infra/db/migrate.sh` | `REPO` (por defecto `/root/fluxion-repo`), `CT` (por defecto `supabase-db`) |

Ver [Tareas programadas](tareas-programadas.md) y [Copias de seguridad](copias-de-seguridad.md).

## Modelo de datos

No aplica. La configuración funcional de cada organización (módulos, canales, conectores, webhooks,
ajustes de seguridad) está en la base de datos y se gestiona desde [Ajustes](../funcional/ajustes.md).

## API

No aplica.

## Dependencias

| Variable | Servicio externo |
|---|---|
| `OPENAI_API_KEY` | OpenAI |
| `VOYAGE_API_KEY` | Voyage AI |
| `RESEND_API_KEY` | Resend |
| `S3_*` | MinIO |
| `SLACK_WEBHOOK_INFRA` | Slack (avisos de copias de seguridad) |

> TODO: confirmar los nombres de la clave y de la URL de Supabase. Son distintos según el componente:
> - **Clave de servicio:**
>   - `SUPABASE_SERVICE_ROLE_KEY` en la web;
>   - `SUPABASE_SERVICE_KEY` en el servicio de agentes;
>   - `SERVICE_ROLE_KEY` en el stack.
> - **URL:**
>   - `NEXT_PUBLIC_SUPABASE_URL` en la web;
>   - `SUPABASE_URL` en el servicio de agentes.

## Seguridad

- **Secretos:** nunca en ficheros versionados ni en ejemplos. Se definen en Dokploy o en `/etc/fluxion`,
  con permisos 600.
- **Variables `NEXT_PUBLIC_*`:** quedan incrustadas en el código del navegador. Solo pueden contener
  valores públicos: URL y clave anon.
- **Credenciales de conectores y canales:** van en Vault, no en el entorno.

Ver [Seguridad](seguridad.md).

## Configuración

Este documento es la referencia de configuración. Para el orden de despliegue, ver
[Despliegue](despliegue.md).
