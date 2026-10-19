---
id: FUN-CAT-OBL-EVIDENCIA
titulo: Obligación y evidencia
tipo: funcional
modulo: catalogo-tablas-basicas
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/datos/mappings/obligacion-evidencia/page.tsx
  - apps/web/app/(app)/datos/mappings/obligacion-evidencia/actions.ts
  - supabase/migrations/00000000000001_schema.sql
---

# Obligación y evidencia

Relación entre las [obligaciones](../glosario.md#obligación) del catálogo y los
[tipos de evidencia](../glosario.md#tipo-de-evidencia) que las cubren.

## Propósito

Indicar, para cada obligación, qué tipos de evidencia son obligatorios, recomendados u opcionales.

## Acceso y permisos

- **Ruta:** `/datos/mappings/obligacion-evidencia`
- **Navegación:** tarjeta **Obligación ↔ Evidencia** del [Catálogo de tablas básicas](catalogo.md) y menú
  **Datos › Obligación ↔ Evidencia**.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Crear, editar y eliminar |

> **Pendiente de implementar.** Restringir el mantenimiento al Administrador y tener un catálogo por
> organización. Ver [Catálogo de tablas básicas](catalogo.md#acceso-y-permisos).

## Campos

**Filtro «Nivel»:** Todos · Obligatoria · Recomendada · Opcional.

**Lista**, de 100 en 100 (35 relaciones en el catálogo estándar):

| Columna | Descripción | Origen (`compliance.obligation_evidence_types.`) |
|---|---|---|
| **Framework** | Marco de la obligación | `obligations.framework` |
| **Obligación** | Código y título | `obligation_id` |
| **Tipo de Evidencia** | Código y nombre | `evidence_type_id` |
| **Nivel** | Obligatoria · Recomendada · Opcional | `requirement_level` |
| **Notas** | «—» si está vacía | `notes` |

Sin resultados: «No se encontraron correspondencias».

**Formulario Nueva / Editar Correspondencia:**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| **Obligación** | selección con búsqueda | Sí | Busca por código o nombre |
| **Tipo de Evidencia** | selección con búsqueda | Sí | Ídem |
| **Nivel de requisito** | selección | Sí | Obligatoria (por defecto) · Recomendada · Opcional |
| **Notas (opcional)** | texto largo | No | — |

Cada pareja obligación-tipo solo puede existir una vez.

Al editar, la obligación y el tipo no se pueden cambiar: «… elimina esta correspondencia y crea una
nueva.».

> TODO: confirmar varios aspectos de esta relación.
> - **Uso:** no se usa fuera de esta sección. No hay sugerencias de evidencias basadas en ella.
> - **Notas:** una vez guardadas, no se pueden vaciar.
> - **Filtro:** solo actúa sobre la página cargada.
> - **Orden de la lista:** no es estable.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Añadir Correspondencia** / **Editar** › **Guardar** | Todos | Crea la relación o cambia su nivel y notas | — |
| **Eliminar** | Todos | Pide confirmación («¿Eliminar la correspondencia "{obligación} → {tipo}"?») y la borra | — |
| **Volver a Datos** | Todos | Vuelve al [Catálogo de tablas básicas](catalogo.md) | — |

Una pareja repetida devuelve el error técnico de la base de datos.

## Validaciones

Obligación, tipo y nivel obligatorios. No se puede repetir una pareja.

## Estados

No aplica. El borrado es definitivo.

## Vistas relacionadas

- [Catálogo de obligaciones](catalogo-obligaciones.md),
  [Catálogo de tipos de evidencia](catalogo-tipos-de-evidencia.md).
- Negocio: [Catálogo de tablas básicas](../negocio/catalogo-tablas-basicas.md).
