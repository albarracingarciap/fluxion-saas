---
id: FUN-TAREAS-CALENDARIO
titulo: Calendario de tareas
tipo: funcional
modulo: tareas
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/tareas/calendario/page.tsx
  - apps/web/components/tasks/CalendarView.tsx
---

# Calendario de tareas

Calendario mensual de las [tareas](../glosario.md#tarea) según su fecha límite.

## Propósito

Ver qué vence cada día y crear tareas con fecha.

## Acceso y permisos

- **Ruta:** `/tareas/calendario`
- **Navegación:** botón **Calendario** de [Tareas](tareas.md). No tiene entrada en el menú.
- **Disponibilidad:** Core.

Permisos como en [Tareas](tareas.md#acceso-y-permisos).

## Campos

- **Cabecera:** **← Tareas**, mes y año, flechas para cambiar de mes y botón **Hoy**.
- **Cuadrícula:** de lunes a domingo, con hasta tres tareas por día y «+N más».
- **Cada tarea:**
  - punto de color según la prioridad;
  - en rojo si está vencida;
  - en gris y tachada si está completada o cancelada.
- **Sin fecha de vencimiento (N):** tareas sin fecha que no están completadas ni canceladas.

La vista no tiene filtros.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **+** en un día | Con permiso | Abre **Crear tarea** con esa fecha límite | — |
| Pulsar una tarea | Todos | Abre su ficha, como en [Tareas](tareas.md#campos) | — |
| ‹ › / **Hoy** | Todos | Cambian de mes | — |

> TODO: confirmar dos comportamientos.
> - **Cambios en la ficha:** el calendario no se actualiza hasta recargar la página.
> - **Días pasados:** el **+** aparece, pero el formulario no deja guardar porque la fecha es anterior a
>   hoy.

## Validaciones

Las de [Tareas](tareas.md#validaciones).

## Estados

Ver [Tareas](tareas.md#estados).

## Vistas relacionadas

- [Tareas](tareas.md), [Kanban](kanban.md).
- Negocio: [Tareas](../negocio/tareas.md).
