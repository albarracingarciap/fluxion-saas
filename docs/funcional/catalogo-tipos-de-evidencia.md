---
id: FUN-CAT-TIPOS-EVIDENCIA
titulo: Catálogo de tipos de evidencia
tipo: funcional
modulo: catalogo-tablas-basicas
audiencia: tecnica
version: 0.2
fuente:
  - apps/web/app/(app)/datos/actions.ts
  - apps/web/lib/auth/platform.ts
  - apps/web/app/(app)/datos/tipos-de-evidencia/page.tsx
  - apps/web/app/(app)/datos/tipos-de-evidencia/actions.ts
  - supabase/migrations/00000000000001_schema.sql
  - supabase/migrations/00000000000005_seed_compliance.sql
---

# Catálogo de tipos de evidencia

Mantenimiento de los [tipos de evidencia](../glosario.md#tipo-de-evidencia): las clases de evidencia que
espera cada obligación.

## Propósito

Mantener las categorías de evidencia que se vinculan a las obligaciones en
[Obligación y evidencia](catalogo-obligacion-evidencia.md). El catálogo estándar tiene 20 tipos
(EVT-DOC, EVT-TEC, EVT-PRO, EVT-CER y EVT-REG).

## Acceso y permisos

- **Ruta:** `/datos/tipos-de-evidencia`
- **Navegación:** tarjeta **Tipos de Evidencia** del [Catálogo de tablas básicas](catalogo.md) y menú
  **Datos › Tipos de evidencia**.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Administración de la plataforma (`profiles.platform_role` = `platform_admin`) | Sí | Crear, editar y eliminar |
| Resto de roles | Sí | Solo consulta: no ven los botones de alta, edición ni borrado, y el servidor rechaza esas acciones |

> **Pendiente de implementar.** Catálogo por organización mantenido por el Administrador. Ver
> [Catálogo de tablas básicas](catalogo.md#acceso-y-permisos).

## Campos

**Filtro:** Todos · Documental · Técnica · Proceso · Certificación · Registro.

**Lista**, ordenada por código, de 50 en 50:

| Columna | Descripción | Origen (`compliance.evidence_types.`) |
|---|---|---|
| **Código** | Por ejemplo, «EVT-DOC-01». Único | `code` |
| **Categoría** | documental · técnica · proceso · certificación · registro | `category` |
| **Nombre** | — | `name` |
| **Descripción** | «—» si está vacía | `description` |

Sin resultados: «No se encontraron tipos de evidencia».

**Formulario Nuevo / Editar Tipo de Evidencia:**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| **Código único** | texto | Sí | Por ejemplo, «EVT-DOC-01» |
| **Categoría** | selección | Sí | Por defecto, Documental |
| **Nombre** | texto | Sí | Por ejemplo, «Política de IA documentada» |
| **Descripción** | texto largo | No | — |

> TODO: confirmar varios aspectos de este catálogo.
> - **Uso:** no se usa fuera de esta sección. La [Biblioteca de evidencias](evidencias.md) clasifica las
>   evidencias con su propia lista de tipos, distinta de esta.
> - **Categoría en la lista:** aparece sin traducir.
> - **Filtro:** solo actúa sobre la página cargada, y el contador no cambia al filtrar.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Añadir Tipo** / **Editar** › **Guardar** | Administración de la plataforma | Crea o actualiza el tipo | — |
| **Eliminar** | Administración de la plataforma | Pide confirmación («¿Eliminar el tipo de evidencia {código}?») y lo borra | Elimina también sus relaciones con obligaciones, sin avisar |
| **Volver a Datos** | Todos | Vuelve al [Catálogo de tablas básicas](catalogo.md) | — |

No hay mensaje de confirmación. Los errores se muestran en una ventana del navegador: «Error al guardar:
…» o «Error eliminando: …».

## Validaciones

Código, categoría y nombre obligatorios. El código no se puede repetir.

## Estados

No aplica. El borrado es definitivo.

## Vistas relacionadas

- [Obligación y evidencia](catalogo-obligacion-evidencia.md), [Catálogo de obligaciones](catalogo-obligaciones.md).
- Negocio: [Catálogo de tablas básicas](../negocio/catalogo-tablas-basicas.md).
