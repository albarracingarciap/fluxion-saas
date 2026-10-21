---
id: FUN-REGISTRO-UE
titulo: Ficha para el registro UE
tipo: funcional
modulo: informes-del-sistema
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/inventario/[id]/eu-registry/page.tsx
  - apps/web/app/(app)/inventario/[id]/eu-registry/eu-registry-view.tsx
  - apps/web/app/(app)/inventario/[id]/eu-registry/actions.ts
  - apps/web/app/(app)/inventario/[id]/eu-registry/save-eu-registry-button.tsx
  - apps/web/app/(app)/inventario/[id]/eu-registry/snapshots/[snapshotId]/page.tsx
  - apps/web/lib/ai-systems/eu-registry.ts
  - apps/web/lib/evidences/data.ts
  - apps/web/lib/approvals/open.ts
---

# Ficha para el registro UE

Uno de los [informes del sistema](../glosario.md#informes-del-sistema). Comprueba si el sistema tiene la
información mínima para preparar su inscripción en la base de datos de la UE y qué falta.

## Propósito

Preparar la [ficha para el registro UE](../glosario.md#ficha-para-el-registro-ue) con una lista de
comprobación y un porcentaje de preparación. La vista no envía nada a ningún registro externo: la
presentación es manual.

## Acceso y permisos

- **Ruta:** `/inventario/[id]/eu-registry`. Instantáneas: `/inventario/[id]/eu-registry/snapshots/[snapshotId]`.
- **Navegación:** **Acciones rápidas** de la [Ficha del sistema](ficha-sistema.md), tarjeta **Registro EU**.
- **Disponibilidad:** módulo Informes del sistema.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Imprimir, guardar como evidencia |

> **Pendiente de definir.** Qué roles pueden guardar informes como evidencia.

## Campos

**Cabecera:** dominio, nivel de riesgo y versión. Indicadores **Readiness** (porcentaje de puntos de la
lista cumplidos), **Checklist OK**, **Campos faltantes** y **Evidencias**.

**Estado de preparación:** «Lista para preparar registro» si se cumplen los nueve puntos; si no, «Aún no
lista para registro» con el número de puntos pendientes.

**Checklist de pre-registro** (cada punto, «OK» o «Pendiente» con su explicación):

| Punto | Se cumple si el sistema tiene… |
|---|---|
| **Identificación del sistema** | Nombre, versión e identificador interno |
| **Clasificación AI Act** | Clasificación distinta de pendiente y base de la clasificación |
| **Propósito y descripción** | Descripción funcional, uso previsto y tipo de output |
| **Documentación técnica** | Documentación técnica (Sí, Parcial o En proceso) y descripción técnica |
| **Controles mínimos de riesgo** | Evaluación de riesgos, logging y supervisión humana |
| **Gobierno de datos** | Documentación de los datos de entrenamiento |
| **Responsables y revisión** | Responsable, equipo y frecuencia de revisión |
| **Evidencias de soporte** | Al menos una evidencia, en cualquier estado |
| **Proveedor y modelo** | Modelo base, modelo externo o proveedor externo |

**Campos faltantes:** los puntos pendientes. Si no hay ninguno, la vista muestra «No se han detectado
carencias críticas para este pre-registro.».

**Ficha mínima del sistema:** ID interno, clasificación, output, responsable, proveedor o modelo,
número de evidencias y uso previsto.

**Secciones adicionales**, solo si hay datos:

| Sección | Contenido |
|---|---|
| **Obligaciones AI Act** | Estado, prioridad y evidencias de cada obligación |
| **Planes de tratamiento** | Estado, zonas, progreso de acciones y fecha límite |
| **Evidencias de soporte** | Hasta 12, con enlace. Si hay más, **Ver las N evidencias adicionales →** abre la pestaña Evidencias de la ficha |

> TODO: confirmar la cobertura del Anexo VIII del AI Act. La lista de comprobación aplica criterios
> internos de preparación y no recoge la mayoría de los datos que pide el Anexo VIII:
> - **Proveedor que registra:** sus datos, la persona que presenta y el representante autorizado.
> - **Estado y certificación:** el estado en el mercado, el certificado del organismo notificado y la
>   declaración UE de conformidad.
> - **Distribución:** los Estados miembros y las instrucciones de uso.
> - **Otras secciones del anexo:** la sección B (Art. 6.3) y la sección C (responsables del despliegue).

> TODO: confirmar varios datos de la ficha.
> - **Estados de las obligaciones y de los planes:** muchos valores aparecen sin traducir.
> - **Explicaciones de la lista:** las de «Propósito y descripción» y «Responsables y revisión» citan menos
>   datos de los que se comprueban.
> - **Evidencias que cuentan:** se cuentan también las rechazadas y las caducadas.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Exportar / Imprimir** | Todos | Abre el diálogo de impresión del navegador | — |
| **Guardar como evidencia** | Todos | Abre el modal de guardado, igual que en el [Dossier técnico](dossier-tecnico.md#guardar-como-evidencia). Caducidad por defecto: 180 días | Instantánea `eu_registry_prep`. Evidencia de tipo informe (`report`), pendiente de revisión, con su solicitud de aprobación abierta en [Aprobaciones](aprobaciones.md) (sin política activa para las evidencias, queda en borrador). Etiquetas `auto-generated`, `registro-eu`, `ready` o `no-ready`, el nivel de riesgo y las del usuario. Historial «Ficha de registro EU guardada como evidencia». Mensaje «Ficha de registro guardada como evidencia (pendiente de revisión).» |

> TODO: confirmar el enlace desde la evidencia. La biblioteca no reconoce el tipo de instantánea
> `eu_registry_prep` y ofrece **Ver sistema** en lugar de abrir la ficha guardada.

> **Pendiente de implementar.** Envío o exportación al registro de la UE.

## Validaciones

| Situación | Mensaje |
|---|---|
| No se puede componer la ficha | «No se pudo construir la ficha de registro EU.» |
| Error al guardar la instantánea | «No se pudo guardar el snapshot de registro EU.» |
| Error al crear la evidencia | «No se pudo registrar la evidencia de la ficha EU.» |

## Estados

La ficha está «Lista para preparar registro» o «Aún no lista para registro», según la lista de
comprobación. La evidencia generada sigue el ciclo de la [Biblioteca de evidencias](evidencias.md#estados).

## Vistas relacionadas

- [Ficha del sistema](ficha-sistema.md), [Dossier técnico](dossier-tecnico.md),
  [Informe de brechas del sistema](informe-brechas-sistema.md).
- [Clasificación AI Act](../negocio/clasificacion-ai-act.md).
- Negocio: [Informes del sistema](../negocio/informes-del-sistema.md).
