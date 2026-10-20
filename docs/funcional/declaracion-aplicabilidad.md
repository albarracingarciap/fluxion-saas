---
id: FUN-SOA
titulo: Declaración de Aplicabilidad ISO 42001
tipo: funcional
modulo: declaracion-aplicabilidad
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/plantillas/soa-iso42001/page.tsx
  - apps/web/app/(app)/plantillas/soa-iso42001/actions.ts
  - apps/web/app/(app)/plantillas/soa-iso42001/soa-client-view.tsx
  - apps/web/app/(app)/plantillas/soa-iso42001/header-actions.tsx
  - apps/web/app/(app)/plantillas/soa-iso42001/metadata-bar.tsx
  - apps/web/app/(app)/plantillas/soa-iso42001/metadata-modal.tsx
  - apps/web/app/(app)/plantillas/soa-iso42001/aisia-analysis-modal.tsx
  - apps/web/app/(app)/plantillas/soa-iso42001/history-modal.tsx
  - apps/web/app/(app)/plantillas/soa-iso42001/init-soa-button.tsx
  - apps/web/app/(app)/plantillas/soa-iso42001/soa-print-view.tsx
  - apps/web/lib/templates/data.ts
  - apps/web/lib/templates/iso42001-catalog.ts
  - supabase/migrations/00000000000001_schema.sql
---

# Declaración de Aplicabilidad ISO 42001

Documento de la organización que recoge, para cada uno de los 38 controles del Anexo A de ISO/IEC 42001,
si aplica, su justificación y su estado de implantación. Incluye propuestas con IA, comprobación de
completitud, ciclo de revisión y aprobación, e impresión.

## Propósito

Elaborar y mantener la [Declaración de Aplicabilidad ISO 42001](../glosario.md#declaración-de-aplicabilidad-iso-42001)
de la organización y dejarla aprobada.

## Acceso y permisos

- **Ruta:** `/plantillas/soa-iso42001`
- **Navegación:**
  - **Cumplimiento › ISO 42001 › Declaración de Aplicabilidad**;
  - **Ver SoA** en el [Dashboard](dashboard.md) y en la pestaña ISO 42001 de la [Ficha del sistema](ficha-sistema.md).
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Editar controles y cabecera, usar las propuestas con IA, ver el historial, imprimir |
| Responsable del SGAI, CAIO, DPO, Analista de cumplimiento, Administrador | Ídem | Enviar a revisión |
| Administrador, Responsable del SGAI, CAIO | Ídem | Aprobar e iniciar una nueva revisión |

El rol se toma del perfil de la sesión en la organización activa. «Aprobado por» se rellena con el nombre
de quien aprueba si la cabecera no lo tenía.

## Campos

### Inicialización

Si la organización no tiene Declaración, la vista muestra «Inicializar Declaración de Aplicabilidad». El
botón **Crear Versión 0 del SoA** crea los 38 controles como no aplicables y no iniciados.

### Cabecera

| Campo | Tipo | Obligatorio | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|---|---|
| **Versión** | texto | Sí | Por defecto 1.0 | `organization_soa_metadata.version` |
| **Propietario** | texto | No | — | `owner_name` |
| **Aprobado por** · **Cargo / Rol** | texto | No | — | `approved_by`, `approved_by_role` |
| **Fecha de aprobación** | fecha | No | Se sustituye por la de hoy al aprobar | `approved_at` |
| **Próxima revisión** | fecha | No | Se resalta si faltan 30 días o menos | `next_review_date` |
| **Sistemas incluidos en el alcance** | etiquetas | No | Etiquetas de los sistemas del inventario. Sin etiquetas, entran todos | `scope_system_tags` |
| **Justificación del alcance** | texto largo | No | — | `scope` |

### Indicadores y alertas

| Elemento | Contenido |
|---|---|
| **Controles aplicables** | Aplicables sobre 38 |
| **Controles implantados** | Aplicables en «Implantado»; debajo, cuántos están «En progreso» |
| **Cumplimiento SoA** | Implantados sobre aplicables |
| Alertas | Controles aplicables sin justificación y sin iniciar, con **Ver controles con gaps** |
| **Progreso por dominio** | Por grupo A.2 a A.10: implantados y externalizados, en curso y planificados |

### Controles

**Vistas:**
- **Por dominio:** controles agrupados de A.2 a A.10.
- **Por sistema:** los controles aplicables de cada sistema en alcance, con el estado de su
  [AISIA](../glosario.md#evaluación-de-impacto-del-sistema-de-ia-aisia).

**Filtros:**
- búsqueda por código o título;
- aplicabilidad: Todos · Solo aplicables · Solo excluidos;
- estado: No iniciado · Planificado · En progreso · Implantado · Externalizado · Sin justificación.

Edición de un control (panel lateral):

| Campo | Tipo | Obligatorio | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|---|---|
| Texto normativo | solo lectura | — | Descripción del control | `iso42001-catalog.ts` |
| **Aplicabilidad** | interruptor | — | ¿Aplica este control a tu SGIA? | `organization_soa_controls.is_applicable` |
| **Justificación de aplicabilidad/exclusión** | texto largo | Para aprobar, en los aplicables | Con **Sugerir con IA** | `justification` |
| **Estado de implantación** | selector | — | No iniciado · Planificado · En progreso · Implantado · Externalizado | `status` |
| **Propietario** | selector | No | Miembros de la organización | `owner_user_id` |
| **Evidencia asociada** | selector | No | Evidencias de los sistemas en alcance | `validation_evidence_id` |
| **Observaciones / Acciones pendientes** | texto largo | No | — | `notes` |
| **Sistemas en alcance** | solo lectura | — | Se vinculan automáticamente al guardar si el control aplica | `organization_soa_system_links` |

El propietario debe ser un miembro de la organización; si no, se muestra «El propietario seleccionado no
pertenece a la organización.».

> TODO: confirmar un comportamiento de la edición de controles.
> - **Vista Por sistema:** muestra todos los controles aplicables en todos los sistemas en alcance, no los
>   vínculos reales.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Guardar control** | Todos | `updateSoAControl` | Actualiza el control y sus sistemas vinculados. Historial «Actualización de control aplicable» en cada sistema |
| **Setup rápido** › **Marcar aplicables** / **Marcar excluidos** | Todos | Aplicabilidad en bloque | Pone los controles en «No iniciado» |
| **Sugerir con IA** | Todos | Propone una justificación para el control, con el contexto de los sistemas y el alcance | Rellena el campo; no guarda |
| **Analizar AISIA** (solo en borrador) | Todos | Lee las AISIA aprobadas de los sistemas en alcance y propone con IA la aplicabilidad y la razón de los 38 controles | Muestra las propuestas, marca las que cambian algo y permite invertir cada una |
| **Aplicar N cambios** | Todos | `applySoASuggestions` | Guarda la aplicabilidad y la justificación propuestas |
| **Configurar Cabecera** | Todos | `updateSoAMetadata` | — |
| **Enviar a revisión** | Roles de envío | Comprueba la completitud y avisa de los controles aplicables sin justificación (se puede continuar) | Estado «En revisión». Registro de ciclo de vida |
| **Aprobar SoA** | Roles de aprobación | Exige que todos los aplicables tengan justificación | Estado «Aprobado», fecha de hoy y aprobador. Registro de ciclo de vida |
| **Iniciar nueva revisión** | Roles de aprobación | Devuelve a borrador | Registro de ciclo de vida |
| **Ver Historial** | Todos | Pestañas **Ciclo de vida** y **Cambios en controles** | — |
| **Exportar PDF** | Todos | Imprime desde el navegador la vista de impresión: portada, resumen y desglose de controles por grupo | — |

Cada guardado de un control queda en **Ver Historial › Cambios en controles**, y cada cambio de estado en
**Ciclo de vida**, con su autor.

> TODO: confirmar dos efectos secundarios.
> - **Aplicar propuestas:** también borra la justificación de los controles que quedan excluidos.
> - **Vista de impresión:** muestra «Fluxion SaaS» como organización y «Página 1 de 1» fijos.

Con una política de [Flujos de aprobación](../glosario.md#flujos-de-aprobación) para este tipo de objeto, la decisión se toma en [Aprobaciones](aprobaciones.md) (B11a): ver allí cuándo se abre la solicitud y qué efecto tiene. Para enviarla con política, todos los controles aplicables deben estar justificados.

## Validaciones

| Situación | Mensaje |
|---|---|
| Sin sistemas en alcance (Analizar AISIA) | «No hay sistemas en alcance. Define tags de alcance en la cabecera del SoA primero.» |
| Sin AISIA aprobadas | «No hay evaluaciones AISIA aprobadas para los sistemas en alcance. Aprueba al menos una AISIA antes de usar esta función.» |
| Aprobar con controles aplicables sin justificación | «No se puede aprobar: N control(es) aplicable(s) carece(n) de justificación (…)» |
| Enviar sin permiso | «No tienes permisos para enviar el documento a revisión.» |
| Aprobar sin permiso | «No tienes permisos para aprobar el documento SoA.» |
| Error de la IA | «Error en el motor de IA: …» / «No se pudo completar el análisis. Inténtalo de nuevo.» |

## Estados

```mermaid
stateDiagram-v2
  [*] --> Borrador: inicializar
  Borrador --> En_revisión: enviar a revisión
  En_revisión --> Aprobado: aprobar
  En_revisión --> Borrador: nueva revisión
  Aprobado --> Borrador: nueva revisión
```

Fuera de borrador, la vista bloquea la edición de controles y oculta el **Setup rápido**. La cabecera
sigue siendo editable.

## Vistas relacionadas

- [AISIA](aisia.md): fuente de las propuestas. Al aprobar una AISIA, los controles A.5.2 a A.5.5 pasan a
  «Implantado» si todos sus sistemas tienen AISIA aprobada.
- [Biblioteca de evidencias](evidencias.md), [Ficha del sistema](ficha-sistema.md), [Dashboard](dashboard.md).
- Negocio: [Declaración de Aplicabilidad ISO 42001](../negocio/declaracion-aplicabilidad.md).
