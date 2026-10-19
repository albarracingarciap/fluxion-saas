---
id: FUN-FMEA-COMPARAR
titulo: Comparativa FMEA
tipo: funcional
modulo: analisis-modos-de-fallo
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/inventario/[id]/fmea/[evaluationId]/comparar/page.tsx
  - apps/web/app/(app)/inventario/[id]/fmea/[evaluationId]/comparar/fmea-comparison-client.tsx
  - apps/web/lib/fmea/data.ts
---

# Comparativa FMEA

Comparación entre una evaluación FMEA y la versión anterior del mismo sistema. Muestra cómo han
cambiado las severidades por modo y por dimensión, y la zona global.

## Propósito

Demostrar la evolución del riesgo de un sistema entre dos ciclos de evaluación.

## Acceso y permisos

- **Ruta:** `/inventario/[id]/fmea/[evaluationId]/comparar`
- **Navegación:** botón **Comparar versiones** de la [Evaluación FMEA](fmea-evaluacion.md), visible desde
  la versión 2.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Solo lectura |

Las versiones no se eligen:
- la actual es la de la URL;
- la anterior es la versión más alta, previa a la actual, en estado «Aprobada» o «Sustituida».

Si no existe, la vista devuelve «no encontrado».

> TODO: confirmar el acceso a esta vista. Hoy es inalcanzable: ninguna evaluación llega a «Aprobada» ni a
> «Sustituida» (ver [Evaluación FMEA](fmea-evaluacion.md#estados)), de modo que nunca existe una versión
> anterior que comparar.

## Campos

| Bloque | Contenido |
|---|---|
| Versiones | **Versión anterior** (estado, fecha de aprobación, zona) y **Versión actual** (estado, fecha de creación, zona) |
| Indicadores | **Mejoraron**, **Empeoraron**, **Sin cambio**, **Nuevos modos**, **Zona global** (anterior → actual) |
| **Por dimensión** | Para cada [dimensión](../glosario.md#dimensión-de-riesgo): variación de la media, número de modos mejorados, empeorados y nuevos, máximo y media de la severidad actual |
| **Modos de fallo (N)** | Una tabla por dimensión: modo, severidad en cada versión y variación («Nuevo», «Retirado» o ±n) |

Filtros de la tabla de modos: Todos, Mejoraron, Empeoraron, Sin cambio y Nuevos/Retirados.

Se compara la [severidad actual](../glosario.md#severidad-actual-s_actual) de cada modo entre las dos
versiones.

> TODO: confirmar el cálculo de la comparación.
> - Usa la severidad guardada aunque el ítem esté pendiente.
> - Los modos retirados aparecen como «Pendiente» en la versión actual.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| Filtros de modos | Todos | Filtran la tabla | — |
| **Volver al sistema** / **Evaluación FMEA** | Todos | Navegación | — |

## Validaciones

No aplica.

## Estados

No aplica.

## Vistas relacionadas

- [Evaluación FMEA](fmea-evaluacion.md).
- Negocio: [Análisis de modos de fallo (FMEA)](../negocio/analisis-modos-de-fallo.md).
