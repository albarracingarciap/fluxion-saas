---
id: FUN-CAT-MEDIDAS
titulo: Catálogo de medidas
tipo: funcional
modulo: catalogo-tablas-basicas
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/datos/medidas/page.tsx
  - apps/web/app/(app)/datos/medidas/actions.ts
  - apps/web/lib/fmea/data.ts
  - apps/web/lib/fmea/treatment-plan.ts
  - supabase/migrations/00000000000001_schema.sql
  - supabase/migrations/00000000000005_seed_compliance.sql
---

# Catálogo de medidas

Mantenimiento de las [plantillas de control](../glosario.md#plantilla-de-control): las medidas de control
y mitigación que se asocian a modos de fallo y se sugieren en el plan de tratamiento.

## Propósito

Mantener la lista de medidas genéricas (CTL-001 a CTL-059 en el catálogo estándar), con su guía de
implementación y sus referencias normativas.

## Acceso y permisos

- **Ruta:** `/datos/medidas`
- **Navegación:** tarjeta **Medidas de Control** del [Catálogo de tablas básicas](catalogo.md) y menú
  **Datos › Medidas**.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Crear, editar y eliminar |

> **Pendiente de implementar.** Restringir el mantenimiento al Administrador y tener un catálogo por
> organización. Ver [Catálogo de tablas básicas](catalogo.md#acceso-y-permisos).

## Campos

**Filtro «Categoría»:** Todas · Documentación · Técnica · Monitorización · Gobernanza · Proceso ·
Formación.

**Lista** «Medidas de Control (N registros)», ordenada por código, de 50 en 50:

| Columna | Descripción | Origen (`compliance.control_templates.`) |
|---|---|---|
| **Código** | Por ejemplo, «CTL-001». Único | `code` |
| **Categoría** | Etiqueta de color | `category` |
| **Título** | Con la descripción debajo | `title`, `description` |
| **Referencias normativas** | Las cuatro primeras y «+N» | `tags` |
| **Activa** | Punto verde o gris | `is_active` |

Sin resultados: «No se encontraron medidas de control».

**Formulario Nueva / Editar Medida de Control:**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| **Código único** | texto | Sí | Por ejemplo, «CTL-060» |
| **Categoría** | selección | Sí | Por defecto, Documentación |
| **Título** | texto | Sí | — |
| **Descripción** | texto largo | No | — |
| **Guía de implementación** | texto largo | No | — |
| **Referencias normativas (separadas por coma)** | texto | No | Por ejemplo, «Art. 9 AI Act, ISO A.6.1» |
| **Medida activa** | interruptor | — | Activa por defecto |

> TODO: confirmar las categorías.
> - **«organizational»:** 17 medidas del catálogo estándar tienen esta categoría, que la vista no
>   contempla. Aparece sin traducir, no se puede filtrar y al editar el selector muestra otra.
> - **Proceso y Formación:** la vista las ofrece, pero ninguna medida las usa.

> TODO: confirmar varios usos del catálogo de medidas.
> - **Medidas sugeridas:** las sugerencias de la evaluación FMEA, del plan de tratamiento y de las
>   brechas piden a la base de datos un dato que no existe. Es probable que no aparezca ninguna.
> - **Medidas inactivas:** desactivar una medida solo la oculta al relacionarla con modos de fallo; sigue
>   apareciendo en las sugerencias.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Añadir Medida** / **Editar** › **Guardar** | Todos | Crea o actualiza la medida | Los cambios de título y descripción se ven en los controles de las organizaciones que la usan |
| **Eliminar** | Todos | Pide confirmación («¿Eliminar la medida {código}?») y la borra | Elimina sus relaciones con modos de fallo. Si alguna organización la usa como control, el borrado falla |
| **Volver a Datos** | Todos | Vuelve al [Catálogo de tablas básicas](catalogo.md) | — |

No hay mensaje de confirmación. Los errores se muestran en una ventana del navegador: «Error al guardar:
…» o «Error eliminando: …».

## Validaciones

Código, categoría y título obligatorios. El código no se puede repetir.

## Estados

Activa o inactiva. El borrado es definitivo.

## Vistas relacionadas

- [Modo de fallo y medida](catalogo-modo-medida.md), [Catálogo de modos de fallo](catalogo-modos-de-fallo.md).
- [Plan de tratamiento](plan-de-tratamiento.md), [Evaluación FMEA](fmea-evaluacion.md).
- Negocio: [Catálogo de tablas básicas](../negocio/catalogo-tablas-basicas.md).
