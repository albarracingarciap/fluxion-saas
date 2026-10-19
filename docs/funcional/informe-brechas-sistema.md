---
id: FUN-INFORME-BRECHAS
titulo: Informe de brechas del sistema
tipo: funcional
modulo: informes-del-sistema
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/inventario/[id]/gap-report/page.tsx
  - apps/web/app/(app)/inventario/[id]/gap-report/gap-report-view.tsx
  - apps/web/app/(app)/inventario/[id]/gap-report/actions.ts
  - apps/web/app/(app)/inventario/[id]/gap-report/save-gap-report-button.tsx
  - apps/web/app/(app)/inventario/[id]/gap-report/snapshots/[snapshotId]/page.tsx
  - apps/web/lib/ai-systems/gap-report.ts
---

# Informe de brechas del sistema

Uno de los [informes del sistema](../glosario.md#informes-del-sistema). Resume lo que le falta a un
sistema de IA: obligaciones AI Act no resueltas, controles ISO 42001 incompletos, evidencias pendientes
o caducadas, y modos de fallo activados.

## Propósito

Dar una foto ejecutiva de las carencias de un sistema, imprimirla y guardarla como
[instantánea](../glosario.md#instantánea). Es distinta de la vista [Brechas](brechas.md), que trabaja con
las [brechas](../glosario.md#brecha) de toda la organización.

## Acceso y permisos

- **Ruta:** `/inventario/[id]/gap-report`. Instantáneas: `/inventario/[id]/gap-report/snapshots/[snapshotId]`.
- **Navegación:** **Acciones rápidas** de la [Ficha del sistema](ficha-sistema.md), tarjeta **Gap report**.
- **Disponibilidad:** módulo Informes del sistema.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Imprimir, guardar como evidencia |

> **Pendiente de definir.** Qué roles pueden guardar informes como evidencia.

## Campos

**Cabecera:** dominio, nivel de riesgo y puntuación ISO. Indicadores:
- **Señales gap:** suma de obligaciones pendientes, brechas ISO, evidencias pendientes y evidencias
  caducadas;
- **Obligaciones**, solo las pendientes;
- **ISO gaps**;
- **Evidencias**, el total.

| Sección | Contenido | Mensaje si está vacía |
|---|---|---|
| **Resumen ejecutivo** | Descripción, uso previsto, base AI Act, razón de la clasificación, stack externo | — |
| **Prioridades inmediatas** | Recuentos de obligaciones no resueltas, controles ISO parciales o pendientes, evidencias en borrador o revisión, evidencias caducadas y modos de fallo activados | — |
| **Obligaciones AI Act pendientes** | Referencia, nombre, estado, prioridad y fecha objetivo de cada obligación no resuelta | «No hay obligaciones AI Act pendientes en este momento.» |
| **Brechas ISO 42001** | Controles que no están implementados, con su estado y puntos | «No hay checks ISO pendientes o parciales.» |
| **Situación de evidencias** | Válidas, pendientes y caducadas; hasta 8 evidencias con enlace | «No hay evidencias registradas para este sistema.» |
| **Modos de fallo activados** | Por dimensión (Técnicos, Legales, Éticos, Seguridad, Gobernanza, ROI), hasta 8 por dimensión | «No hay modos de fallo activados para este sistema.» |
| **Planes de tratamiento** | Solo si hay. Estado, zonas, fecha límite y periodicidad de revisión | — |

Las obligaciones salen de la clasificación AI Act del sistema. Si una obligación no tiene seguimiento
propio, su estado se deduce de la ficha: por ejemplo, el Art. 9 de la evaluación de riesgos, el Art. 11 de
la documentación técnica y el Art. 14 de la supervisión humana.

> TODO: confirmar varios recuentos del informe.
> - **Obligaciones excluidas o sugeridas:** cuentan como pendientes.
> - **Controles ISO «no aplica»:** cuentan como brechas.
> - **Modos de fallo por dimensión:** el recuento incluye todos, pero solo se listan 8.
> - **Modos que no están en el catálogo:** desaparecen del informe sin aviso.
> - **Enlace a [Brechas](brechas.md):** la vista no lo tiene.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Exportar / Imprimir** | Todos | Abre el diálogo de impresión del navegador. La tarjeta de la ficha lo anuncia como «Exportar en PDF» | — |
| **Guardar como evidencia** | Todos | Abre el modal de guardado, igual que en el [Dossier técnico](dossier-tecnico.md#guardar-como-evidencia). Caducidad por defecto: **90 días**, porque las brechas cambian rápido | Instantánea `gap_report`. Evidencia de tipo informe (`report`), pendiente de revisión. Etiquetas `auto-generated`, `gap-report`, el nivel de riesgo, `gap-critico` si hay más de 10 señales y las del usuario. Historial «Gap report guardado como evidencia». Mensaje «Informe guardado como evidencia (pendiente de revisión).» |

## Validaciones

| Situación | Mensaje |
|---|---|
| No se puede componer el informe | «No se pudo construir el gap report para este sistema.» |
| Error al guardar la instantánea | «No se pudo guardar el snapshot del informe.» |
| Error al crear la evidencia | «No se pudo registrar la evidencia del informe.» |

## Estados

El informe no tiene estados. La evidencia generada sigue el ciclo de la
[Biblioteca de evidencias](evidencias.md#estados).

## Vistas relacionadas

- [Ficha del sistema](ficha-sistema.md), [Dossier técnico](dossier-tecnico.md),
  [Ficha para el registro UE](registro-ue.md).
- [Brechas](brechas.md), [Instantáneas de brechas](brechas-instantaneas.md).
- Negocio: [Informes del sistema](../negocio/informes-del-sistema.md).
