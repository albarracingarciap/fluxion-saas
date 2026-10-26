---
id: FUN-CATALOGO
titulo: Catálogo de tablas básicas
tipo: funcional
modulo: catalogo-tablas-basicas
audiencia: tecnica
version: 0.2
fuente:
  - apps/web/app/(app)/datos/actions.ts
  - apps/web/lib/auth/platform.ts
  - apps/web/app/(app)/datos/page.tsx
  - apps/web/components/layout/sidebar.tsx
---

# Catálogo de tablas básicas

Página de entrada al [catálogo de tablas básicas](../glosario.md#catálogo-de-tablas-básicas): los datos
de referencia con los que trabaja Fluxion.

## Propósito

Dar acceso a cada tabla del catálogo y a sus relaciones. La vista se titula **Base de Datos Interna**:
«Mantenimiento de catálogos y configuración maestra del sistema FMEA.».

## Acceso y permisos

- **Ruta:** `/datos`
- **Menú:** grupo **Datos**, entrada **Datos**, con un submenú por cada tabla. La primera opción, **Base de
  datos**, abre esta página.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Navegar |

Hoy hay un único catálogo, común a todas las organizaciones: el
[catálogo estándar de Fluxion](../glosario.md#catálogo-estándar-de-fluxion). Lo modifica solo la
administración de la plataforma (`profiles.platform_role` = `platform_admin`, equipo de Fluxion); el resto
de roles lo consultan. Cada acción de escritura lo comprueba en el servidor (`lib/auth/platform.ts`) y las
vistas ocultan los botones de alta, edición y borrado (`canEditCatalogs`).

> **Pendiente de implementar.** Catálogo por organización, a partir de una copia del catálogo estándar,
> mantenido por el Administrador de cada organización, y oferta de actualizaciones (`_inventario.md` §14.1).

> TODO: confirmar varios textos de la página y del menú.
> - **Solo lectura:** la página dice «Solo lectura para tenants comunes, edición como administrador.»;
>   la edición es de la administración de la plataforma, no del Administrador de la organización.
> - **Menú:** la entrada **Modos de fallo** figura como «Próximamente», aunque la vista funciona y se
>   llega desde esta página.
> - **Nombre:** el catálogo se titula «Base de Datos Interna», no «Catálogo de tablas básicas».

## Campos

**Catálogos maestros:**

| Tarjeta | Descripción en la vista | Vista |
|---|---|---|
| **Modos de Fallo** | Vectores de riesgo con criterios R.I.D.E., severidad por defecto y dimensiones | [Catálogo de modos de fallo](catalogo-modos-de-fallo.md) |
| **Medidas de Control** | Plantillas de controles con guía de implementación y referencias normativas | [Catálogo de medidas](catalogo-medidas.md) |
| **Tipos de Evidencia** | Categorías de evidencia que se vinculan a obligaciones | [Catálogo de tipos de evidencia](catalogo-tipos-de-evidencia.md) |
| **Obligaciones** | Obligaciones por marco: AI Act, ISO 42001, RGPD, DORA… | [Catálogo de obligaciones](catalogo-obligaciones.md) |

**Correspondencias y grafos:**

| Tarjeta | Descripción en la vista | Vista |
|---|---|---|
| **Obligación ↔ Evidencia** | Tipos de evidencia requeridos, recomendados u opcionales por obligación | [Obligación y evidencia](catalogo-obligacion-evidencia.md) |
| **Modo ↔ Medida** | Medidas de control por modo de fallo, con la mitigación principal | [Modo de fallo y medida](catalogo-modo-medida.md) |
| **Relaciones Causales** | Relaciones causa-efecto del grafo causal | [Relaciones causales](catalogo-relaciones-causales.md) |
| **Grafo Causal** | Visualización interactiva del grafo | [Grafo causal](catalogo-grafo-causal.md) |

La página no muestra recuentos.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Gestionar registros** (cada tarjeta) | Todos | Navega a la vista de la tabla | — |
| **Volver al dashboard** | Todos | Navega al [Dashboard](dashboard.md) | — |

## Validaciones

No aplica.

## Estados

No aplica.

## Vistas relacionadas

- Las ocho vistas del catálogo, enlazadas en **Campos**.
- Negocio: [Catálogo de tablas básicas](../negocio/catalogo-tablas-basicas.md).
