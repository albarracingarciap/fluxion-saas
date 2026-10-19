---
id: FUN-TAREAS-METRICAS
titulo: Métricas de tareas
tipo: funcional
modulo: tareas
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/tareas/metricas/page.tsx
  - apps/web/components/tasks/MetricsView.tsx
  - apps/web/lib/tasks/metrics.ts
---

# Métricas de tareas

Indicadores de cumplimiento y rendimiento de las [tareas](../glosario.md#tarea) de la organización.

## Propósito

Medir el avance y la puntualidad del trabajo de cumplimiento: cuánto se cierra, cuánto se cierra a tiempo
y dónde se acumulan las tareas.

## Acceso y permisos

- **Ruta:** `/tareas/metricas`
- **Navegación:** botón **Métricas** de [Tareas](tareas.md). No tiene entrada en el menú.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Solo consulta |

## Campos

La vista se titula **Métricas de cumplimiento** y usa todas las tareas, sin filtros.

| Indicador | Cálculo |
|---|---|
| **Total** | Número de tareas. Subtexto: activas (pendientes, en progreso, bloqueadas y en revisión) |
| **Completadas** | Tareas completadas, y su porcentaje sobre el total (incluidas las canceladas) |
| **Vencidas** | Con fecha límite pasada y sin completar ni cancelar |
| **SLA cumplimiento** | Completadas a tiempo / completadas, en %. A tiempo: cerrada en su fecha límite o antes, o sin fecha límite. Si no hay ninguna completada, 100 %. Verde desde el 80 % |
| **Por estado** · **Por prioridad** · **Por origen** | Número y porcentaje sobre el total |
| **Tiempo de cierre (SLA)** | Barras «A tiempo» y «Tarde» |
| **Por sistema (top 5)** | Los cinco sistemas con más tareas: completadas, vencidas y % completado |
| **Tendencia semanal (8 semanas)** | Tareas creadas y completadas por semana |

> TODO: confirmar el criterio de «SLA cumplimiento». Cuenta como a tiempo las tareas sin fecha límite, y
> sin tareas cerradas da 100 %.

> TODO: confirmar el origen de las tareas generadas por plantillas y recurrencias. Cuentan como «Manual».

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **← Tareas** | Todos | Vuelve a [Tareas](tareas.md) | — |

## Validaciones

No aplica.

## Estados

No aplica.

## Vistas relacionadas

- [Tareas](tareas.md).
- Negocio: [Tareas](../negocio/tareas.md).
