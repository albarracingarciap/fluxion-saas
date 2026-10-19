---
id: FUN-TAREAS-PLANTILLAS
titulo: Plantillas de tareas
tipo: funcional
modulo: tareas
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/tareas/plantillas/page.tsx
  - apps/web/components/tasks/PlantillasView.tsx
  - apps/web/app/(app)/tareas/actions.ts
  - supabase/migrations/00000000000001_schema.sql
---

# Plantillas de tareas

Mantenimiento de plantillas reutilizables para crear [tareas](../glosario.md#tarea) con prioridad,
etiquetas y lista de comprobación predefinidas.

## Propósito

Agilizar la creación de tareas repetitivas: la plantilla rellena los datos y genera la lista de
comprobación.

## Acceso y permisos

- **Ruta:** `/tareas/plantillas`
- **Navegación:** botón **Plantillas** de [Tareas](tareas.md). No tiene entrada en el menú.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Plantillas de la organización y del sistema | Crear; editar y eliminar las propias |

## Campos

**Secciones:**
- **Mis plantillas**;
- **Plantillas del sistema (solo lectura)**, predefinidas por Fluxion.

**Cada tarjeta:**
- nombre y prioridad;
- ámbito: Sistema, Compartida o Personal;
- descripción y etiquetas;
- «N ítems», desplegable, con la marca «req.» en los ítems requeridos.

Sin plantillas propias: «Sin plantillas propias».

**Formulario:**

| Campo | Tipo | Obligatorio | Descripción | Origen (`fluxion.task_templates.`) |
|---|---|---|---|---|
| **Nombre** | texto | Sí | Hasta 200 caracteres | `name` |
| **Visibilidad** | selección | Sí | Personal (por defecto) · Compartida | `scope` |
| **Descripción** | texto | No | — | `description` |
| **Prioridad por defecto** | selección | Sí | Media por defecto | `default_priority` |
| **Etiquetas** | etiquetas | No | — | `default_tags` |
| **Checklist de la plantilla** | lista | No | Ítems, cada uno con la casilla **Req.** | `checklist` |

> TODO: confirmar varias reglas de las plantillas.
> - **Plantillas personales:** las ven todos los miembros de la organización.
> - **Plantillas ajenas:** la vista ofrece editarlas y borrarlas, pero el cambio no se guarda y no avisa.
> - **Ítems requeridos:** no se aplican en las tareas.
> - **Archivar:** no se puede archivar una plantilla.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Nueva plantilla** / editar | Todos | Abre el formulario. **Guardar plantilla** la guarda | — |
| Eliminar | Autor | Pide confirmación («¿Eliminar X? Esta acción no se puede deshacer.») y la elimina | — |

**Uso de las plantillas:**
- **En [Tareas](tareas.md):** **Nueva tarea › Desde plantilla** toma el título, la descripción, la
  prioridad, las etiquetas y la lista de comprobación.
- **En [Tareas recurrentes](tareas-recurrentes.md):** se usa solo la lista de comprobación.

La tarea creada no conserva ningún vínculo con la plantilla.

## Validaciones

Nombre obligatorio. Los errores del servidor se muestran tal cual o como «Error desconocido».

## Estados

No aplica.

## Vistas relacionadas

- [Tareas](tareas.md), [Tareas recurrentes](tareas-recurrentes.md).
- Negocio: [Tareas](../negocio/tareas.md).
