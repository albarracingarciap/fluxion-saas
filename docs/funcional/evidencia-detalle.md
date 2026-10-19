---
id: FUN-EVIDENCIA-DETALLE
titulo: Detalle de evidencia
tipo: funcional
modulo: biblioteca-evidencias
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/evidencias/[id]/page.tsx
  - apps/web/app/(app)/evidencias/[id]/evidence-detail-client.tsx
  - apps/web/lib/evidences/detail.ts
  - apps/web/app/(app)/evidencias/actions.ts
---

# Detalle de evidencia

Ficha de una [evidencia](../glosario.md#evidencia): metadatos, fichero o enlace, obligaciones y modos de
fallo que respalda, eventos y versiones. Permite revisarla y eliminarla.

## Propósito

Consultar toda la información de una evidencia y su trazabilidad, por ejemplo para un auditor, y
decidir su revisión.

## Acceso y permisos

- **Ruta:** `/evidencias/[id]`
- **Navegación:**
  - el título o **Abrir evidencias** en la [Biblioteca de evidencias](evidencias.md);
  - las alertas de caducidad;
  - el dossier técnico del sistema.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Vista previa y apertura del enlace |
| Roles con permiso de edición (ver [Biblioteca de evidencias](evidencias.md#acceso-y-permisos)) | Ídem | Revisar y eliminar |

Si la evidencia no existe o es de otra organización, la vista devuelve «no encontrado».

## Campos

| Bloque | Contenido | Origen (`tabla.columna`) |
|---|---|---|
| Cabecera | Estado, sistema u «ORG», tipo, título, descripción, etiquetas | `system_evidences` |
| Metadatos | **Owner**, **Revisor**, **Versión**, **Emitida**, **Caducidad** (en rojo si ha vencido), **Revisada**, **Creada**, **Actualizada** | `owner_user_id`, `reviewed_by`, `version`, `issued_at`, `expires_at`, `reviewed_at`, `created_at`, `updated_at` |
| **Notas de revisión** | Si existen | `validation_notes` |
| **Obligaciones vinculadas** | Código, estado y prioridad | `system_obligation_evidences` → `system_obligations` |
| **Modos de fallo vinculados** | Código, estado de priorización y nombre | `system_failure_mode_evidences` → `system_failure_modes` |
| **Eventos de sistema** | Eventos del historial que citan la evidencia, hasta 50 | `ai_system_history` |
| **Historial de versiones** | Cambios con su diferencia campo a campo | `system_evidence_versions` |

> TODO: confirmar varios datos de esta vista.
> - **Estado de las obligaciones:** muestra valores que no existen en las obligaciones (Conforme, Parcial,
>   No conforme, Sin evaluar).
> - **Estado de los modos de fallo:** aparece en inglés.
> - **Enlaces:** los de obligaciones y modos de fallo llevan a pestañas que no existen, y acaban en la
>   pestaña Obligaciones de la ficha.
> - **Controles de la Declaración de Aplicabilidad:** la vista no muestra los controles que esta evidencia
>   valida.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Vista previa** | Todos | Abre el fichero (PDF o imagen) o lo descarga | — |
| **Abrir URL** | Todos | Abre el enlace externo | — |
| **Ver sistema** | Todos | Navega a la pestaña Evidencias de la [Ficha del sistema](ficha-sistema.md) | — |
| **Enviar a revisión** · **Aprobar** · **Rechazar** (con motivo) · **Reabrir borrador** | Roles con permiso | Ciclo de revisión, como en la [Biblioteca de evidencias](evidencias.md#acciones) | — |
| **Eliminar** | Roles con permiso | Pide confirmación («¿Eliminar permanentemente?») y elimina | Vuelve a la biblioteca |

La vista no permite editar la evidencia, cambiar el fichero ni gestionar sus vínculos: eso se hace desde
la biblioteca o desde la ficha del sistema.

> TODO: confirmar el tratamiento de errores. Ni la revisión ni la eliminación muestran sus errores, y tras
> eliminar se vuelve a la biblioteca aunque haya fallado.

## Validaciones

Las de revisión de la [Biblioteca de evidencias](evidencias.md#validaciones). El botón **Confirmar
rechazo** está deshabilitado mientras no hay motivo.

## Estados

Ver [Biblioteca de evidencias](evidencias.md#estados).

## Vistas relacionadas

- [Biblioteca de evidencias](evidencias.md), [Ficha del sistema](ficha-sistema.md).
- Negocio: [Biblioteca de evidencias](../negocio/biblioteca-evidencias.md).
