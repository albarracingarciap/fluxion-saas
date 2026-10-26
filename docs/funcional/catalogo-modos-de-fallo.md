---
id: FUN-CAT-MODOS
titulo: Catálogo de modos de fallo
tipo: funcional
modulo: catalogo-tablas-basicas
audiencia: tecnica
version: 0.2
fuente:
  - apps/web/app/(app)/datos/actions.ts
  - apps/web/lib/auth/platform.ts
  - apps/web/app/(app)/datos/modos-de-fallo/page.tsx
  - apps/web/app/(app)/datos/modos-de-fallo/actions.ts
  - apps/web/lib/failure-modes/activation-engine.ts
  - supabase/migrations/00000000000001_schema.sql
  - supabase/migrations/00000000000005_seed_compliance.sql
  - supabase/migrations/20260905090000_origen_normativo_modos.sql
  - supabase/migrations/20260907090000_modos_huecos_normativos.sql
---

# Catálogo de modos de fallo

Mantenimiento del catálogo de [modos de fallo](../glosario.md#modo-de-fallo): código, dimensión,
criterios R.I.D.E. y severidad por defecto.

## Propósito

Mantener la lista de formas en que un sistema de IA puede fallar, de la que Fluxion activa en cada
sistema las que le aplican.

## Acceso y permisos

- **Ruta:** `/datos/modos-de-fallo`
- **Navegación:** tarjeta **Modos de Fallo** del [Catálogo de tablas básicas](catalogo.md). En el menú
  figura como «Próximamente».
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Administración de la plataforma (`profiles.platform_role` = `platform_admin`) | Sí | Crear, editar y eliminar |
| Resto de roles | Sí | Solo consulta: no ven los botones de alta, edición ni borrado, y el servidor rechaza esas acciones |

> **Pendiente de implementar.** Catálogo por organización mantenido por el Administrador. Ver
> [Catálogo de tablas básicas](catalogo.md#acceso-y-permisos).

## Campos

**Lista** «Trazabilidad (N registros)», ordenada por código, de 50 en 50. No tiene búsqueda ni filtros.

| Columna | Descripción | Origen (`compliance.failure_modes.`) |
|---|---|---|
| **Código** | Por ejemplo, «TEC-001». Único | `code` |
| **Dimensión** | [Dimensión de riesgo](../glosario.md#dimensión-de-riesgo): Técnicas · Seguridad · Éticas · Gobernanza · ROI · Legales Tipo B | `dimension_id` → `risk_dimensions` |
| **Modo de Fallo** | Nombre, con «bloque / subcategoría» debajo | `name`, `bloque`, `subcategoria` |
| **R**, **I**, **D**, **E** | [Criterios R.I.D.E.](../glosario.md#criterios-ride), de 0 a 3 | `r_value`, `i_value`, `d_value`, `e_value` |
| **S. Def** | [Severidad por defecto](../glosario.md#severidad-por-defecto-s_default), de 2 a 9 | `s_default` |

Sin resultados: «No se encontraron resultados».

**Formulario Añadir / Editar Modo de Fallo:**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| **Código Único** | texto | Sí | Por ejemplo, «TEC-001» |
| **Dimensión** | selección | Sí | Por defecto, Técnicas |
| **Nombre / Modo de Fallo** | texto largo | Sí | — |
| **Bloque** · **Subcategoría** | texto | Sí | Texto libre |
| **Risk (R)** · **Impact (I)** · **Detec. (D)** · **Exp. (E)** | número 0-3 | Sí | Por defecto 0 |
| **S. Defecto** | número 2-9 | Sí | Por defecto 2 |
| **Peso W** | calculado | — | «Calculado automáticamente» |

En el catálogo estándar, el peso es W = 1 + (R+I+D+E)/12 y la severidad por defecto es
S = round(2 + (R+I+D+E)·7/12).

> TODO: confirmar varias reglas del formulario.
> - **Peso W:** se calcula como la media (R+I+D+E)/4, que no coincide con la fórmula del catálogo
>   estándar.
> - **Severidad por defecto:** se introduce a mano y no se deriva de R.I.D.E.
> - **Datos que no se pueden editar:** la descripción, el tipo (producto o proceso), el
>   [origen normativo](../glosario.md#origen-normativo-del-modo-de-fallo) y las referencias normativas.
>   Los modos nuevos nacen sin descripción, como «Producto» y sin origen, y por tanto entran en el FMEA
>   como regulatorios.
> - **Etiquetas R.I.D.E.:** aparecen en inglés.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Añadir Nuevo** / **Editar** › **Guardar** | Administración de la plataforma | Crea o actualiza el modo | Ver abajo |
| **Eliminar** | Administración de la plataforma | Pide confirmación («¿Estás seguro de que deseas eliminar el modo de fallo {código}?») y lo borra | Ver abajo |
| **Volver a Datos** | Todos | Vuelve al [Catálogo de tablas básicas](catalogo.md) | — |

**Efectos en los datos existentes:**

| Cambio | Efecto |
|---|---|
| Nombre o descripción | Se ve en todas las evaluaciones e informes, incluidos los ya existentes |
| Severidad por defecto | Solo afecta a las evaluaciones FMEA nuevas; las existentes conservan la suya. La ficha del sistema muestra la nueva |
| Código, bloque, subcategoría o nombre | Cambian qué sistemas activan el modo: las reglas de activación se basan en ellos |
| Dimensión | Las activaciones existentes conservan la dimensión anterior |
| Eliminar | Elimina sus activaciones en todos los sistemas. Si el modo se usa en alguna evaluación FMEA, el borrado falla |

No hay mensaje de confirmación. Los errores se muestran en una ventana del navegador con el texto técnico
de la base de datos: «Error al guardar: …» o «Error eliminando: …».

> TODO: confirmar el registro de cambios. Los cambios en el catálogo no dejan rastro de auditoría.

## Validaciones

| Situación | Resultado |
|---|---|
| Código repetido | Error de la base de datos |
| R, I, D, E fuera de 0-3 o severidad fuera de 2-9 | El formulario no deja guardar; la base de datos lo rechaza |

## Estados

No aplica: no hay estado activo o inactivo y el borrado es definitivo.

## Vistas relacionadas

- [Catálogo de medidas](catalogo-medidas.md), [Modo de fallo y medida](catalogo-modo-medida.md),
  [Relaciones causales](catalogo-relaciones-causales.md).
- [Ficha del sistema](ficha-sistema.md), pestaña Modos de fallo; [Evaluación FMEA](fmea-evaluacion.md).
- Negocio: [Catálogo de tablas básicas](../negocio/catalogo-tablas-basicas.md).
