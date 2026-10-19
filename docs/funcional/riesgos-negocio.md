---
id: FUN-RIESGOS-NEGOCIO
titulo: Riesgos de negocio
tipo: funcional
modulo: evaluacion-de-impacto
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/inventario/[id]/riesgos-negocio/page.tsx
  - apps/web/app/(app)/inventario/[id]/riesgos-negocio/riesgos-client.tsx
  - apps/web/app/(app)/inventario/[id]/riesgos-negocio/actions.ts
  - supabase/migrations/20260913090000_registro_riesgos_negocio.sql
---

# Riesgos de negocio

Registro de los [riesgos de negocio](../glosario.md#riesgo-de-negocio) de un sistema: los modos de fallo
de origen «negocio» (coste, adopción, capacidades, dependencias), que no entran en el análisis de modos
de fallo regulatorio.

## Propósito

Valorar con probabilidad e impacto los riesgos que amenazan la viabilidad del sistema y decidir una
respuesta, sin el rigor ni la aprobación del FMEA.

## Acceso y permisos

- **Ruta:** `/inventario/[id]/riesgos-negocio`
- **Navegación:** pestaña **Modos de fallo** de la [Ficha del sistema](ficha-sistema.md), aviso «N riesgos
  de negocio, fuera del FMEA» › **Valorarlos en el registro de riesgos de negocio →**. No tiene entrada en
  el menú.
- **Disponibilidad:** módulo Evaluación de impacto.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Valorar y retirar valoraciones |

## Campos

**Indicadores:**
- **Valorados**, como «N de M»;
- **Exposición alta**: riesgos con exposición 15 o más.

**Lista:** primero los valorados, de mayor a menor exposición; después los no valorados, por código.

| Campo | Tipo | Obligatorio | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|---|---|
| Riesgo | solo lectura | — | Código, nombre, subcategoría y descripción del modo de fallo | `compliance.failure_modes` |
| Exposición | calculada | — | «P × I = E», en rojo (15 o más), ámbar (8 o más) o verde. «Sin valorar» si no hay valoración | `business_risk_assessments.exposure` |
| **Probabilidad** | botones 1-5 | Sí | Muy improbable · Improbable · Posible (por defecto) · Probable · Casi seguro | `probability` |
| **Impacto** | botones 1-5 | Sí | Insignificante · Menor · Moderado (por defecto) · Grave · Crítico | `impact` |
| **Respuesta** | opciones | Sí | Mitigar (por defecto) · Aceptar · Transferir · Evitar | `response` |
| **Justificación** | texto largo | Solo si se acepta | — | `justification` |
| **Revisar el** | fecha | No | — | `review_due` |

> TODO: confirmar el responsable del riesgo. Existe en los datos, pero la vista no permite asignarlo.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Guardar** | Todos | `saveBusinessRisk`: crea o actualiza la valoración | Sin historial ni aprobación |
| **Retirar valoración** | Todos | `clearBusinessRisk`: borra la valoración, sin confirmación | El riesgo vuelve a «Sin valorar» |
| **Volver al sistema** | Todos | Navega a la [Ficha del sistema](ficha-sistema.md) | — |

## Validaciones

| Situación | Mensaje |
|---|---|
| Valores fuera de rango | «Probabilidad e impacto tienen que estar entre 1 y 5.» |
| Aceptar sin justificación | «Aceptar un riesgo exige decir por qué se acepta.» |

## Estados

Cada riesgo está «Sin valorar» o «Valorado».

Si el sistema no tiene riesgos de negocio activados, la vista muestra «Este sistema no tiene riesgos de
negocio activados.».

## Vistas relacionadas

- [Ficha del sistema](ficha-sistema.md), [Evaluación FMEA](fmea-evaluacion.md).
- Negocio: [Evaluación de impacto](../negocio/evaluacion-de-impacto.md).
