---
id: FUN-CAT-OBLIGACIONES
titulo: Catálogo de obligaciones
tipo: funcional
modulo: catalogo-tablas-basicas
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/datos/obligaciones/page.tsx
  - apps/web/app/(app)/datos/obligaciones/actions.ts
  - supabase/migrations/00000000000001_schema.sql
  - supabase/migrations/00000000000005_seed_compliance.sql
  - supabase/migrations/20260904090000_obligaciones_ai_act.sql
  - supabase/migrations/20260911090000_rol_cadena_de_valor.sql
---

# Catálogo de obligaciones

Mantenimiento del catálogo de [obligaciones](../glosario.md#obligación) normativas por marco.

## Propósito

Mantener los artículos y cláusulas que generan obligaciones para los sistemas de IA. La vista dice: «Sirve
como base para mapear qué evidencias son requeridas por cada artículo o cláusula.».

## Acceso y permisos

- **Ruta:** `/datos/obligaciones`
- **Navegación:** tarjeta **Obligaciones** del [Catálogo de tablas básicas](catalogo.md) y menú **Datos ›
  Obligaciones**.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Crear, editar y eliminar |

> **Pendiente de implementar.** Restringir el mantenimiento al Administrador y tener un catálogo por
> organización. Ver [Catálogo de tablas básicas](catalogo.md#acceso-y-permisos).

## Campos

**Filtro «Framework»:** Todos · AI Act · ISO 42001 · RGPD · DORA · ENS · MDR/IVDR.

**Lista**, ordenada por marco y código, de 50 en 50:

| Columna | Descripción | Origen (`compliance.obligations.`) |
|---|---|---|
| **Código** | Por ejemplo, «AI-ACT-ART9». Único | `code` |
| **Framework** | Marco normativo | `framework` |
| **Artículo** | Por ejemplo, «Art. 9» | `article` |
| **Título** | Con la descripción debajo | `title`, `description` |
| **Ámbito** | A qué sistemas aplica | `scope` |

Sin resultados: «No se encontraron obligaciones».

**Formulario Nueva / Editar Obligación:**

| Campo | Tipo | Obligatorio | Valores |
|---|---|---|---|
| **Código único** | texto | Sí | Por ejemplo, «AI-ACT-ART9» |
| **Framework** | selección | Sí | AI Act (por defecto) · ISO 42001 · RGPD · DORA · ENS · MDR/IVDR |
| **Artículo / Cláusula** | texto | Sí | Por ejemplo, «Art. 9» |
| **Ámbito** | selección | No | Universal (por defecto) · Alto riesgo · GPAI · General · Prohibido |
| **Título** | texto | Sí | Por ejemplo, «Sistema de gestión de riesgos» |
| **Descripción** | texto largo | No | — |

**Cuándo aplica una obligación del AI Act a un sistema:**

| Ámbito | Aplica si el sistema… |
|---|---|
| Universal o «all» | Siempre |
| Alto riesgo | Es de alto riesgo |
| GPAI | Es de propósito general |
| «transparency» | Es de riesgo limitado, alto o de propósito general. Se marca como condicional |

Además, la obligación debe corresponder a alguno de los [roles en la cadena de
valor](../glosario.md#rol-en-la-cadena-de-valor) del sistema. Si no tiene roles indicados, aplica a
cualquiera.

> TODO: confirmar varias reglas del catálogo.
> - **Ámbitos:**
>   - «General» y «Prohibido» no hacen que la obligación aplique a ningún sistema;
>   - los ámbitos «all» y «transparency» del catálogo estándar no se pueden elegir en el formulario y
>     aparecen sin traducir.
> - **Roles en la cadena de valor:** no se pueden ver ni editar.
> - **Obligaciones de cada sistema:** las de la [Ficha del sistema](ficha-sistema.md) no se generan a
>   partir de este catálogo, así que editarlo no las cambia. Las reglas de aplicación de esta tabla solo
>   las usa una pantalla sin uso.
> - **Marcos RGPD, DORA, ENS y MDR/IVDR:** el formulario los ofrece, pero el catálogo estándar no tiene
>   obligaciones de ellos.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Añadir Obligación** / **Editar** › **Guardar** | Todos | Crea o actualiza la obligación | Cambia la cobertura de la obligación por modos de fallo |
| **Eliminar** | Todos | Pide confirmación («¿Eliminar la obligación {código}?») y la borra | Elimina también sus relaciones con tipos de evidencia, sin avisar |
| **Volver a Datos** | Todos | Vuelve al [Catálogo de tablas básicas](catalogo.md) | — |

No hay mensaje de confirmación. Los errores se muestran en una ventana del navegador: «Error al guardar:
…» o «Error eliminando: …».

## Validaciones

Código, marco, artículo y título obligatorios. El código no se puede repetir.

## Estados

No aplica. El borrado es definitivo.

## Vistas relacionadas

- [Obligación y evidencia](catalogo-obligacion-evidencia.md).
- [Ficha del sistema](ficha-sistema.md), pestañas Clasificación y Obligaciones.
- Negocio: [Catálogo de tablas básicas](../negocio/catalogo-tablas-basicas.md),
  [Obligaciones](../negocio/obligaciones.md).
