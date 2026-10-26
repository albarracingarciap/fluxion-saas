---
id: FUN-FICHA-EDICION
titulo: Edición de la ficha del sistema
tipo: funcional
modulo: inventario
audiencia: tecnica
version: 0.3
fuente:
  - apps/web/app/(app)/inventario/[id]/editar/page.tsx
  - apps/web/lib/preliminary-questionnaire/to-wizard.ts
  - apps/web/components/questionnaire/supuestos-ai-act.tsx
  - apps/web/app/(app)/inventario/[id]/editar/edit-system-client.jsx
  - apps/web/app/(app)/inventario/[id]/editar/actions.ts
  - apps/web/components/inventory/SystemWizard.jsx
  - apps/web/lib/ai-systems/scoring.ts
  - apps/web/lib/ai-act/server.ts
  - services/agents/fluxion_agents/routes/classification.py
  - supabase/migrations/00000000000001_schema.sql
---

# Edición de la ficha del sistema

Modificación de los datos de un [sistema de IA](../glosario.md#sistema-de-ia) ya registrado. Usa el mismo
asistente de siete pasos que el [Alta de sistema](inventario-alta.md), con los datos actuales cargados.

## Propósito

Mantener actualizada la información del sistema y proponer una nueva clasificación AI Act cuando cambian
sus características.

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

- **Tipo de output:** se cargan todos los tipos guardados (`output_types`), en su orden.
- **Supuestos AI Act** (paso 3): si el sistema tiene supuestos guardados (`ai_systems.aiact_inputs`), el
  bloque se abre con ellos convertidos de nuevo en respuestas (`inputsToAnswers`) y se pueden cambiar,
  añadir (**Indicar los supuestos AI Act**) o quitar (**Quitar supuestos**). Sin supuestos, el motor usa la
  vía de respaldo. Ver [el bloque en el Alta de sistema](inventario-alta.md#paso-3--impacto-y-clasificación-ai-act).
- **Cuestionario de origen:** la edición no muestra el aviso de datos precargados ni la clasificación
  preliminar del cuestionario. El cuestionario vinculado no cambia al editar la ficha.
- **Proveedores TIC críticos:** se separan por comas, así que un nombre que contenga una coma se parte en
  dos.
- **Avance:** el asistente empieza siempre en el paso 1 y el botón de guardar solo está en el paso 7.
  Para guardar un cambio hay que recorrer todos los pasos.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **✓ Guardar cambios** (paso 7) | Roles con permiso | Server action `updateAISystem` | Ver abajo. Después navega a la [Ficha del sistema](ficha-sistema.md) |

`updateAISystem` hace lo siguiente:
1. Clasifica el sistema con el motor único de clasificación AI Act (`classifyWithCatalog`), el mismo del
   [Alta de sistema](inventario-alta.md#clasificación-con-el-motor-único).
2. Actualiza los campos del sistema. No toca la clasificación vigente (nivel, base, motivo, obligaciones,
   práctica prohibida, modelo GPAI) ni quién creó el sistema (`created_by`).
3. Envía el resultado al servicio de agentes (`/api/v1/systems/{id}/reclassify`), que lo compara con la
   clasificación vigente:
   - **Si cambian el nivel de riesgo o las obligaciones:** abre una
     [reclasificación](../glosario.md#reclasificación) pendiente, que se concilia en la
     [Ficha del sistema](ficha-sistema.md) con **Confirmar cambios**.
   - **Si no cambian:** actualiza el detalle de la clasificación vigente (fundamento, resultado del motor,
     versión de las reglas, ámbito, categoría GPAI, supuestos AI Act y práctica prohibida) y retira la
     marca «Pendiente de revisar con el motor nuevo».
   - **Si ya hay una reclasificación pendiente:** no hace nada con la clasificación.
4. Registra en el [historial del sistema](../glosario.md#historial-del-sistema) «Ficha del sistema
   actualizada», sin el detalle de qué campos cambiaron, y, si se abrió una reclasificación,
   «Reclasificación AI Act propuesta» (`classification_proposed`): «Con los datos editados, el motor
   propone… Pendiente de conciliar en la ficha.».

Si el servicio de agentes no responde, los cambios se guardan y aparece el aviso «Los cambios se han
guardado, pero no se pudo revisar la clasificación AI Act: el servicio de clasificación no respondió. Usa
«✏ Revisar clasificación» en la ficha.».

Con una reclasificación ya pendiente, la edición se guarda y avisa: «Los cambios se han guardado, pero la
clasificación no se ha revisado: el sistema ya tiene una reclasificación pendiente de conciliar. Concíliala en la
ficha y, si hace falta, usa «✏ Revisar clasificación».».

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
