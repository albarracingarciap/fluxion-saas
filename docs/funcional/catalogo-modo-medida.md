---
id: FUN-CAT-MODO-MEDIDA
titulo: Modo de fallo y medida
tipo: funcional
modulo: catalogo-tablas-basicas
audiencia: tecnica
version: 0.2
fuente:
  - apps/web/app/(app)/datos/actions.ts
  - apps/web/lib/auth/platform.ts
  - apps/web/app/(app)/datos/mappings/modo-medida/page.tsx
  - apps/web/app/(app)/datos/mappings/modo-medida/actions.ts
  - apps/web/lib/fmea/data.ts
  - apps/web/lib/fmea/treatment-plan.ts
  - supabase/migrations/00000000000001_schema.sql
---

# Modo de fallo y medida

Relación entre los [modos de fallo](../glosario.md#modo-de-fallo) del catálogo y las
[plantillas de control](../glosario.md#plantilla-de-control) que los mitigan.

## Propósito

Indicar qué medidas mitigan cada modo de fallo, distinguiendo la mitigación principal, para sugerirlas en
la evaluación FMEA y en el plan de tratamiento.

## Acceso y permisos

- **Ruta:** `/datos/mappings/modo-medida`
- **Navegación:** tarjeta **Modo ↔ Medida** del [Catálogo de tablas básicas](catalogo.md) y menú **Datos ›
  Modo ↔ Medida**.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Administración de la plataforma (`profiles.platform_role` = `platform_admin`) | Sí | Crear, editar y eliminar |
| Resto de roles | Sí | Solo consulta: no ven los botones de alta, edición ni borrado, y el servidor rechaza esas acciones |

> **Pendiente de implementar.** Catálogo por organización mantenido por el Administrador. Ver
> [Catálogo de tablas básicas](catalogo.md#acceso-y-permisos).

## Campos

**Filtro «Tipo»:** Todas · Primaria · Secundaria.

**Lista**, de 100 en 100 (683 relaciones en el catálogo estándar, todas primarias):

| Columna | Descripción | Origen (`compliance.failure_mode_control_refs.`) |
|---|---|---|
| **Dim.** | Dimensión del modo: TEC · SEG · ETH · GOV · ROI · LEG | `failure_modes.dimension_id` |
| **Modo de Fallo** | Código y nombre | `failure_mode_id` |
| **Medida de Control** | Código y título | `control_template_id` |
| **Tipo** | Primaria · Secundaria | `is_primary` |

Sin resultados: «No se encontraron correspondencias».

**Formulario:**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| **Modo de Fallo** | selección con búsqueda | Sí | — |
| **Medida de Control** | selección con búsqueda | Sí | Solo medidas activas |
| **Mitigación primaria** | interruptor | — | «Es la medida de control principal recomendada para este modo de fallo». Activo por defecto |

Cada pareja modo-medida solo puede existir una vez. Al editar solo se puede cambiar si es primaria.

> TODO: confirmar varios usos de esta relación.
> - **Mitigación primaria:** no se usa fuera de esta vista.
> - **Filtro:** solo actúa sobre la página cargada.
> - **Medida inactiva:** al editar una relación con una medida inactiva, la medida aparece vacía.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Añadir Correspondencia** / **Editar** › **Guardar** | Administración de la plataforma | Crea la relación o cambia si es primaria | — |
| **Eliminar** | Administración de la plataforma | Pide confirmación («¿Eliminar la correspondencia "{modo} → {medida}"?») y la borra | — |
| **Volver a Datos** | Todos | Vuelve al [Catálogo de tablas básicas](catalogo.md) | — |

## Validaciones

Modo y medida obligatorios. No se puede repetir una pareja.

## Estados

No aplica. El borrado es definitivo.

## Vistas relacionadas

- [Catálogo de modos de fallo](catalogo-modos-de-fallo.md), [Catálogo de medidas](catalogo-medidas.md).
- [Plan de tratamiento](plan-de-tratamiento.md), [Evaluación FMEA](fmea-evaluacion.md).
- Negocio: [Catálogo de tablas básicas](../negocio/catalogo-tablas-basicas.md).
