---
id: FUN-FMEA-EVALUAR
titulo: Evaluación FMEA
tipo: funcional
modulo: analisis-modos-de-fallo
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/inventario/[id]/fmea/page.tsx
  - apps/web/app/(app)/inventario/[id]/fmea/actions.ts
  - apps/web/app/(app)/inventario/[id]/fmea/evaluation-version-bar.tsx
  - apps/web/app/(app)/inventario/[id]/fmea/[evaluationId]/evaluar/page.tsx
  - apps/web/app/(app)/inventario/[id]/fmea/[evaluationId]/evaluar/fmea-evaluation-client.tsx
  - apps/web/app/(app)/inventario/[id]/fmea/[evaluationId]/evaluar/familias-panel.tsx
  - apps/web/app/(app)/inventario/[id]/fmea/[evaluationId]/evaluar/actions.ts
  - apps/web/app/(app)/inventario/[id]/fmea/[evaluationId]/exportar/route.ts
  - apps/web/lib/fmea/domain.ts
  - apps/web/lib/fmea/data.ts
  - apps/web/lib/fmea/treatment-plan.ts
  - apps/web/lib/fmea/lifecycle-rules.ts
  - apps/web/lib/fmea/lifecycle.ts
  - apps/web/lib/fmea/versions.ts
  - supabase/migrations/20260908090000_fmea_estimacion_por_familia.sql
  - supabase/migrations/20261020100000_fmea_ciclo_evaluacion.sql
---

# Evaluación FMEA

Pantalla en la que se evalúan los modos de fallo priorizados de un sistema: ocurrencia, detectabilidad
y severidad, con justificación y segunda revisión cuando se exigen. Calcula la
[zona de riesgo](../glosario.md#zona-de-riesgo) y, al enviarla, crea el plan de tratamiento.

## Propósito

Realizar el [análisis de modos de fallo (FMEA)](../glosario.md#análisis-de-modos-de-fallo-fmea) de un
sistema de forma trazable y obtener las acciones que deben tratarse.

## Acceso y permisos

- **Ruta de entrada:** `/inventario/[id]/fmea`.
  - Abre la evaluación en curso, si no la vigente; solo crea la versión 1 si el sistema no tiene ninguna.
  - Después redirige a `…/fmea/[evaluationId]/evaluar` o, si ya hay plan, al plan.
  - Con `?item=` abre ese ítem.
- **Navegación:**
  - **Eval. riesgos** en la [Ficha del sistema](ficha-sistema.md);
  - [Evaluaciones](evaluaciones.md);
  - [Dashboard](dashboard.md);
  - brechas de control;
  - tareas delegadas desde un modo.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Administrador, Responsable del SGAI, CAIO, DPO, Responsable del sistema, Analista de riesgos, Analista de cumplimiento | Sí | Evaluar, guardar, enviar a revisión |
| Responsable del SGAI | Ídem | Además, resolver segundas revisiones (no siendo el evaluador) |
| Directivo, Auditor, Lector | Sí, con los botones visibles | La base de datos rechaza los cambios |

La segunda revisión la resuelve el Responsable del SGAI, distinto del evaluador (bloque B01; DP-01, pendiente
de confirmar). Para el resto de roles el botón no se muestra.

> **Pendiente de implementar.** Restringir la evaluación a quien prepara según DP-01 (Analista de riesgos y
> Responsable del sistema). Hoy la base de datos admite la edición de los roles de la tabla.

### Al entrar en el FMEA

| Situación | Resultado |
|---|---|
| El sistema no tiene modos activados | «Activa antes los modos de fallo» y **Volver al sistema** |
| No hay modos priorizados | «Todavía no hay una cola priorizada para este sistema…» |
| Todos los priorizados son de negocio | «Los modos priorizados de este sistema son todos de riesgo de negocio, que no forman parte del FMEA regulatorio.» |
| Hay una evaluación en borrador o en revisión | Se abre esa |
| No la hay, pero sí una aprobada | Se abre la vigente (la última aprobada), en solo lectura |
| El sistema no tiene ninguna evaluación | Se crea la versión 1 con un ítem por modo priorizado. Historial «Evaluación FMEA iniciada» |

Una versión nueva no se crea al entrar: se abre con **Nueva versión** (ver [Versiones](#versiones)).

## Campos

### Cabecera e indicadores

- **Identificación:** nombre del sistema, código, «Evaluación FMEA · Versión N».
- **Estado de guardado:** «Guardando…», «Cambios pendientes» o «Borrador sincronizado».
- **Zona activa:**
  - Zona I · requiere escalado;
  - Zona II · revisión prioritaria;
  - Zona III · seguimiento;
  - Zona IV · estable.
- **Indicadores:** Evaluados, Pendientes, Pospuestos, 2ª revisión, S_actual = 9, Tareas delegadas y
  [Suelo AI Act](../glosario.md#suelo-ai-act).

### Mapa de calor O × D_real

Plegable. Rejilla de 5 × 5 con el número de modos evaluados en cada combinación, coloreada según la
severidad máxima: bajo, moderado, medio, alto, crítico.

### Estimación por familia

Panel «Estimación por familia · N de M». Permite valorar a la vez todos los modos de una
[familia](../glosario.md#estimación-por-familia).

| Campo | Tipo | Obligatorio | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|---|---|
| **Ocurrencia (O)** | botones 1-5 | Sí | Muy improbable · Improbable · Posible · Probable · Casi seguro. Por defecto 3 | `fmea_family_estimates.o_value` |
| **Detección (D)** | botones 1-5 | Sí | Se detecta siempre · casi siempre · Detección parcial · Difícil de detectar · No se detecta | `d_value` |
| **Justificación** | texto largo | Sí | Mínimo 50 caracteres. Sustituye a la de cada modo de la familia | `justification` |

- **Cálculo:** cada modo cubierto queda confirmado con la ocurrencia y la detección máximas de sus
  familias y la severidad sugerida.
- **Retirar la estimación:** los modos vuelven a pendiente.

Confirmar o posponer un modo uno a uno lo marca como ajuste manual: aplicar o retirar una estimación por
familia ya no lo modifica. **Restablecer a pendiente** quita esa marca.

### Lista de modos

**Filtros:**
- **Estado:** Todos, Pendientes, Evaluados, Pospuestos, 2ª revisión, S ≥ 8 (por severidad por defecto).
- **[Dimensión](../glosario.md#dimensión-de-riesgo).**
- **Familia causal.**
- **Búsqueda:** por código o nombre.

Paginación de 20, agrupada por dimensión.

| Columna | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|
| Código y nombre | — | `compliance.failure_modes.code`, `name` |
| Estado | Pendiente · Confirmado · Pospuesto | `fmea_items.status` |
| Dimensión | — | `failure_modes.dimension_id` |
| **def** | [Severidad por defecto](../glosario.md#severidad-por-defecto-s_default) | `fmea_items.s_default_frozen` |
| **act** | [Severidad actual](../glosario.md#severidad-actual-s_actual) confirmada, o la sugerida | `s_actual` |
| Tarea | Estado de la tarea delegada | `tasks.status` |

### Editor del modo

| Campo | Tipo | Obligatorio | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|---|---|
| Criterios R·I·D·E | solo lectura | — | [Criterios R.I.D.E.](../glosario.md#criterios-ride) del catálogo | `compliance.failure_modes` |
| **O · Ocurrencia en este sistema** | deslizador 1-5 | Sí | Por defecto 3. Improbable (1-2), Moderado (3), Probable (4-5) | `fmea_items.o_value` |
| **D_real · Detectabilidad real** | deslizador 1-5 | Sí | Por defecto 3. Detectable (1-2), Moderado (3), Difícil de detectar (4-5) | `d_real_value` |
| **S_actual sugerido** | calculado | — | Ver regla. Con 9: «⚠ S_actual = 9 activa Zona I y bloquea el despliegue hasta revisión.» | — |
| **Ajustar S_actual manualmente** | número 2-9 | No | Sustituye al sugerido | `s_actual` |
| **Justificación** | texto largo | Según regla | Mínimo 50 caracteres cuando es obligatoria | `narrative_justification` |

**Regla de severidad sugerida** (entre 2 y 9):

| Ocurrencia y detectabilidad | Severidad sugerida |
|---|---|
| O ≤ 2 y D ≤ 2 | Por defecto − 3 |
| O ≤ 2 y D = 3 | Por defecto − 2 |
| O ≤ 2 y D ≥ 4 | Por defecto − 1 |
| O ≥ 4 | Por defecto |
| Resto | Por defecto − 1 |

**La justificación es obligatoria si se cumple alguna de estas condiciones:**
- la severidad actual difiere 2 puntos o más de la severidad por defecto;
- se sube a 9;
- baja de 5 un modo que partía de 7 o más;
- el modo ya estaba confirmado con texto.

**Segunda revisión.** Se exige si la severidad se ajusta a mano y baja 3 puntos o más respecto a la
severidad por defecto. Estados posibles:
- Sin 2ª revisión;
- 2ª revisión pendiente;
- 2ª revisión aprobada;
- 2ª revisión rechazada.

Solo la puede resolver un usuario distinto del evaluador.

**Contexto FMEA** (panel lateral):
- descripción y clasificación del modo;
- contexto AI Act del sistema;
- controles relacionados del catálogo, con su estado en el sistema;
- notas por dimensión;
- historial de cambios del ítem.

### Exportación

**Exportar PDF** abre una página imprimible (HTML, no un fichero PDF). Contiene:
- metadatos de la evaluación;
- una tabla por dimensión con severidad por defecto, O, D, severidad actual, estado y justificación.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Confirmar S_actual** | Roles con permiso | `saveFmeaItem`: confirma el ítem | Historial «Modo de fallo evaluado» y del ítem. Si se reconfirma, la segunda revisión vuelve a empezar |
| **Posponer** | Ídem | Pospone el ítem y borra sus valores | Historial «Modo de fallo pospuesto» |
| Confirmación con aviso de propagación | Ídem | Si la severidad es 4 o más y el modo puede causar o amplificar otros modos activos, muestra «Advertencia de propagación causal» con la lista | — |
| **Guardar borrador** y guardado automático (2,5 s tras cada cambio) | Ídem | `saveFmeaDraft` | Guarda todos los ítems. Historial «Borrador FMEA guardado» |
| **Delegar como tarea** | Ídem | Crea una [tarea](../glosario.md#tarea) con título, responsable, prioridad (Media por defecto) y fecha | Notifica al asignado |
| **Aprobar 2ª revisión** / **Solicitar revisión de nuevo** | Responsable del SGAI no evaluador | `resolveFmeaSecondReview` | El rechazo exige una nota de al menos 50 caracteres. Historial «Segunda revisión aprobada» o «rechazada» |
| **Aplicar a N modos** / **Retirar estimación** | Roles con permiso | Estimación por familia | Recarga la página |
| **Posponer seleccionados** / **Restablecer a pendiente** | Ídem | Acciones en bloque, sin confirmación | Posponer borra también la justificación |
| **Enviar a revisión** / **Enviar a alta dirección** (si hay severidad 9) | Ídem | `submitFmeaForReview`. Con severidad 9 pide confirmación | Ver abajo |
| **Exportar PDF** · **Comparar versiones** | Todos | Abren la exportación y la [Comparativa FMEA](fmea-comparativa.md) (desde la versión 2) | — |
| **Nueva versión** | Analista de riesgos, Responsable del sistema | `startFmeaReevaluationAction`, con confirmación. Solo en la versión vigente y si no hay otra en curso | Ver [Versiones](#versiones) |

**Envío a revisión.** La evaluación pasa a «En revisión» y siempre se crea (o, en un reenvío, se
actualiza) su [plan de tratamiento](plan-de-tratamiento.md) en borrador: la evaluación y el plan son una
sola evaluación de riesgos y se aprueban juntos (DP-03, bloque B07).
- **Acciones:** una por candidato (modos con severidad 7 o más, o que pasaron segunda revisión). Sin
  candidatos, el plan no tiene acciones; se envía igualmente a aprobación y se cierra al aprobarse.
- **Plan:** lleva:
  - código PTR-año-nnn;
  - zona;
  - nivel de aprobación;
  - aprobador asignado;
  - fecha límite (30, 90, 180 o 365 días);
  - cadencia de revisión.
- **Reenvío** (plan devuelto a borrador y evaluación corregida): se recalculan zona, nivel de aprobación,
  cadencia y recuentos; si cambia el nivel, se vuelve a asignar aprobador. Las acciones de modos que han
  dejado de ser candidatos se retiran y sus tareas se cancelan.
- **Evaluador:** se mantiene quien abrió la evaluación; quien la reenvía no lo sustituye.
- **Prioridades:** se recalculan con la severidad residual.
- **Navegación:** se abre el plan.

**Cambios tras el envío.** Una evaluación enviada se puede retocar mientras su plan siga en borrador:
vuelve a «Borrador» para reenviarla, sin cambiar el evaluador. Con el plan en aprobación o aprobado, la
evaluación queda en solo lectura.

Los ítems pendientes se guardan tal como están: el guardado automático no les asigna severidad actual.

**Aprobación.** Al aprobarse el plan, por el aprobador asignado o por un
[flujo de aprobación](aprobaciones.md), la evaluación pasa a «Aprobada» con su aprobador, la fecha y la
próxima revisión según la cadencia del plan (mensual, trimestral, semestral o anual). Historial
«Evaluación de riesgos aprobada».

### Versiones

Una barra sobre los indicadores sitúa la evaluación entre las versiones del sistema (no aparece en la
primera evaluación mientras está en curso):

| Estado de la versión | Barra |
|---|---|
| Aprobada | «Versión N · Vigente», fecha de aprobación y próxima revisión (en rojo si ha vencido). Botón **Nueva versión** para quien puede abrirla; si no, indica quién la abre. Si ya hay otra en curso, enlace **Ir a la versión M en curso** |
| En borrador o en revisión, con una vigente | «Versión N · En curso»: «Sustituirá a la versión M cuando se apruebe su plan» y enlace **Ver versión vigente** |
| Sustituida | «Versión N · Sustituida», solo lectura, y enlace **Ver versión vigente** |

**Nueva versión** crea la versión siguiente con los modos priorizados en ese momento (solo los
regulatorios):
- los modos que estaban confirmados en la vigente arrancan con sus valores, su justificación y su segunda
  revisión; al cambiar un valor, el guardado vuelve a calcular la segunda revisión;
- los modos nuevos arrancan pendientes;
- se copian las estimaciones por familia;
- historial «Nueva versión de la evaluación FMEA», con el número de modos copiados.

La versión anterior sigue vigente hasta que se aprueba el plan de la nueva. Entonces pasa a «Sustituida»;
su plan, si seguía abierto, también, y sus acciones abiertas se cancelan con sus tareas (historial
«Versión anterior sustituida»).

## Validaciones

| Situación | Mensaje |
|---|---|
| Valores fuera de rango al confirmar | «Para confirmar un ítem necesitas O, D real y S actual válidos.» |
| Falta justificación | «La justificación es obligatoria y debe tener al menos 50 caracteres.» |
| Envío con ítems sin resolver | «La evaluación todavía no puede enviarse: quedan N pendiente(s) y M pospuesto(s) por resolver.» |
| Envío con justificaciones pendientes | «Hay ítems que requieren justificación obligatoria antes de enviarse a revisión.» |
| Envío con segundas revisiones pendientes | «Quedan N modo(s) pendientes de 2ª revisión antes del envío.» |
| Segunda revisión por el evaluador | «La segunda revisión debe realizarla un usuario distinto del evaluador principal.» |
| Segunda revisión sin permiso | «No tienes permisos para realizar la segunda revisión.» |
| Estimación por familia con cambios sin guardar | «Tienes cambios sin guardar en la lista de modos. Guárdalos antes de aplicar una estimación de familia.» |
| Tarea ya delegada | «Ya existe una tarea delegada para este modo de fallo.» |

El botón de envío se deshabilita mientras quedan pendientes, pospuestos o segundas revisiones, y lo
explica en su ayuda.

## Estados

```mermaid
stateDiagram-v2
  state Evaluación {
    [*] --> Borrador
    Borrador --> En_revisión: enviar
    En_revisión --> Borrador: guardar
    En_revisión --> Aprobada: plan aprobado
    Aprobada --> Sustituida: plan de la versión nueva aprobado
  }
  state Ítem {
    [*] --> Pendiente
    Pendiente --> Confirmado: confirmar o familia
    Pendiente --> Pospuesto: posponer
    Confirmado --> Pospuesto: posponer
    Pospuesto --> Confirmado: confirmar
    Confirmado --> Pendiente: restablecer
  }
```

Las evaluaciones «Aprobada» y «Sustituida» son de solo lectura.

## Vistas relacionadas

- [Ficha del sistema](ficha-sistema.md): activación y priorización de modos de fallo.
- [Plan de tratamiento](plan-de-tratamiento.md): se crea al enviar.
- [Comparativa FMEA](fmea-comparativa.md), [Evaluaciones](evaluaciones.md).
- Negocio: [Análisis de modos de fallo (FMEA)](../negocio/analisis-modos-de-fallo.md).
