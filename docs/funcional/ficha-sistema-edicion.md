---
id: FUN-FICHA-EDICION
titulo: Edición de la ficha del sistema
tipo: funcional
modulo: inventario
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/inventario/[id]/editar/page.tsx
  - apps/web/app/(app)/inventario/[id]/editar/edit-system-client.jsx
  - apps/web/app/(app)/inventario/[id]/editar/actions.ts
  - apps/web/components/inventory/SystemWizard.jsx
  - apps/web/lib/ai-systems/scoring.ts
  - supabase/migrations/00000000000001_schema.sql
---

# Edición de la ficha del sistema

Modificación de los datos de un [sistema de IA](../glosario.md#sistema-de-ia) ya registrado. Usa el mismo
asistente de siete pasos que el [Alta de sistema](inventario-alta.md), con los datos actuales cargados.

## Propósito

Mantener actualizada la información del sistema y recalcular su clasificación AI Act cuando cambian sus
características.

## Acceso y permisos

- **Ruta:** `/inventario/[id]/editar`
- **Navegación:** [Ficha del sistema](ficha-sistema.md), pestaña **Ficha técnica** › **✏ Editar ficha**.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Administrador, Responsable del SGAI, CAIO, DPO, Responsable del sistema, Analista de riesgos, Analista de cumplimiento | Sí | Guardar cambios |
| Directivo, Auditor, Lector | Sí, ven el asistente completo | Ninguna: al guardar, la base de datos rechaza el cambio y se muestra un error técnico |

> TODO: confirmar si los roles sin permiso de edición deben poder abrir el asistente. Hoy lo ven entero y
> solo descubren al final que no pueden guardar, con un mensaje técnico.

Si el sistema no existe o es de otra organización, la vista devuelve «no encontrado».

## Campos

Los mismos del [Alta de sistema](inventario-alta.md#campos), todos editables. Diferencias:

- **Tipo de output:** se carga solo el que está guardado, aunque en el alta se marcaran varios.
- **Proveedores TIC críticos:** se separan por comas, así que un nombre que contenga una coma se parte en
  dos.
- **Avance:** el asistente empieza siempre en el paso 1 y el botón de guardar solo está en el paso 7.
  Para guardar un cambio hay que recorrer todos los pasos.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **✓ Guardar cambios** (paso 7) | Roles con permiso | Server action `updateAISystem` | Ver abajo. Después navega a la [Ficha del sistema](ficha-sistema.md) |

`updateAISystem` hace lo siguiente:
1. Recalcula la clasificación AI Act con las reglas del alta.
2. Actualiza todos los campos del sistema, su nivel de riesgo, su base, su motivo y sus obligaciones.
3. Registra en el [historial del sistema](../glosario.md#historial-del-sistema) dos eventos fijos, «Ficha
   del sistema actualizada» y «Clasificación AI Act recalculada», sin el detalle de qué campos cambiaron.

> TODO: confirmar tres comportamientos al guardar.
> - Editar sobrescribe el campo de quién creó el sistema con quien lo edita.
> - Editar no inicia una [reclasificación](../glosario.md#reclasificación) con conciliación de
>   obligaciones: cambia el nivel de riesgo del sistema, pero no sus obligaciones ni la versión de la
>   clasificación. Para eso hay que reclasificar desde la ficha.
> - Se registra «Clasificación recalculada» aunque no haya cambiado nada.

## Validaciones

Las mismas del [Alta de sistema](inventario-alta.md#validaciones), y además:

| Situación | Mensaje |
|---|---|
| Falta el identificador del sistema | «Falta el identificador del sistema a actualizar.» |
| Rol sin permiso de edición | Error técnico de la base de datos |

## Estados

El estado del sistema (Producción, Desarrollo, Piloto, Deprecado o Retirado) se cambia aquí, en el
paso 1. No hay restricciones entre estados.

## Vistas relacionadas

- [Ficha del sistema](ficha-sistema.md): origen y destino.
- [Alta de sistema](inventario-alta.md): mismo asistente.
- Negocio: [Inventario de sistemas de IA](../negocio/inventario.md),
  [Clasificación AI Act](../negocio/clasificacion-ai-act.md).
