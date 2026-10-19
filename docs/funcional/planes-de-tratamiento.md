---
id: FUN-PLANES
titulo: Planes de tratamiento
tipo: funcional
modulo: plan-de-tratamiento
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/planes/page.tsx
  - apps/web/app/(app)/planes/plans-view-client.tsx
  - apps/web/lib/treatment-plans/data.ts
  - apps/web/lib/treatment-plans/csv.ts
---

# Planes de tratamiento

Listado de todos los [planes de tratamiento](../glosario.md#plan-de-tratamiento) de la organización, con
indicadores, filtros y exportación.

## Propósito

Seguir de forma transversal la ejecución de los planes y priorizar por estado, zona, sistema o
vencimiento.

## Acceso y permisos

- **Ruta:** `/planes`. Con `?superseded=1` muestra también los reemplazados.
- **Navegación:** **Evaluación › Planes de tratamiento**. También desde el [Dashboard](dashboard.md).
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Todos los planes de la organización | Filtrar, exportar, abrir un plan |

## Campos

### Indicadores

Se calculan sobre toda la organización y no cambian con los filtros:

| Indicador | Cálculo |
|---|---|
| **Activos** | Borrador, en aprobación, aprobados o en ejecución |
| **En aprobación** | — |
| **Planes vencidos** | Activos con fecha límite pasada |
| **Progreso medio** | Media del % de acciones completadas de los activos |
| **Cerrados** · **Total** | El total no incluye los reemplazados |
| **Acciones vencidas** | Acciones no cerradas con fecha objetivo pasada |
| **Tasa slippage** | Mitigaciones cerradas sin alcanzar el objetivo residual |
| **Mediana cierre** | De los planes cerrados |
| **Revisiones pendientes** | Acciones aceptadas o pospuestas con revisión en 30 días o vencida |

### Filtros

Se guardan en la URL.

| Filtro | Valores |
|---|---|
| Búsqueda | Código, sistema o ID interno |
| Sistema · Aprobador | Uno de la lista |
| Orden | Deadline ↑ (por defecto) · Deadline ↓ · Progreso ↓ · Progreso ↑ · Creación ↓ · Actualización ↓ |
| **Estado** | Borrador · En aprobación · Aprobado · En ejecución · Cerrado (varios) |
| **Zona al crear** | Zona I a IV |
| **Nivel de aprobación** | Nivel 1 · Nivel 2 · Alta dirección |
| **Vencimiento** | Vencidos · Próx. 30 días · Próx. 90 días · Sin fecha |
| **Revisiones** | Con revisiones |

### Tabla

Se muestran 30 por página.

| Columna | Contenido |
|---|---|
| **Sistema** | Nombre (enlace al plan), código del sistema, versión FMEA, nivel AI Act |
| **Plan** | Código |
| **Estado** | Borrador · En aprobación · Aprobado · En ejecución · Cerrado · Reemplazado |
| **Zona / modos** | Zona al crear y número de modos de Zona I y II |
| **Owner / Aprobación** | Responsable más frecuente de las acciones, nivel y aprobador, revisiones pendientes |
| **Progreso** | Barra y «x/y acciones» |
| **Fecha límite** | «Vencido hace N d», «Hoy» o «En N d» |

> TODO: confirmar los nombres de aprobador y responsable y el filtro por aprobador. Pueden aparecer vacíos
> o no funcionar, porque los planes guardan un identificador de usuario y la lista busca por otro.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| Pulsar un plan | Todos | Navega al [Plan de tratamiento](plan-de-tratamiento.md) | — |
| **Exportar CSV (n)** | Todos | Descarga `planes-tratamiento.csv` con los planes filtrados (22 columnas: código, sistema, estado, zonas, nivel, aprobador, acciones, progreso, fechas…) | — |
| **Limpiar filtros** | Todos | Quita los filtros | También quita «Mostrar reemplazados» |
| **Mostrar reemplazados** / **Ocultar reemplazados** | Todos | Cambia el listado | — |
| **N revisiones pendientes** | Todos | Navega a [Revisiones pendientes](revisiones-pendientes.md) | — |

## Validaciones

No aplica.

## Estados

Ver [Plan de tratamiento](plan-de-tratamiento.md#estados).

Mensajes cuando no hay nada que mostrar:
- **Sin planes:** «Aún no hay planes de tratamiento».
- **Sin resultados:** «Ningún plan coincide con los filtros aplicados».

## Vistas relacionadas

- [Plan de tratamiento](plan-de-tratamiento.md), [Revisiones pendientes](revisiones-pendientes.md),
  [Evaluaciones](evaluaciones.md).
- Negocio: [Plan de tratamiento](../negocio/plan-de-tratamiento.md).
