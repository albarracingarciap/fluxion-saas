---
id: FUN-EVALUACIONES
titulo: Evaluaciones
tipo: funcional
modulo: analisis-modos-de-fallo
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/evaluaciones/page.tsx
  - apps/web/lib/evaluations/data.ts
---

# Evaluaciones

Vista transversal del estado de evaluación de riesgos de todos los sistemas: cola priorizada,
evaluaciones FMEA en curso, segundas revisiones y planes de tratamiento.

## Propósito

Saber en qué punto del [análisis de modos de fallo](../glosario.md#análisis-de-modos-de-fallo-fmea) está
cada sistema, qué requiere atención inmediata y cuál es el siguiente paso.

## Acceso y permisos

- **Ruta:** `/evaluaciones`
- **Navegación:** **Evaluación › Evaluaciones**.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Todos los sistemas de la organización | Navegar; la vista no escribe datos |

## Campos

### Indicadores

| Indicador | Cálculo |
|---|---|
| **FMEA activas** | Evaluaciones en borrador o en revisión |
| **2ª revisión** | Ítems que requieren [segunda revisión](../glosario.md#segunda-revisión) y no la tienen aprobada |
| **Planes abiertos** | Planes en borrador o en aprobación |
| **Planes vencidos** | Planes no cerrados con fecha límite pasada |
| **Sin iniciar** | Sistemas con modos priorizados que no tienen ninguna evaluación |
| **Escalados Zona I** | Sistemas con algún modo de severidad 9 o con plan cuya zona objetivo es la I. Debajo, tareas FMEA activas |

### Distribución por zona FMEA

Número de sistemas en cada [zona de riesgo](../glosario.md#zona-de-riesgo), según su evaluación más
reciente. Solo aparece si algún sistema está evaluado.

### Pipeline de evaluaciones

Una fila por sistema, sin filtros ni paginación. El orden prioriza los sistemas con modos de severidad 9,
los planes vencidos y las segundas revisiones pendientes.

| Campo | Contenido |
|---|---|
| Sistema | Nombre, código, nivel de riesgo AI Act y estado |
| Etapa | Plan en borrador · Plan en aprobación · FMEA en borrador · FMEA en revisión · Pendiente de iniciar · Sin cola priorizada |
| Cola | Número de modos prioritarios y en observación |
| Etiquetas | Vencido · zona · zona objetivo del plan · número de tareas |
| **FMEA** | Versión y estado, o «Sin iniciar» |
| **Pendientes** | Ítems pendientes y pospuestos |
| **2ª revisión** | Ítems pendientes de segunda revisión |
| **Deadline** | Fecha límite del plan, «Vencido» o «Sin plan» |
| **Última actividad** | Última modificación de la evaluación o del plan |
| Acción | Abrir plan · Continuar FMEA · Iniciar FMEA · Abrir sistema |

### Atención inmediata

Los cinco primeros sistemas que necesitan atención:
- con modos de severidad 9;
- con segundas revisiones pendientes;
- con el plan vencido;
- con el plan o el FMEA en borrador.

### Siguiente paso recomendado

Primera regla que se cumple:
1. **Escalado activo en Zona I**.
2. **Plan de tratamiento vencido**.
3. **Resolver segundas revisiones**.
4. **Completar plan de tratamiento**.
5. **Continuar evaluación FMEA**.
6. **Iniciar evaluación en sistema priorizado**.
7. Si no se cumple ninguna: **Pipeline estable**.

> TODO: confirmar varios indicadores.
> - Los modos de severidad 9 se cuentan también en ítems pendientes. El guardado automático de la
>   evaluación les da una severidad sugerida, y eso puede disparar «Zona I» sin que nadie haya evaluado.
> - **2ª revisión** incluye las rechazadas y las de evaluaciones antiguas.
> - El estado del FMEA se muestra en inglés (`draft`, `in_review`).

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| Pulsar una fila o su acción | Todos | Navega al plan, a la [Evaluación FMEA](fmea-evaluacion.md), al inicio del FMEA o a la [Ficha del sistema](ficha-sistema.md) | — |
| **Ver inventario** / **Dashboard global** | Todos | Navegación | — |

## Validaciones

No aplica.

## Estados

No aplica: la vista muestra los estados de evaluaciones y planes. Ver
[Evaluación FMEA](fmea-evaluacion.md#estados) y [Plan de tratamiento](plan-de-tratamiento.md#estados).

## Vistas relacionadas

- [Evaluación FMEA](fmea-evaluacion.md), [Plan de tratamiento](plan-de-tratamiento.md),
  [Planes de tratamiento](planes-de-tratamiento.md).
- Negocio: [Análisis de modos de fallo (FMEA)](../negocio/analisis-modos-de-fallo.md).
