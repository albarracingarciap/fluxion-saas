---
id: FUN-TAREAS-RECURRENTES
titulo: Tareas recurrentes
tipo: funcional
modulo: tareas
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/tareas/recurrentes/page.tsx
  - apps/web/components/tasks/RecurrentTasksView.tsx
  - apps/web/app/(app)/tareas/actions.ts
  - supabase/migrations/00000000000001_schema.sql
  - supabase/migrations/00000000000004_cron_jobs.sql
---

# Tareas recurrentes

Programaciones que crean [tareas](../glosario.md#tarea) automáticamente con una frecuencia fija.

## Propósito

Automatizar las tareas periódicas del SGAI, como revisiones mensuales o auditorías anuales. La vista dice:
«Tareas que se crean automáticamente según una programación. Procesadas cada hora.».

## Acceso y permisos

- **Ruta:** `/tareas/recurrentes`
- **Navegación:** botón **Recurrentes** de [Tareas](tareas.md). No tiene entrada en el menú.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Recurrencias de la organización | Crear, editar, pausar, ejecutar y eliminar |

> **Pendiente de definir.** Qué roles pueden mantener las tareas recurrentes.

## Campos

**Lista**, en dos secciones: **Activas (N)** y **Pausadas**.

**Cada tarjeta:**
- título y prioridad;
- frecuencia en texto: «Cada día», «Cada lunes», «Cada 2 semanas», «El día N de cada mes», «Cada
  trimestre» o «El N de {mes}»;
- **Próxima** (en rojo si ya pasó) y **Última** ejecución;
- sistema, asignado y plantilla;
- etiquetas.

Sin recurrencias: «Sin tareas recurrentes».

**Formulario:**

| Campo | Tipo | Obligatorio | Descripción y valores | Origen (`fluxion.task_recurrences.`) |
|---|---|---|---|---|
| **Título de la tarea** | texto | Sí | Hasta 300 caracteres. Admite las variables `{{date}}`, `{{month}}`, `{{year}}` y `{{quarter}}` | `title` |
| **Frecuencia** | selección | Sí | Diaria · Semanal · Quincenal · Mensual (por defecto) · Trimestral · Anual | `frequency` |
| **Día de la semana** | botones | Si es semanal | Lun a Dom | `day_of_week` |
| **Día del mes** | número | Si es mensual o anual | 1-31. «Si el mes tiene menos días se usará el último día disponible.» | `day_of_month` |
| **Mes del año** | selección | Si es anual | — | `month_of_year` |
| **Días hasta vencimiento** | número | No | 0-365, desde la creación. Por defecto 7 | `due_offset_days` |
| **Prioridad** | selección | No | — | `priority` |
| **Plantilla (checklist)** | selección | No | Copia la lista de comprobación de la plantilla | `template_id` |
| **Sistema IA**, **Asignado a**, **Descripción**, **Etiquetas** | — | No | — | — |

**Historial de ejecuciones:** hasta 15 ejecuciones, cada una «Manual» o «Automático», con enlace a la
tarea creada.

**Generación:**
- cada hora, en el minuto 5, se crean las tareas de las recurrencias activas cuya próxima ejecución ha
  llegado;
- las ejecuciones son a las 08:00 UTC;
- si se han saltado varios periodos, se crea una sola tarea;
- la tarea se crea como «Manual».

> TODO: confirmar varias reglas de la generación.
> - **Frecuencia anual:** usa como mucho el día 28, en contra del texto de ayuda.
> - **Frecuencia trimestral:** ignora el día del mes.
> - **Editar la frecuencia o los días:** no recalcula la próxima ejecución.
> - **Ejecutar ahora:** no avanza la próxima ejecución, así que la tarea puede duplicarse en la siguiente
>   pasada automática.
> - **Mensajes en las pausadas:** el mensaje de resultado no aparece en las tarjetas pausadas.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Nueva recurrencia** / **Editar** › **Guardar** | Todos | Crea o actualiza la recurrencia | Al crearla, calcula la próxima ejecución |
| **Pausar** / **Activar** | Todos | Activa o desactiva la recurrencia | Al reactivarla, si la próxima ejecución ya pasó, la tarea se crea en la siguiente pasada |
| **Ejecutar ahora** | Todos | Crea la tarea en el momento, también si está pausada | «✓ Tarea creada correctamente». Avisa al asignado. Registra la ejecución manual |
| **Historial** | Todos | Muestra las ejecuciones | — |
| **Eliminar** | Todos | Pide confirmación («¿Eliminar X? Se perderá el historial.») y la elimina | — |

## Validaciones

Título y frecuencia obligatorios. Los errores se muestran como «Error: …».

## Estados

Cada recurrencia está activa o pausada.

## Vistas relacionadas

- [Tareas](tareas.md), [Plantillas de tareas](tareas-plantillas.md).
- Negocio: [Tareas](../negocio/tareas.md).
