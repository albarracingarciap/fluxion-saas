---
id: FUN-BRECHAS-INSTANTANEAS
titulo: Instantáneas de brechas
tipo: funcional
modulo: brechas
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/gaps/snapshots/page.tsx
  - apps/web/app/(app)/gaps/snapshots/compare-selector.tsx
  - apps/web/app/(app)/gaps/snapshots/delete-snapshot-button.tsx
  - apps/web/app/(app)/gaps/snapshots/[snapshotId]/page.tsx
  - apps/web/app/(app)/gaps/snapshots/compare/page.tsx
  - apps/web/app/(app)/gaps/gap-analysis-snapshot-view.tsx
  - apps/web/app/(app)/gaps/actions.ts
  - apps/web/lib/gaps/compare.ts
---

# Instantáneas de brechas

Historial de [instantáneas](../glosario.md#instantánea) del análisis de brechas: copias fechadas del
estado de las brechas de la organización. Agrupa tres pantallas: la lista, el detalle de una
instantánea y la comparación entre dos.

## Propósito

Conservar el estado de las brechas en momentos concretos y demostrar la evolución, por ejemplo ante un
auditor o en una revisión de la dirección.

## Acceso y permisos

| Pantalla | Ruta | Navegación |
|---|---|---|
| Historial | `/gaps/snapshots` | **Ver snapshots** en el [Análisis de brechas](brechas.md) |
| Detalle | `/gaps/snapshots/[snapshotId]` | Desde el historial, al guardar una instantánea o desde una evidencia con origen en el análisis de brechas |
| Comparativa | `/gaps/snapshots/compare?a=…&b=…` | Botón **Comparar** del historial |

- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Ver, comparar, exportar, imprimir, eliminar |

## Campos

### Historial

Últimas 50 instantáneas, de la más reciente a la más antigua. Cada fila muestra:
- título, del tipo «Análisis de gaps · {organización} · AAAA-MM-DD»;
- fecha y hora;
- número de brechas críticas, altas y medias;
- total de brechas.

Con dos o más instantáneas aparece la barra de comparación: se marcan dos y se pulsa **Comparar**. Si se
marca una tercera, se descarta la más antigua de la selección.

### Detalle

Datos congelados en el momento de guardar. Solo lectura y sin enlaces a las brechas.

| Bloque | Contenido |
|---|---|
| Cabecera | Título, sistemas afectados, brechas activas, fecha. Contadores de críticos, altos, medios y caducidades |
| **Resumen ejecutivo** | Normativo, FMEA, Controles y Caducidades |
| **Prioridades inmediatas** | Brechas críticas, sistemas con riesgo activo FMEA, sistemas con presión correctiva, evidencias caducadas |
| **Grupos de trabajo detectados** | Hasta 8 grupos |
| **Exposición por sistema** | Hasta 8 sistemas con su índice y zona |
| **Muestra de gaps priorizados** | Las 10 primeras brechas |
| **Caducidades próximas** | Hasta 8 evidencias |

### Comparativa

La instantánea más antigua es «Antes» y la más reciente «Después», sea cual sea el orden de selección.

| Bloque | Contenido |
|---|---|
| Indicadores | **Total de gaps** y **Críticos** con su variación (verde si bajan), **Gaps nuevos**, **Gaps cerrados** |
| **Gaps nuevos** | Aparecen en «Después» pero no en «Antes» |
| **Gaps cerrados** | Estaban en «Antes» y ya no en «Después» |
| **Severidad empeorada** / **Severidad mejorada** | Brechas que cambiaron de gravedad, con «anterior → actual» |
| Pie | Número de brechas que no cambian |

Las brechas se comparan por su clave. Una brecha excluida entre las dos fechas cuenta como cerrada, y una
reactivada, como nueva.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Ver snapshot** | Todos | Abre el detalle | — |
| **Comparar** | Todos | Abre la comparativa de las dos seleccionadas | — |
| **Eliminar snapshot** | Todos | Pide confirmación («Esta acción no se puede deshacer») y ejecuta `deleteGapAnalysisSnapshotAction` | Borra la instantánea |
| **Exportar CSV** (detalle) | Todos | Descarga las brechas activas de la instantánea | — |
| **Exportar / Imprimir** (detalle) | Todos | Imprime desde el navegador | — |
| **Historial** / **Volver** | Todos | Navegación | — |

> TODO: confirmar contra la base de datos desplegada que **Comparar** y **Eliminar snapshot** funcionan.
> Leen y borran con los permisos del usuario, y la tabla de instantáneas no tiene políticas de acceso en
> las migraciones del repositorio. Según el repositorio, la comparativa daría «no encontrado» y el borrado
> no borraría nada, sin mostrar error.

> TODO: confirmar el contenido de las instantáneas. Guardan también las brechas excluidas, pero ni el
> detalle ni la exportación las muestran.

## Validaciones

- Si falta una de las dos instantáneas a comparar, o son la misma, la comparativa vuelve al historial.
- Si una instantánea no existe o es de otra organización, la vista devuelve «no encontrado».

## Estados

No aplica: las instantáneas son inmutables.

Mensajes cuando no hay datos:
- **Historial vacío:** «Aún no hay snapshots guardados.», con el botón **Ir a análisis de gaps**.
- **Comparativa sin cambios:** «Ningún gap nuevo.», «Ningún gap cerrado.», etc.

## Vistas relacionadas

- [Análisis de brechas](brechas.md): donde se guardan.
- [Brechas excluidas](brechas-excluidas.md).
- [Biblioteca de evidencias](evidencias.md): las instantáneas guardadas como evidencia enlazan aquí.
- Negocio: [Análisis de brechas](../negocio/brechas.md).
