---
id: FUN-CUESTIONARIO
titulo: Cuestionarios preliminares
tipo: funcional
modulo: evaluacion-de-impacto
audiencia: tecnica
version: 0.3
fuente:
  - apps/web/app/(app)/cuestionario-preliminar/page.tsx
  - apps/web/app/(app)/cuestionario-preliminar/list-client.tsx
  - apps/web/app/(app)/cuestionario-preliminar/actions.ts
  - supabase/migrations/20260915090000_cuestionario_preliminar.sql
  - supabase/migrations/20261022100000_cuestionario_clasificacion.sql
  - supabase/migrations/20261022110000_cuestionario_vinculo.sql
---

# Cuestionarios preliminares

Lista de los [cuestionarios preliminares](../glosario.md#cuestionario-preliminar) de la organización.

## Propósito

Recoger la información mínima de un proyecto o sistema de IA antes de darlo de alta en el inventario y
consultar los cuestionarios ya iniciados.

## Acceso y permisos

- **Ruta:** `/cuestionario-preliminar`
- **Navegación:** botones **Cuestionario** y **Cuestionario preliminar** del [Dashboard](dashboard.md).
  No tiene entrada en el menú.
- **Disponibilidad:** módulo Evaluación de impacto.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Todos los cuestionarios de la organización | Crear, abrir, eliminar, dar de alta el sistema |

## Campos

Lista ordenada por la última modificación:

| Campo | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|
| Título | Enlace al formulario. Se toma de la tecnología, el nombre comercial o el objeto del proyecto | `preliminary_questionnaires.title` |
| Responsable · fecha | Responsable del proyecto y fecha de la última actualización | `project_lead`, `updated_at` |
| Estado | Borrador · Completado | `status` |
| Inventario | **En el inventario →** si el cuestionario está vinculado a un sistema (enlace a su [ficha](ficha-sistema.md)); **Dar de alta** si está completado y sin sistema; nada en los borradores | `ai_system_id` |
| Preliminar | Solo en los cuestionarios completados desde B13b: «Preliminar: {nivel o ámbito}» con la [clasificación AI Act](../glosario.md#clasificación-ai-act) preliminar guardada al completar. Al pasar el puntero muestra la base legal resumida | `classification` (`result.display.label` y `result.display.basis`) |

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Nuevo cuestionario** | Todos | Navega al [formulario](cuestionario-preliminar-formulario.md) vacío | — |
| Pulsar un cuestionario | Todos | Abre el formulario | — |
| **Dar de alta** | Todos | Abre `/inventario/nuevo?cuestionario={id}` | [Alta de sistema](inventario-alta.md#alta-desde-un-cuestionario-preliminar) rellena con las respuestas del cuestionario |
| **En el inventario →** | Todos | Abre la ficha del sistema vinculado | — |
| Eliminar (papelera) | Todos | Pide confirmación («¿Eliminar este cuestionario? No se puede deshacer.») y lo borra | Un cuestionario vinculado no se borra: ver [Validaciones](#validaciones) |

## Validaciones

| Situación | Mensaje |
|---|---|
| Eliminar un cuestionario vinculado a un sistema | «No se puede eliminar: es el cuestionario de origen de un sistema del inventario.» |

La papelera se muestra también en los cuestionarios vinculados; el rechazo llega al confirmar.

## Estados

Ver [Formulario del cuestionario preliminar](cuestionario-preliminar-formulario.md#estados).

Si no hay cuestionarios, la vista muestra «Todavía no hay cuestionarios».

## Vistas relacionadas

- [Formulario del cuestionario preliminar](cuestionario-preliminar-formulario.md).
- [Alta de sistema](inventario-alta.md).
- Negocio: [Evaluación de impacto](../negocio/evaluacion-de-impacto.md).
