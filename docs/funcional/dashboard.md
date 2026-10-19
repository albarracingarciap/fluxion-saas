---
id: FUN-DASHBOARD
titulo: Dashboard
tipo: funcional
modulo: transversal
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/dashboard/page.tsx
  - apps/web/app/(app)/dashboard/OnboardingGuide.tsx
  - apps/web/lib/dashboard/data.ts
  - apps/web/lib/treatment-plans/data.ts
  - apps/web/lib/causal-graph/chains.ts
---

# Dashboard

Panel principal de la organización: indicadores de cumplimiento, estado documental, planes de
tratamiento, riesgos priorizados y siguiente paso recomendado. Si la organización todavía no tiene
sistemas, muestra en su lugar una guía de primeros pasos.

## Propósito

Dar una visión ejecutiva del estado de gobierno de la IA de la organización y orientar sobre qué hacer
a continuación. Es de solo lectura: todas sus acciones son enlaces a otras vistas.

## Acceso y permisos

- **Ruta:** `/dashboard`
- **Navegación:** **Principal › Dashboard**. También es el destino tras el inicio de sesión y el
  onboarding.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí, el mismo contenido | Navegar a las vistas enlazadas |

Requiere sesión y onboarding completado: sin sesión redirige a `/login`, y sin onboarding, a
`/onboarding`.

## Campos

La vista tiene dos variantes.

### Variante sin sistemas

Cuando la organización no tiene ningún sistema en `ai_systems`:

| Bloque | Contenido |
|---|---|
| **Guía de despliegue** | Cuatro pestañas: Inventario, Cumplimiento, Riesgos y Gobernanza. Se abre la del foco elegido en el onboarding (`organizations.settings.first_focus`), marcada «Tu foco». Cada pestaña muestra tres pasos y un botón: **Registrar primer sistema** o, en Gobernanza, **Ir a mi organización** |
| **Dashboard listo** | Invita a registrar el primer sistema, con los botones **Crear primer sistema**, **Cuestionario preliminar** y **Ver inventario**, y explica lo que desbloquea |

### Variante con sistemas

| Bloque | Contenido | Cálculo |
|---|---|---|
| **Resumen operativo** | Nombre de la organización y accesos **Inventario**, **Cuestionario** y **+ Sistema** | — |
| **Compliance global** | Porcentaje medio de cumplimiento AI Act y media ISO 42001 | Por sistema, media de sus obligaciones AI Act: 100 si está resuelta, 55 en curso, 0 en otro caso. Sin registro de [obligación](../glosario.md#obligación), se deduce de los indicadores de documentación de la ficha |
| **Gaps críticos** | Obligaciones no resueltas de prioridad alta o crítica | Suma de todos los sistemas |
| **Sistemas IA** | Número de sistemas, cuántos en producción y cuántos de alto riesgo | Alto riesgo incluye «Práctica prohibida» |
| **Evidencias OK** | [Evidencias](../glosario.md#evidencia) válidas y pendientes de revisión | `system_evidences.status` |
| **Declaración de Aplicabilidad** | Estado del documento, % de cumplimiento, controles implantados y en progreso, aplicables y versión. Botón **Ver SoA** | Solo si existe la [Declaración de Aplicabilidad](../glosario.md#declaración-de-aplicabilidad-iso-42001) |
| **Gobierno documental** | Total, válidas, pendientes, que caducan en 30 días o menos, sin responsable y cobertura válida. Enlace **Ver biblioteca** | — |
| **Planes de tratamiento** | Activos, acciones vencidas, tasa de slippage, mediana de cierre, revisiones y progreso medio. Enlaces **Ver todos** y revisiones | Solo si hay planes no sustituidos. Slippage: mitigaciones completadas sin severidad residual alcanzada o por encima del objetivo |
| **Estado de compliance** | Porcentaje AI Act y cuatro pilares: documentación técnica, supervisión humana, transparencia y gobernanza y riesgos. También la madurez ISO 42001 | Cada obligación se asigna a un pilar por palabras de su título |
| **Sistemas por estado** | Seis sistemas más rezagados con estado, nivel de riesgo, fase del flujo, % de cumplimiento, brechas y evidencias pendientes | Orden: brechas críticas, alto riesgo, menor cumplimiento, producción |
| **Top 5 subcategorías con mayor nivel de riesgo** | Subcategorías de [modos de fallo](../glosario.md#modo-de-fallo) con mayor puntuación agregada | Modos priorizados de todos los sistemas |
| **Top 5 modos de fallo más críticos** | Modos con mayor puntuación y número de sistemas afectados | Ídem |
| **Cadenas causales activas** | Cadenas de 3 a 5 eslabones del [grafo causal](../glosario.md#grafo-causal) activas en algún sistema | Solo si hay alguna |
| **Últimos sistemas registrados** | Los cinco más recientes | — |
| **Siguiente paso recomendado** | Una recomendación con su botón | Primera regla que se cumple: activar modos de fallo de un sistema de alto riesgo; continuar un FMEA en borrador; completar un plan en borrador; revisar evidencias pendientes; atender el sistema más rezagado |

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| Enlaces de bloques y filas | Todos | Navegan a [Inventario](inventario.md), [Alta de sistema](inventario-alta.md), [Ficha del sistema](ficha-sistema.md), [Cuestionario preliminar](cuestionario-preliminar.md), [Biblioteca de evidencias](evidencias.md), [Planes de tratamiento](planes-de-tratamiento.md), [Revisiones pendientes](revisiones-pendientes.md), [Declaración de Aplicabilidad](declaracion-aplicabilidad.md) u [Organización](organizacion.md) | Ninguno: la vista no escribe datos |
| Pestañas de la guía | Todos | Cambian la pestaña visible | No cambian el foco guardado |

> TODO: confirmar varios comportamientos que parecen no intencionados:
> - El paso del onboarding promete cambiar el foco «desde el dashboard», pero las pestañas no lo guardan.
> - **Revisar evidencias pendientes** lleva al inventario y no a la biblioteca de evidencias, y
>   **Abrir plan** lleva al FMEA.
> - **Activos** incluye planes en borrador y en revisión, aunque su descripción dice «en ejecución o
>   aprobados».
> - Los controles «en progreso» de la SoA incluyen los no iniciados.
> - El aviso de revisiones del menú y la tarjeta de planes cuentan las vencidas con criterios distintos
>   (fecha igual o anterior a hoy frente a anterior a hoy).

## Validaciones

No aplica: la vista no tiene formularios.

## Estados

No aplica.

## Vistas relacionadas

- [Onboarding](onboarding.md): define el foco de la guía.
- [Navegación](navegacion.md): menú y avisos comunes.
- Las vistas enlazadas en **Acciones**.
- Negocio: [Visión general](../negocio/vision-general.md).
