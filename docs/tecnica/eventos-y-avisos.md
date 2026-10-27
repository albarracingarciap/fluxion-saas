---
id: TEC-EVENTOS-AVISOS
titulo: Eventos y avisos
tipo: tecnica
modulo: transversal
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/lib/signals/dispatch.ts
  - apps/web/lib/outbox/emit.ts
  - apps/web/lib/channels/send.ts
  - apps/web/lib/notifications/sender.ts
  - apps/web/lib/notifications/email.ts
  - apps/web/lib/notifications/preferences.ts
  - apps/web/lib/approvals/notify.ts
  - apps/web/app/(app)/ajustes/tabs/canales.tsx
  - apps/web/app/api/cron/evidence-expiry/route.ts
  - apps/web/app/api/cron/review-reminders/route.ts
  - apps/web/app/api/cron/incident-deadlines/route.ts
  - apps/web/app/api/cron/cost-budgets/route.ts
  - apps/web/app/api/cron/hitl-discordance/route.ts
  - supabase/migrations/20260812090000_signals_core.sql
  - supabase/migrations/20260818190000_incidents_alerts_channels.sql
  - apps/web/app/api/cron/authority-request-deadlines/route.ts
  - supabase/migrations/20261028130000_requerimientos_avisos_plazo.sql
---

# Eventos y avisos

Cómo se avisa a las personas y a los sistemas cuando ocurre algo en Fluxion. Hay cinco mecanismos:

- [señales de riesgo](../glosario.md#señal-de-riesgo);
- [avisos en la app](../glosario.md#aviso-en-la-app);
- correo electrónico;
- [avisos a Slack/Teams](../glosario.md#aviso-a-slackteams);
- [webhooks salientes](webhooks-salientes.md).

## Componentes

| Mecanismo | Ubicación | Destino |
|---|---|---|
| Señales | `lib/signals/dispatch.ts`, tabla `fluxion.signals` | Historial del sistema, avisos y tareas |
| Avisos en la app | `lib/notifications/sender.ts` (`createNotification`), tabla `fluxion.notifications` | Campana de la barra superior |
| Correo | `lib/notifications/email.ts` (Resend) | Email del destinatario |
| Canales | `lib/channels/send.ts`, tablas `notification_channels`, `channel_deliveries` | Slack o Microsoft Teams |
| Webhooks | `lib/outbox/*` | Sistemas del cliente. Ver [Webhooks salientes](webhooks-salientes.md) |

### Señales

Una señal llega por la [API de ingesta](api-ingesta.md#post-signals) o la crea una tarea programada.
Las de la API pasan por `dispatchSignal`:

1. Si tienen sistema, se registran en su historial (`signal_received`).
2. Las de gravedad `high` y `critical` generan el aviso `signal_alert`, sin correo, para:
   - los responsables del sistema;
   - si no los hay, el Administrador, el Responsable del SGAI, el CAIO y el Analista de riesgos.
3. Las `critical` crean además una tarea de prioridad crítica, enlazada en `signals.task_id`.

> TODO: confirmar el despacho de las señales de las tareas programadas. Las de presupuesto y discordancia
> se insertan sin pasar por `dispatchSignal`: no dejan rastro en el historial, no generan aviso en la app
> ni crean tarea, aunque sean críticas.

### Avisos en la app y correo

`createNotification` guarda siempre el aviso en `fluxion.notifications`: destinatario, tipo, título,
texto, enlace y tarea relacionada.

El correo solo se envía con Resend y si se cumplen todas estas condiciones:
- el aviso es de una tarea, con título y tarea relacionada;
- hay email del destinatario;
- la preferencia lo permite;
- `RESEND_API_KEY` está configurada.

| Tipo | Origen | Correo |
|---|---|---|
| `task_assigned` | Tarea asignada o reasignada | Sí |
| `status_changed` | Cambio de estado, a los seguidores | Sí |
| `mention`, `comment_added`, `attachment_added` | Comentarios y adjuntos de tareas | Sí |
| `incident_reported` | Alta de incidente, a los roles de gobierno | No |
| `incident_deadline` | Umbrales del plazo del Art. 73 | No |
| `authority_request_deadline` | Plazo de un requerimiento de la autoridad próximo o vencido (B25e) | No |
| `review_due` | Revisiones de tratamiento próximas o vencidas | No |
| `signal_alert` | Señal alta o crítica | No |
| `approval_pending`, `approval_closed` | Flujos de aprobación | No |

> TODO: confirmar varios comportamientos del correo y de las preferencias.
> - **Correo de aprobaciones:** no llega a enviarse, porque solo se envía en avisos de tareas.
> - **Preferencias:** Ajustes y Perfil las guardan con estructuras distintas, y el envío no lee ninguna
>   de las dos, así que el correo siempre se envía.
> - **Preferencia de aviso en la app:** no se comprueba.
> - **Guardar el perfil:** sobrescribe las preferencias guardadas desde Ajustes.

### Canales Slack y Teams

**Configuración:**
- La URL del canal se guarda cifrada en Vault.
- Cada canal se suscribe a una lista de eventos; si la lista está vacía, recibe todos.
- Se configuran en **Ajustes › Canales**, por el Administrador o el Responsable del SGAI.

**Eventos:**

| Evento | Etiqueta en Ajustes |
|---|---|
| `incident.created` | Incidente registrado |
| `incident.deadline_half` | Mitad del plazo de notificación |
| `incident.deadline_urgent` | 80 % del plazo consumido |
| `incident.deadline_overdue` | Plazo de notificación vencido |
| `authority_request.deadline_soon` | Requerimiento de la autoridad: plazo próximo |
| `authority_request.deadline_overdue` | Requerimiento de la autoridad: plazo vencido |
| `cost.budget_threshold` | Presupuesto de IA superado |
| `hitl.discordance_spike` | Sube la discordancia humana |
| `approval.pending` | — (no aparece en la lista) |

**Formato:**
- **Slack:** `{"text": "<emoji> *<título>*\n<texto>\n<url|Abrir en Fluxion>"}`. El emoji depende del
  nivel: ℹ️ info, ⚠️ warning, 🚨 critical.
- **Teams:** tarjeta `MessageCard` con color por nivel y el botón «Abrir en Fluxion».

**Envío:**
- `enqueueChannelMessage` guarda la entrega e intenta enviarla en el momento.
- El tiempo máximo es de 10 segundos.
- Una entrega fallida se reintenta, hasta 5 veces, la próxima vez que se envía algo a esa organización.

> TODO: confirmar varios comportamientos de los canales.
> - **Reintentos:** no hay espera entre reintentos. Un fallo puede no reintentarse nunca si no se envía
>   nada más a la organización.
> - **`approval.pending`:**
>   - solo lo reciben los canales suscritos a todos los eventos;
>   - su enlace es relativo y no funciona en Slack ni en Teams.
> - **Teams:** el formato `MessageCard` probablemente no es compatible con los webhooks creados con Power
>   Automate.

## Modelo de datos

| Objeto | Tipo | Campos clave | Migración |
|---|---|---|---|
| `fluxion.signals` | tabla | Ver [API de ingesta](api-ingesta.md#modelo-de-datos) | `20260812090000_signals_core.sql` |
| `fluxion.notifications` | tabla | `recipient_id` (`profiles.id`), `type`, `title`, `body`, `link_url`, `related_task_id`, `metadata`, `read_at` | `00000000000001_schema.sql` |
| `fluxion.notification_channels` | tabla | `channel_type` (`slack`, `teams`), `name`, `secret_id` (Vault), `events`, `is_active`, `last_success_at`, `last_error` | `20260818190000_incidents_alerts_channels.sql` |
| `fluxion.channel_deliveries` | tabla | `channel_id`, `event_type`, `payload`, `status` (`pending`, `sent`, `failed`, `abandoned`), `attempts` | ídem |
| `fluxion.incident_deadline_alerts` | tabla | Umbral ya avisado por incidente | ídem |
| `fluxion.authority_request_deadline_alerts` | tabla | Umbral ya avisado por requerimiento y plazo (B25e) | `20261028130000` |
| `telemetry.cost_budget_alerts` | tabla | Umbral ya avisado por presupuesto y mes | `20260823090000_telemetry_budgets.sql` |
| `fluxion.evidence_expiry_alerts` | tabla | Alerta de caducidad viva por evidencia | — |

## API

### Matriz de eventos

| Evento de negocio | Señal | Aviso en app | Correo | Canal | Webhook |
|---|---|---|---|---|---|
| Tarea asignada o reasignada | — | `task_assigned` | Sí | — | — |
| Cambio de estado de tarea | — | `status_changed` | Sí | — | `task.completed` al completarla |
| Mención, comentario o adjunto | — | Sí | Sí | — | — |
| Incidente registrado | — | `incident_reported` | — | `incident.created` | — |
| Plazo del incidente al 50 %, al 80 % o vencido | — | `incident_deadline` | — | `incident.deadline_*` | — |
| Presupuesto de IA alcanzado | `cost.budget_threshold` | — | — | `cost.budget_threshold` | — |
| Sube la discordancia humana | `hitl.discordance_spike` | — | — | `hitl.discordance_spike` | — |
| Señal alta o crítica recibida | Sí | `signal_alert` (y tarea si es crítica) | — | — | — |
| Aprobación abierta o que avanza | — | `approval_pending` | — | `approval.pending` | `approval.pending` |
| Aprobación aprobada o rechazada | — | `approval_closed` | — | — | `approval.approved` / `.rejected` |
| Revisión de tratamiento próxima o vencida | — | `review_due` | — | — | — |
| Evidencia próxima a caducar | — | — (banner) | — | — | — |

### Tareas programadas que avisan

| Tarea | Cuándo | Qué hace |
|---|---|---|
| `evidence-expiry` | Diaria, 07:00 UTC | Alertas a 30 días, a 7 días y vencida, en `evidence_expiry_alerts`, que alimentan el banner de evidencias. Marca como caducadas las evidencias vencidas |
| `review-reminders` | Lunes, 08:00 UTC | `review_due` a cada responsable de acciones aceptadas o diferidas con revisión en 30 días o vencida |
| `incident-deadlines` | Cada hora | `incident_deadline` y canal en cada umbral, una sola vez |
| `authority-request-deadlines` | Diario | `authority_request_deadline` y canal con 5 días o menos y al vencer, una vez por plazo |
| `cost-budgets` | Cada hora | Señal y canal al alcanzar el umbral más alto nuevo |
| `hitl-discordance` | Diaria, 06:30 UTC | Señal y canal por sistema, una por semana |
| `outbox` | Cada 5 min | Webhooks salientes |

> TODO: confirmar el aviso de caducidad de evidencias. `infra/schedules/README.md` dice que genera
> notificaciones, pero solo alimenta el banner.

Ver [Tareas programadas](tareas-programadas.md).

## Dependencias

| Dependencia | Uso | Si no está disponible |
|---|---|---|
| Resend | Correo | Sin `RESEND_API_KEY` no se envía, sin aviso |
| Slack / Microsoft Teams | Canales | Entrega `failed` y error en el canal |
| Vault | URL de los canales | Entrega fallida |

## Seguridad

- **Canales:** la URL de cada canal está en Vault, y solo la leen las funciones del service role.
- **Avisos en la app:** los recibe un perfil concreto. Su RLS limita la lectura al destinatario.

Ver [Seguridad](seguridad.md).

## Configuración

| Variable | Obligatoria | Valor por defecto | Descripción |
|---|---|---|---|
| `RESEND_API_KEY` | Para correo | — | Clave de Resend |
| `RESEND_FROM_EMAIL` | Para correo | — | Remitente |
| `NEXT_PUBLIC_APP_URL` | Sí | — | Base de los enlaces de los avisos |
| `CRON_SECRET` | Sí | — | Tareas programadas |
