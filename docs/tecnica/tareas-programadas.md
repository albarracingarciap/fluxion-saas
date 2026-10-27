---
id: TEC-TAREAS-PROGRAMADAS
titulo: Tareas programadas
tipo: tecnica
modulo: transversal
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/api/cron/evidence-expiry/route.ts
  - apps/web/app/api/cron/review-reminders/route.ts
  - apps/web/app/api/cron/incident-deadlines/route.ts
  - apps/web/app/api/cron/cost-budgets/route.ts
  - apps/web/app/api/cron/hitl-discordance/route.ts
  - apps/web/app/api/cron/outbox/route.ts
  - apps/web/lib/cron/auth.ts
  - infra/schedules/crontab
  - infra/schedules/app-cron.sh
  - infra/schedules/README.md
  - supabase/migrations/00000000000004_cron_jobs.sql
  - supabase/migrations/20260822090000_telemetry_rollups.sql
  - apps/web/app/api/cron/approval-expiry/route.ts
  - apps/web/app/api/cron/authority-request-deadlines/route.ts
  - supabase/migrations/20261028130000_requerimientos_avisos_plazo.sql
  - apps/web/app/api/cron/reevaluation-triggers/route.ts
---

# Tareas programadas

Trabajos que Fluxion ejecuta periódicamente. Hay nueve:
- siete son endpoints `/api/cron/*` de la web, que llama el crontab del servidor;
- tres son funciones SQL que ejecuta pg_cron dentro de la base de datos.

## Componentes

| Tarea | Dónde corre | Programación | Qué hace |
|---|---|---|---|
| `evidence-expiry` | Crontab → web | `0 7 * * *` (diaria, 07:00) | Alertas de caducidad de evidencias a 30 días, a 7 días y vencidas. Marca como caducadas las válidas vencidas |
| `review-reminders` | Crontab → web | `0 8 * * 1` (lunes, 08:00) | Aviso `review_due` a cada responsable de acciones aceptadas o diferidas con revisión en 30 días o vencida |
| `incident-deadlines` | Crontab → web | `17 * * * *` (cada hora) | Avisos de plazo de los incidentes graves al 50 %, al 80 % y al vencer |
| `reevaluation-triggers` | Crontab → web | `45 6 * * *` (diario) | Disparadores de reevaluación: revisión del FMEA vencida y reglas de clasificación actualizadas; cierra los resueltos (B21a) |
| `authority-request-deadlines` | Crontab → web | `20 7 * * *` (diario) | Avisos de plazo de los requerimientos de la autoridad: 5 días o menos y vencido (B25e) |
| `cost-budgets` | Crontab → web | `40 * * * *` (cada hora) | Compara el gasto del mes con los presupuestos y avisa del umbral más alto nuevo |
| `hitl-discordance` | Crontab → web | `30 6 * * *` (diaria, 06:30) | Detecta subidas de discordancia en la supervisión humana y avisa |
| `outbox` | Crontab → web | `*/5 * * * *` (cada 5 min) | Entrega los webhooks salientes pendientes |
| `approval-expiry` | Crontab → web | `50 * * * *` (cada hora) | Cancela las solicitudes de aprobación caducadas, devuelve el objeto a borrador y avisa (B11c) |
| `process-task-recurrences` | pg_cron | `5 * * * *` (cada hora) | Crea las tareas recurrentes que tocan |
| `telemetry-rollup` | pg_cron | `25 * * * *` (cada hora) | Recalcula los agregados diarios de telemetría de ayer y hoy |
| `telemetry-partitions` | pg_cron | `0 3 1 * *` (día 1, 03:00) | Crea las particiones mensuales de telemetría para los próximos 6 meses |

Las horas son las del servidor y las de pg_cron, que se espera estén en UTC.

### Detalle de cada tarea

| Tarea | Lee | Escribe | Evita repetir con | Respuesta |
|---|---|---|---|---|
| `evidence-expiry` | `system_evidences` | `evidence_expiry_alerts`, `system_evidences.status` | `UNIQUE (evidence_id, alert_type)`, una alerta viva por evidencia | `{checked, upserted, superseded, cleared, errors, statusSynced, runAt}` |
| `review-reminders` | `treatment_actions`, `notifications` | `notifications` | Ventana de 6 días por destinatario | `{checkedAt, totalPending, totalOverdue, orgCount, notified, skipped, unassigned, orgs}` |
| `approval-expiry` | `approval_requests` (`expires_at`) | `approval_requests`, el objeto, `notifications` | Solo solicitudes pendientes; al cancelarlas dejan de estarlo | `{cerradas, errores}` |
| `reevaluation-triggers` | `fmea_evaluations`, `ai_systems`, `reevaluation_triggers`, `documents` | `reevaluation_triggers` (por `reevaluation_register`), `tasks`, `ai_system_history` | Índice único del disparador abierto `(system_id, trigger_key, source_ref)` | `{checkedAt, triggersRegistered, triggersResolved, organizations}` |
| `authority-request-deadlines` | `authority_requests` (Recibido o En preparación, con plazo), `authority_request_deadline_alerts` | `notifications`, `channel_deliveries`, `authority_request_deadline_alerts` | Clave `(request_id, threshold, due_at)`: si cambia el plazo, se vuelve a avisar. Si ya venció, solo se avisa del vencimiento | `{checkedAt, withOpenDeadline, thresholdsAlerted, notificationsSent, deliveriesRetried}` |
| `incident-deadlines` | `ai_incidents`, `incident_deadline_alerts` | `notifications`, `channel_deliveries`, `incident_deadline_alerts` | Clave `(incident_id, threshold)` | `{checkedAt, withOpenDeadline, thresholdsAlerted, notificationsSent, deliveriesRetried}` |
| `cost-budgets` | `telemetry.v_budget_status`, `cost_budget_alerts` | `cost_budget_alerts`, `signals`, `channel_deliveries` | Clave `(budget_id, period_key, threshold)` y `dedupe_key` de la señal | `{checkedAt, budgets, alerted, deliveriesRetried}` |
| `hitl-discordance` | RPC `hitl_discordance_spikes()` | `signals`, `channel_deliveries` | `dedupe_key` por sistema y semana ISO | `{checkedAt, spikes, alerted, deliveriesRetried}` |
| `outbox` | `outbox_deliveries`, `outbox_events`, `webhooks` | `outbox_deliveries` | Estado de cada entrega | `{checkedAt, intentadas, enviadas, fallidas, abandonadas}` |
| `process-task-recurrences` | `task_recurrences`, `task_templates` | `tasks`, `task_checklist_items`, `task_recurrence_runs` | Avance de `next_run_at` en la misma transacción | — |
| `telemetry-rollup` | `telemetry.llm_spans` | `rollup_daily`, `rollup_runs` | Borra y vuelve a calcular el rango | — |
| `telemetry-partitions` | — | Particiones de `llm_spans` | `IF NOT EXISTS` | — |

**Detalle de los avisos:**
- [Eventos y avisos](eventos-y-avisos.md#tareas-programadas-que-avisan);
- [Webhooks salientes](webhooks-salientes.md#despacho-y-reintentos);
- [Tareas recurrentes](../funcional/tareas-recurrentes.md);
- [Telemetría](telemetria.md).

> TODO: confirmar varios comportamientos de las tareas.
> - **Entregas solapadas de `outbox`:** no tiene límite de duración ni bloqueo. Un lote lento puede
>   solaparse con la siguiente pasada y entregar dos veces.
> - **Avisos de presupuesto que no se repiten:** `cost-budgets` registra el umbral antes de avisar. Si
>   falla el aviso, no se repite.
> - **Reintentos de los canales:** solo se reintentan en las organizaciones con avisos nuevos en esa
>   pasada.
> - **Recurrencias bloqueadas:** `process-task-recurrences` procesa todo en una transacción, así que una
>   recurrencia con error bloquea las demás cada hora.
> - **Registro de fallos del cálculo de telemetría:** los fallos de `telemetry-rollup` no quedan
>   registrados en `rollup_runs`.
> - **Conservación de la telemetría:** no hay ninguna tarea que la aplique.
> - **Lecturas sin paginar:** varias tareas leen sin paginar y con un cliente que puede usar caché.

## Modelo de datos

**Tareas de pg_cron:** se registran en `cron.job` y su historial en `cron.job_run_details`. Las migraciones
las desprograman y las vuelven a programar, así que se pueden reaplicar.

**Otros objetos:** ver la tabla de detalle y, para cada tarea, el documento correspondiente.

## API

**Endpoints:** las seis rutas `/api/cron/*` solo admiten `GET`.

**Autenticación** (`requireCronSecret`):

| Situación | Respuesta |
|---|---|
| Falta `CRON_SECRET` en el servidor | 503 `{"error":"cron_secret_missing"}` |
| Cabecera distinta de `Authorization: Bearer <CRON_SECRET>` | 401 `{"error":"unauthorized"}` |

### Ejecución desde el servidor

`infra/schedules/app-cron.sh <ruta>`:
1. Lee `/etc/fluxion/cron.env`, con `FLUXION_WEB_URL` y `CRON_SECRET`.
2. Llama a `GET <FLUXION_WEB_URL><ruta>` con un tiempo máximo de 120 s.
3. Escribe una línea en `/var/log/fluxion-cron.log`: fecha, ruta, código y principio de la respuesta.

Solo da por buena una respuesta 200.

**Instalación** (`infra/schedules/README.md`):
1. Crear `/etc/fluxion/cron.env` con permisos 600.
2. Copiar `app-cron.sh` a `/opt/fluxion/` y darle permiso de ejecución.
3. Probarlo a mano con `evidence-expiry`.
4. Añadir `infra/schedules/crontab` al crontab del servidor.

Alternativa: Dokploy Schedules, con el mismo comando.

**Comprobación:**
- `crontab -l | grep -c app-cron.sh` debe devolver 7;
- `tail /var/log/fluxion-cron.log`;
- un `HTTP 401` indica que el secreto no coincide;
- para pg_cron, consultar `cron.job_run_details` y `telemetry.rollup_runs`.

> TODO: confirmar varios aspectos de `app-cron.sh` y de su README.
> - **Fallos de conexión:** si `curl` falla (tiempo agotado, conexión rechazada), el script termina antes
>   de escribir en el log, así que esos fallos no quedan registrados.
> - **Ejecuciones solapadas:** no usa bloqueo.
> - **README desactualizado:**
>   - no incluye `outbox` ni las tareas de pg_cron;
>   - la comprobación espera 4 tareas;
>   - dice que sin secreto los endpoints quedan abiertos, cuando hoy responden 503.
> - **Instalación repetida:** el paso de instalación duplica las tareas si se repite.

## Dependencias

| Dependencia | Uso |
|---|---|
| Crontab del servidor (o Dokploy Schedules) | Llamadas a `/api/cron/*` |
| Extensión `pg_cron` | Tareas internas de la base de datos (`00000000000000_extensions.sql`) |
| Web desplegada | Ejecuta las seis tareas HTTP |

## Seguridad

- **Secreto:** `/api/cron/*` exige `CRON_SECRET` y, si no está configurado, rechaza las peticiones.
- **Escritura:** las tareas usan service role y recorren todas las organizaciones.

Ver [Seguridad](seguridad.md).

## Configuración

| Variable | Dónde | Obligatoria | Descripción |
|---|---|---|---|
| `CRON_SECRET` | Web y `/etc/fluxion/cron.env` | Sí | Secreto compartido |
| `FLUXION_WEB_URL` | `/etc/fluxion/cron.env` | Sí | URL base de la web |
| `NEXT_PUBLIC_APP_URL` | Web | Sí | Base de los enlaces de los avisos |

Ver [Configuración](configuracion.md).
