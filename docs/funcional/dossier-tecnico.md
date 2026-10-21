---
id: FUN-DOSSIER
titulo: Dossier técnico
tipo: funcional
modulo: informes-del-sistema
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/inventario/[id]/technical-dossier/page.tsx
  - apps/web/app/(app)/inventario/[id]/technical-dossier/technical-dossier-view.tsx
  - apps/web/app/(app)/inventario/[id]/technical-dossier/actions.ts
  - apps/web/app/(app)/inventario/[id]/technical-dossier/save-technical-dossier-button.tsx
  - apps/web/app/(app)/inventario/[id]/technical-dossier/snapshots/[snapshotId]/page.tsx
  - apps/web/components/inventory/save-report-evidence-modal.tsx
  - apps/web/lib/ai-systems/technical-dossier.ts
  - apps/web/lib/approvals/open.ts
---

# Dossier técnico

Uno de los [informes del sistema](../glosario.md#informes-del-sistema). Reúne en una página los datos de
un sistema de IA: identificación, arquitectura, datos, gobierno, controles, obligaciones, planes de
tratamiento, cadenas causales y evidencias.

## Propósito

Dar una vista consolidada y legible del sistema, imprimirla y congelarla como
[instantánea](../glosario.md#instantánea) archivada como [evidencia](../glosario.md#evidencia).

## Acceso y permisos

- **Ruta:** `/inventario/[id]/technical-dossier`. Instantáneas: `/inventario/[id]/technical-dossier/snapshots/[snapshotId]`.
- **Navegación:**
  - **Acciones rápidas** de la [Ficha del sistema](ficha-sistema.md), tarjeta **Dossier técnico**;
  - la [Biblioteca de evidencias](evidencias.md), para abrir una instantánea guardada.
- **Disponibilidad:** módulo Informes del sistema.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Imprimir, guardar como evidencia |

> **Pendiente de definir.** Qué roles pueden guardar informes como evidencia. La vista no comprueba ni el
> rol ni el módulo contratado.

Si el sistema no existe o es de otra organización, la vista devuelve «no encontrado».

## Campos

El informe se compone en el momento con los datos actuales del sistema. Las secciones 8 a 11 solo
aparecen si tienen datos.

| # | Sección | Contenido | Origen |
|---|---|---|---|
| 1 | Cabecera | Nombre, dominio, nivel de riesgo, versión. Indicadores **ISO score**, **Evidencias**, **Cobertura obl.** (obligaciones con evidencia / total) y **Modos FMEA** | `ai_systems`, `system_evidences`, `system_obligations`, `system_failure_modes` |
| 2 | **Identificación y propósito** | ID interno, estado, descripción funcional, uso previsto, usos prohibidos o excluidos | `ai_systems` |
| 3 | **Arquitectura y tecnología** | Tipo de sistema, output, modelo base, modelo externo, proveedor, frameworks, descripción técnica | `ai_systems` |
| 4 | **Datos y tratamiento** | Datos personales, datos biométricos, fuentes de datos, categorías especiales, volumen, retención | `ai_systems` |
| 5 | **Gobierno y responsabilidades** | AI owner, equipo, tech lead, sponsor, DPO involucrado, frecuencia de revisión | `ai_systems` |
| 6 | **Controles y compliance** | Clasificación AI Act y su base; documentación técnica, logging, supervisión humana, evaluación de riesgos y DPIA (Sí, Parcial, En proceso, No); riesgo residual; certificación | `ai_systems` |
| 7 | (resúmenes) | **Resumen ISO 42001** (implementado, parcial, pendiente) y **Evidencias y FMEA** | `ai_systems.iso_42001_checks` |
| 8 | **Cobertura de obligaciones** | Código, estado, prioridad, título y número de evidencias de cada [obligación](../glosario.md#obligación) | `system_obligations`, `system_obligation_evidences` |
| 9 | **Planes de tratamiento de riesgo** | Código, estado, zona de origen y objetivo, fecha de aprobación, fecha límite, progreso de acciones | `treatment_plans` |
| 10 | **Cadenas causales activas** | Cadenas de propagación de tres o más eslabones | `detectActiveCausalChains` |
| 11 | **Evidencias del sistema** | Hasta 12 evidencias, con tipo, estado, caducidad, etiquetas y **Ver**. Si hay más, avisa de cuántas faltan | `system_evidences` |

El pie muestra la fecha de generación y la de la última actualización de la ficha.

> TODO: confirmar varios datos del dossier.
> - **Estados de las obligaciones:** se muestran con valores que no existen (Conforme, Parcial, No
>   conforme, Sin evaluar), y casi todas aparecen como «Sin evaluar».
> - **Prioridad:** aparece sin traducir («Pmedium», «Phigh»).
> - **Orden de las obligaciones:** se ordenan por prioridad alfabéticamente, no por importancia.
> - **Estados de los planes:** «En curso» y «Sustituido» aparecen como «Borrador».
> - **Estado del sistema y de las evidencias:** aparecen sin traducir.
> - **Recuento de modos FMEA:** no coincide con el del [Informe de brechas](informe-brechas-sistema.md).
> - **Datos que no se muestran:** se cargan pero no se muestran usuarios objetivo, ámbito geográfico,
>   GPAI, colectivos vulnerables, menores, infraestructura crítica, automatización completa, bases
>   legales, documentación de los datos de entrenamiento, pruebas adversariales y próxima auditoría,
>   entre otros. Falta decidir cuáles debe incluir el dossier.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Exportar / Imprimir** | Todos | Abre el diálogo de impresión del navegador, sin menú ni barra superior | — |
| **Guardar como evidencia** | Todos | Abre el modal de guardado | Ver abajo |
| **Ver** (en una evidencia) | Todos | Navega al [Detalle de evidencia](evidencia-detalle.md) | — |

### Guardar como evidencia

Este modal es común a los tres [informes del sistema](../glosario.md#informes-del-sistema):

| Campo | Obligatorio | Descripción |
|---|---|---|
| Resumen | — | Líneas de resumen del informe, de solo lectura |
| **Tags** | No | Se añaden con Enter o coma. Se pasan a minúsculas y no se repiten |
| **Caducidad** | No | Fecha en que conviene regenerar la instantánea. En el dossier, por defecto, dentro de 180 días |
| **Nota de validación** | No | Contexto para la revisión |

Al pulsar **Confirmar y guardar**:

1. El informe se vuelve a componer en el servidor, sin usar lo que se ve en pantalla.
2. Se guarda una instantánea inmutable en `system_report_snapshots` (`report_type` `technical_dossier`).
3. Se crea una evidencia del sistema:
   - **Tipo:** documentación técnica (`technical_doc`).
   - **Estado:** pendiente de revisión, con su solicitud de aprobación abierta automáticamente
     (`openEvidenceReview`); si no hay política activa para las evidencias, queda en borrador.
   - **Enlace:** la instantánea.
   - **Versión:** la fecha del día.
   - **Etiquetas:** `auto-generated`, `dossier-tecnico`, el dominio, el nivel de riesgo y las del usuario.
4. Se registra en el historial «Dossier técnico guardado como evidencia».
5. Se muestra «Dossier guardado como evidencia (pendiente de revisión).».

La evidencia pasa a válida cuando se aprueba en [Aprobaciones](aprobaciones.md) (B11g). Quien la guarda
consta como quien la aporta y no puede decidirla.

> TODO: confirmar el comportamiento del modal si falla el guardado. Se borran los datos escritos y el
> mensaje de error queda detrás del modal.

### Instantáneas

Una instantánea guardada muestra el mismo informe con el sufijo «snapshot» y solo el botón de imprimir.
La vista no tiene un listado de instantáneas: se abren desde la evidencia que las enlaza.

> TODO: confirmar los textos de la instantánea.
> - **Pie:** dice «a partir del estado actual del sistema» aunque es una copia de una fecha concreta.
> - **Enlace del nombre del sistema:** lleva al informe en vivo, no a la ficha.

## Validaciones

| Situación | Mensaje |
|---|---|
| No se puede componer el informe | «No se pudo construir el dossier técnico para este sistema.» |
| Error al guardar la instantánea | «No se pudo guardar el snapshot del dossier.» |
| Error al crear la evidencia | «No se pudo registrar la evidencia del dossier.» |
| Sesión sin organización | «No se encontró organización asociada al usuario.» |

Los campos del modal no se validan: se acepta una caducidad ya pasada.

## Estados

El informe no tiene estados. La evidencia que genera sigue el ciclo de la
[Biblioteca de evidencias](evidencias.md#estados).

## Vistas relacionadas

- [Ficha del sistema](ficha-sistema.md), [Ficha para el registro UE](registro-ue.md),
  [Informe de brechas del sistema](informe-brechas-sistema.md).
- [Biblioteca de evidencias](evidencias.md).
- Negocio: [Informes del sistema](../negocio/informes-del-sistema.md).
