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
  - apps/web/app/(app)/incidentes/pestanas.tsx
  - apps/web/app/(app)/incidentes/requerimientos/actions.ts
  - apps/web/app/(app)/incidentes/requerimientos/requerimientos-client.tsx
  - apps/web/app/(app)/incidentes/requerimientos/[id]/requerimiento-detalle.tsx
  - apps/web/lib/governance/authority-requests.ts
  - supabase/migrations/20261028120000_requerimientos_autoridad.sql
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
- **Pestañas** (B25d): **Incidentes** (`/incidentes`, esta vista) y **Requerimientos**
  (`/incidentes?tab=requerimientos`, ver [Requerimientos de la autoridad](#pestaña-requerimientos)). La pestaña
  Requerimientos muestra un contador de los requerimientos recibidos o en preparación.

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

## Pestaña Requerimientos

Requerimientos de una autoridad (B25d, AI Act, Art. 26.12; decisión 4): peticiones de información o medidas
correctoras con un plazo. No son incidentes y su plazo no es el del Art. 73. Cualquier miembro los consulta;
los registran y gestionan los roles de gobierno (los mismos que los incidentes).

**Lista**, de la recepción más reciente a la más antigua: referencia (REQ-AAAA-NNN, automática), qué se pide,
estado, autoridad, tipo, fecha de recepción, sistemas afectados y plazo. Encima, «N con el plazo vencido» si los
hay.

| Plazo | Texto | Color |
|---|---|---|
| Respondido o Cerrado | «Respondido» | Verde |
| Sin fecha límite | «Sin plazo indicado» | Gris |
| Más de 5 días | «Quedan N días · vence el …» | Normal |
| 5 días o menos | «Quedan N días» o «Vence hoy» | Naranja |
| Pasado | «Plazo vencido hace N días» | Rojo |

**Registrar requerimiento** (roles de gobierno):

| Campo | Obligatorio | Descripción | Origen (`authority_requests.`) |
|---|---|---|---|
| **Autoridad** | Sí | Por ejemplo, «AESIA» | `authority` |
| **Su referencia** | No | Número de expediente de la autoridad | `authority_reference` |
| **Tipo** | Sí | Solicitud de información · Medidas correctoras · Otro | `kind` |
| **Qué se pide** | Sí | — | `title` |
| **Detalle** | No | Alcance, medidas exigidas, forma de respuesta | `description` |
| **Recibido** | Sí | No futura; por defecto, hoy | `received_at` |
| **Plazo de respuesta** | No | No anterior a la recepción | `due_at` |
| **Responsable** | No | Miembro de la organización | `owner_id` |
| **Incidente relacionado** | No | Incidente de la organización | `incident_id` |
| **Sistemas afectados** | No | Sistemas del inventario | `authority_request_systems` |

Al registrarlo se abre su detalle, se crea la [tarea](../glosario.md#tarea) «Responder al requerimiento {ref}
({autoridad})», de prioridad alta, con el plazo como fecha límite, asignada al responsable y con origen
«Requerimiento de la autoridad», y en el historial de cada sistema afectado queda «Requerimiento de la autoridad ·
{ref}».

**Detalle del requerimiento** (`/incidentes/requerimientos/{id}`): cabecera con la autoridad, su referencia, el
tipo, la fecha de recepción, el detalle, los sistemas afectados (enlace a su ficha) y el incidente relacionado; el
plazo; y dos secciones:

| Sección | Contenido | Quién edita |
|---|---|---|
| **Gestión y respuesta** | **Estado** (Recibido · En preparación · Respondido · Cerrado), plazo, responsable, **Respuesta**, **Fecha de la respuesta** y **Evidencias de la respuesta** (de la biblioteca, con buscador; las no validadas se marcan). **Guardar** | Gobierno |
| **Tareas (N)** | Tareas del requerimiento con su estado y fecha; **+ Añadir** crea otra con título y fecha límite | Gobierno |

Para pasar a Respondido o Cerrado hacen falta la fecha y el resumen de la respuesta: «Indica la fecha de la
respuesta para marcarlo como respondido o cerrado.», «Resume qué se respondió.». Al pasar a respondido queda en el
historial de los sistemas afectados «Requerimiento respondido · {ref}». Al cerrar se guarda la fecha de cierre.
Otros errores: «Indica la autoridad que lo emite.», «Indica qué se pide.», «El plazo no puede ser anterior a la
recepción.», «La respuesta no puede ser anterior a la recepción.», «Solo los roles de gobierno pueden gestionar los
requerimientos de la autoridad.».

> TODO: confirmar si los requerimientos necesitan avisos de plazo propios. Hoy el recordatorio es el de la tarea
> «Responder…», con el plazo como fecha límite; no hay avisos como los del reloj del Art. 73.

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
