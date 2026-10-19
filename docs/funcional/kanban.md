---
id: FUN-KANBAN
titulo: Kanban
tipo: funcional
modulo: tareas
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/kanban/page.tsx
  - apps/web/components/tasks/KanbanView.tsx
  - apps/web/app/(app)/tareas/actions.ts
  - apps/web/lib/tasks/types.ts
---

# Kanban

Tablero de las [tareas](../glosario.md#tarea) por estado, con límites de trabajo en curso.

## Propósito

Mover las tareas entre estados y ordenarlas arrastrándolas. La vista dice: «Arrastra entre columnas para
cambiar estado · arrastra dentro de la columna para reordenar».

## Acceso y permisos

- **Ruta:** `/kanban`
- **Menú:** **Kanban**, en el grupo Seguimiento. La vista no enlaza con [Tareas](tareas.md); solo tiene
  **Volver al dashboard**.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Roles con permiso de edición de tareas (ver [Tareas](tareas.md#acceso-y-permisos)) | Sí | Mover, reordenar, crear |
| Administrador | Ídem | Configurar los límites WIP |
| Directivo, Auditor, Lector | Sí | Ninguna |

Si un rol no tiene permiso, el movimiento o los límites no se guardan y la vista no avisa.

## Campos

**Columnas:** Pendiente, En progreso, Bloqueada, En revisión y Completada. Las tareas canceladas no
aparecen.

**Tarjeta:**
- título y prioridad;
- dos etiquetas;
- sistema;
- nombre del asignado;
- fecha límite, en rojo si está vencida.

Al pulsarla se abre la misma ficha que en [Tareas](tareas.md#campos).

**Filtros:**
- **Buscar tarea...**;
- prioridad y asignado;
- **Mis tareas**.

**Carriles:** **Sin agrupar**, **Prioridad** o **Asignado**.

**Límites WIP:** número máximo de tareas por columna, 0 para no limitar.
- El contador «n/límite» se pinta en naranja al alcanzar el límite y en rojo al superarlo.
- El límite no impide mover tareas.

Columna vacía: «Arrastra aquí».

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| Arrastrar a otra columna | Con permiso | `reorderTaskAction`: cambia estado y posición | Al completar, guarda la fecha de cierre |
| Arrastrar dentro de la columna | Con permiso | Reordena | — |
| **WIP** › **Guardar** | Administrador | Guarda los límites de la organización | `organizations.kanban_wip_limits` |
| **Nueva tarea** | Con permiso | Abre **Crear tarea**, como en [Tareas](tareas.md#acciones) | — |

> TODO: confirmar varios efectos del arrastre.
> - **Rastro y avisos:** no registra actividad, no avisa a los seguidores y no envía `task.completed` a
>   las integraciones salientes.
> - **Reordenar con filtros:** el orden se calcula sobre las tareas filtradas.
> - **Reequilibrado de posiciones:** cuando no queda hueco entre dos tarjetas, es probable que falle.

> **Pendiente de implementar.** Enviar el evento de tarea completada al completar desde el tablero.

## Validaciones

Límites WIP entre 0 y 999. Si falla el guardado de un movimiento, la tarjeta vuelve a su sitio.

## Estados

Ver [Tareas](tareas.md#estados).

## Vistas relacionadas

- [Tareas](tareas.md), [Calendario de tareas](tareas-calendario.md).
- Negocio: [Tareas](../negocio/tareas.md).
