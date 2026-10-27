---
id: FUN-INCIDENTES
titulo: Incidentes
tipo: funcional
modulo: incidentes
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/incidentes/page.tsx
  - apps/web/app/(app)/incidentes/incidentes-client.tsx
  - apps/web/app/(app)/incidentes/deadline-clock.tsx
  - apps/web/app/(app)/incidentes/actions.ts
  - apps/web/components/layout/sidebar.tsx
  - supabase/migrations/20260818170000_incidents_core.sql
  - apps/web/lib/ai-systems/notices.ts
---

# Incidentes

Registro de los [incidentes](../glosario.md#incidente) de IA de la organización y control de sus
[plazos de notificación](../glosario.md#plazo-de-notificación).

## Propósito

Dar parte de un incidente cuanto antes, sin necesidad de clasificarlo, porque el plazo del AI Act cuenta
desde que la organización tiene conocimiento del hecho. La vista dice: «Registro de incidentes y control
de los plazos de notificación del artículo 73 del AI Act. El reloj empieza cuando la organización tiene
conocimiento del hecho, no cuando se establece la causa.».

## Acceso y permisos

- **Ruta:** `/incidentes`
- **Menú:** **Incidentes**, con un contador de los [incidentes graves](../glosario.md#incidente-grave)
  cuya notificación está pendiente o solo es inicial.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Todos los incidentes de la organización | Dar parte |

## Campos

**Indicadores** (solo si son mayores que cero):

| Indicador | Condición |
|---|---|
| «N sin clasificar» | Incidente no grave con notificación pendiente |
| «N con plazo de notificación vivo» | Incidente grave con notificación pendiente o inicial enviada |

> TODO: confirmar el indicador «sin clasificar». Siempre vale cero, porque un incidente no grave pasa
> automáticamente a «sin obligación de notificar». Hoy no se distingue un incidente sin clasificar de uno
> clasificado como no grave.

**Lista**, de más reciente a más antiguo. No tiene filtros, búsqueda ni paginación.

| Campo | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|
| Referencia | INC-AAAA-NNN, asignada automáticamente | `ai_incidents.reference` |
| Título | Enlace al [Detalle de incidente](incidente-detalle.md) | `title` |
| Estado | Abierto · En investigación · Contenido · Cerrado | `status` |
| «incidente grave» | Marca si es grave | `is_serious` |
| Sistemas | Sistemas afectados, separados por « · » | `ai_incident_systems` |
| Reloj del plazo | Ver abajo | `notification_deadline`, `notification_status` |
| «Aviso al proveedor pendiente (Art. 26.5)» | Incidente grave, no cerrado, con **Nuestro rol** Responsable del despliegue y sin aviso al proveedor (B25b) | `reporter_role`, `external_notices` |

**Reloj del plazo:**

| Situación | Texto |
|---|---|
| Notificación completa enviada | «Notificado a la autoridad» |
| Incidente no grave | «Sin obligación de notificar» |
| Incidente grave | «Quedan N días/h para notificar» o «Plazo vencido hace …», con la fecha de vencimiento y una barra en verde, naranja (desde el 50 %) o rojo (desde el 80 % o vencido) |

El reloj se calcula al cargar la página y no avanza solo.

Si no hay incidentes: «No hay incidentes registrados. Ojalá siga así.».

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Dar parte** | Todos | Abre el formulario **Dar parte de un incidente** | — |
| **Registrar incidente** | Todos | `reportIncident`: crea el incidente con la fecha de conocimiento igual a ahora y propone **Nuestro rol**: Responsable del despliegue si en ningún sistema afectado la organización es proveedora (`value_chain_roles`), si no Proveedor (B25b) | Asigna la referencia. [Aviso en la app](../glosario.md#aviso-en-la-app) «Incidente registrado · {ref}» a los roles de gobierno. [Aviso a Slack/Teams](../glosario.md#aviso-a-slackteams) «… pendiente de clasificar» |
| Pulsar un incidente | Todos | Abre su detalle | — |

**Formulario Dar parte de un incidente:**

| Campo | Tipo | Obligatorio | Descripción | Origen |
|---|---|---|---|---|
| **Qué ha ocurrido** | texto | Sí | Por ejemplo, «El motor de scoring denegó crédito de forma sistemática durante 6 horas» | `title` |
| **Detalle** | texto largo | No | Cronología, alcance, personas afectadas, medidas inmediatas | `description` |
| **Cuándo ocurrió (si se sabe)** | fecha y hora | No | — | `occurred_at` |
| **Sistemas afectados** | casillas | No | Sistemas del inventario | `ai_incident_systems` |

Roles de gobierno: Administrador, Responsable del SGAI, CAIO, DPO, Analista de riesgos y Analista de
cumplimiento.

> TODO: confirmar varios aspectos del alta.
> - **Mensaje de confirmación:** no hay; el formulario se cierra.
> - **Integraciones salientes:** el alta no se envía a las
>   [integraciones salientes](../glosario.md#integración-saliente-webhook).
> - **Borrado:** los incidentes no se pueden borrar.

> **Pendiente de implementar.**
> - Alta de incidentes desde una [señal de riesgo](../glosario.md#señal-de-riesgo) o por la API de
>   ingesta. El vínculo con la señal existe en los datos, pero nada lo rellena.
> - Integración con herramientas ITSM.

## Validaciones

| Situación | Mensaje |
|---|---|
| Título vacío | Botón deshabilitado; en servidor, «El título es obligatorio.» |
| Error al guardar | «Error al registrar: …», con el mensaje de la base de datos |

> TODO: confirmar los límites del título. Admite hasta 300 caracteres; al superarlo, y si dos altas
> simultáneas reciben la misma referencia, se muestra el error técnico.

## Estados

Ver [Detalle de incidente](incidente-detalle.md#estados).

## Vistas relacionadas

- [Detalle de incidente](incidente-detalle.md).
- [Ajustes](ajustes.md), pestaña de canales de Slack y Teams.
- [Notificaciones](notificaciones.md).
- Negocio: [Incidentes](../negocio/incidentes.md).
