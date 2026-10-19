---
id: FUN-CUESTIONARIO
titulo: Cuestionarios preliminares
tipo: funcional
modulo: evaluacion-de-impacto
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/cuestionario-preliminar/page.tsx
  - apps/web/app/(app)/cuestionario-preliminar/list-client.tsx
  - apps/web/app/(app)/cuestionario-preliminar/actions.ts
  - supabase/migrations/20260915090000_cuestionario_preliminar.sql
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
| Todos los roles | Todos los cuestionarios de la organización | Crear, abrir, eliminar |

## Campos

Lista ordenada por la última modificación:

| Campo | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|
| Título | Enlace al formulario. Se toma de la tecnología, el nombre comercial o el objeto del proyecto | `preliminary_questionnaires.title` |
| Responsable · fecha | Responsable del proyecto y fecha de la última actualización | `project_lead`, `updated_at` |
| Estado | Borrador · Completado | `status` |

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Nuevo cuestionario** | Todos | Navega al [formulario](cuestionario-preliminar-formulario.md) vacío | — |
| Pulsar un cuestionario | Todos | Abre el formulario | — |
| Eliminar (papelera) | Todos | Pide confirmación («¿Eliminar este cuestionario? No se puede deshacer.») y lo borra | — |

## Validaciones

No aplica.

## Estados

Ver [Formulario del cuestionario preliminar](cuestionario-preliminar-formulario.md#estados).

Si no hay cuestionarios, la vista muestra «Todavía no hay cuestionarios».

## Vistas relacionadas

- [Formulario del cuestionario preliminar](cuestionario-preliminar-formulario.md).
- [Alta de sistema](inventario-alta.md).
- Negocio: [Evaluación de impacto](../negocio/evaluacion-de-impacto.md).
