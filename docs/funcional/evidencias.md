---
id: FUN-EVIDENCIAS
titulo: Biblioteca de evidencias
tipo: funcional
modulo: biblioteca-evidencias
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/evidencias/page.tsx
  - apps/web/app/(app)/evidencias/evidences-library-client.tsx
  - apps/web/app/(app)/evidencias/expiry-alerts-client.tsx
  - apps/web/app/(app)/evidencias/actions.ts
  - apps/web/lib/evidences/data.ts
  - apps/web/lib/evidences/storage.ts
  - apps/web/lib/evidences/storage-actions.ts
  - apps/web/lib/evidences/expiry-alerts.ts
  - apps/web/lib/evidences/versions.ts
  - apps/web/lib/evidences/versions-actions.ts
  - apps/web/lib/evidences/review-rules.ts
  - supabase/migrations/20261020110000_evidencias_revision_versiones.sql
  - apps/web/lib/storage/objects.ts
  - apps/web/app/api/cron/evidence-expiry/route.ts
  - supabase/migrations/00000000000001_schema.sql
---

# Biblioteca de evidencias

Vista de todas las [evidencias](../glosario.md#evidencia) de la organización, de sistema y de
organización. Desde ella se revisan, se editan, se vinculan a obligaciones y se crean evidencias de
organización, y se ven las alertas de caducidad.

## Propósito

Vigilar el estado documental de la organización sin entrar sistema por sistema: qué evidencias faltan
por revisar, cuáles caducan, cuáles no tienen responsable y cuáles no respaldan ninguna obligación.

## Acceso y permisos

- **Ruta:** `/evidencias`. Parámetros de URL: `system`, `status`, `type` y `scope` (`expired`,
  `unassigned`, `orphan`, `expiring`).
- **Navegación:** **Principal › Sistemas › Evidencias**. También desde el [Dashboard](dashboard.md)
  (**Ver biblioteca**) y desde el aviso de caducidades.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Responsable del SGAI | Sí | Todas. Es el único que aprueba o rechaza, y no las evidencias que aporta él mismo |
| Administrador, CAIO, DPO, Responsable del sistema, Analista de riesgos, Analista de cumplimiento | Sí | Crear, editar, enviar a revisión, reabrir y eliminar |
| Directivo, Auditor, Lector | Sí | Crear evidencias y adjuntar ficheros. Editar, revisar o eliminar devuelve «No tienes permisos para modificar esta evidencia.» |

Quién aprueba sigue DP-01: el Responsable del SGAI, distinto de quien aporta la evidencia (su responsable).
La base de datos lo comprueba también (`trg_evidence_review_rules`). A quien no puede decidir, la vista le
muestra «Pendiente de revisión del Responsable del SGAI» en lugar de **Aprobar** y **Rechazar**.

> **Pendiente de implementar.** El «revisor designado» de DP-01 como alternativa al Responsable del SGAI.

## Campos

### Indicadores y bloques

| Bloque | Contenido |
|---|---|
| Alertas de caducidad | «N evidencia(s) con alerta de caducidad · N urgente(s)», con las cinco primeras alertas |
| Indicadores | **Evidencias totales** (sistemas afectados) · **Pendientes revisión** (borradores y en revisión) · **Caducadas** (y dentro de 30 días) · **Cobertura documental** (válidas + mitad de las pendientes, sobre el total; y % de trazabilidad) |
| **Requieren atención** | Cola de revisión, caducidades, trazabilidad débil, gobierno operativo |
| **Origen y trazabilidad** | Distribución por origen; evidencias reutilizadas (2 obligaciones o más), con instantánea y huérfanas (sin obligación) |
| **Biblioteca global** | La lista con sus filtros |
| **Cobertura documental por sistema** | Ranking de sistemas por fricción documental (caducadas, pendientes, huérfanas) |
| **Cola de revisión** | Borradores, pendientes y rechazadas |
| **Caducidades** | Caducadas, en 7 días o menos, de 8 a 30 días y sin caducidad |

### Filtros de la lista

| Filtro | Valores |
|---|---|
| **Sistema** | Todos o uno de los seis primeros |
| **Estado** | Todos · Pendiente revisión · Borrador · Válida · Caducada |
| **Tipo** | Todos o uno de los seis primeros |
| **Atención** | Todas · Caducadas · Sin owner · Huérfanas · Vence pronto (30 días o menos) |
| **Tags** | Una etiqueta, en el navegador |

> TODO: confirmar los límites de la lista.
> - Muestra solo las 24 primeras evidencias filtradas, sin paginación, aunque el contador indique el total.
> - Los filtros de sistema y tipo ofrecen solo seis opciones.
> - Falta el filtro «Rechazada».

### Tarjeta de evidencia

| Campo | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|
| Estado | Borrador · Pend. revisión · Válida · Caducada · Rechazada ([estado de la evidencia](../glosario.md#estado-de-la-evidencia)) | `system_evidences.status` |
| Ámbito | Código del sistema u «ORG» | `scope`, `ai_system_id` |
| Origen | Carga manual, Dossier técnico, Snapshot u otro, deducido del tipo o del enlace | `evidence_type`, `external_url` |
| Título | Enlace al [Detalle de evidencia](evidencia-detalle.md) | `title` |
| Sistema · tipo · responsable | — | `evidence_type`, `owner_user_id` |
| Etiquetas | — | `tags` |
| Caducidad | Caducada · Sin caducidad · Caduca hoy · Caduca en N días | `expires_at` |
| **Owner** · **Obligaciones vinculadas** · **Emitida** · **Trazabilidad** | Trazabilidad: Huérfana o número de obligaciones | `owner_user_id`, `system_obligation_evidences`, `issued_at` |

### Nueva evidencia organizacional / Editar evidencia

| Campo | Tipo | Obligatorio | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|---|---|
| **Título** | texto | Sí | — | `title` |
| **Tipo** | selector | — | Documento técnico, DPIA, Política (por defecto en las de organización), Contrato, Informe de auditoría, Registro formativo, Resultado de pruebas, Log de monitorización, Evaluación de riesgos, Certificado, Otro | `evidence_type` |
| **Estado** | informativo | — | No se elige: toda evidencia nace en borrador y el estado cambia con el ciclo de revisión. Al editar, avisa de que cambiar el contenido la devuelve a borrador | `status` |
| **URL del documento** | URL | Sí, si no hay fichero | — | `external_url` |
| **Archivo adjunto** | fichero | No | PDF, imagen, Word, Excel, PowerPoint, texto o CSV. Máximo 20 MB, comprobado al elegirlo y en el servidor | `storage_path`, `mime_type`, `file_size_bytes` |
| **Descripción** | texto largo | No | — | `description` |
| **Versión** | texto | No | — | `version` |
| **Tags** | etiquetas | No | Intro o coma para añadir; se guardan en minúsculas | `tags` |
| **Fecha de emisión**, **Caducidad** | fecha | No | — | `issued_at`, `expires_at` |

Los ficheros se suben en tres pasos:
1. El servidor firma una URL de subida válida 5 minutos.
2. El navegador sube el fichero directamente al almacenamiento.
3. El servidor comprueba que el fichero ha llegado y lo registra.

**Cambios de contenido.** Si cambia el fichero, la URL, las fechas, la versión, el tipo, el título o la
descripción de una evidencia pendiente de revisión, válida, caducada o rechazada, vuelve a «Borrador» y se
borran el revisor y las notas de revisión: lo que se validó ya no es lo que hay. Cambiar solo las etiquetas
no cambia el estado.

**Alta de organización con fichero:** si el fichero no se puede adjuntar, la evidencia queda creada en
borrador y el formulario lo indica, para adjuntarlo al editarla.

> TODO: confirmar dos comportamientos del fichero.
> - **Edición:** el fichero se sube al elegirlo, aunque después se cancele (y la evidencia vuelve a borrador).
> - **Fichero:** quitar el fichero o eliminar la evidencia no borra el fichero del almacenamiento.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **+ Evidencia organizacional** | Todos | `createOrganizationEvidence`: evidencia de toda la organización, con el usuario como responsable | Nace en borrador |
| **Editar evidencia** | Roles con permiso | `updateSystemEvidence` | Versión registrada. Si cambia el contenido de una evidencia ya enviada, vuelve a borrador. Historial «Evidencia actualizada» en el sistema |
| **Enviar a revisión** · **Reabrir** | Roles con permiso | `reviewSystemEvidence` | Versión registrada. Historial «Revisión solicitada» o «Evidencia reabierta» |
| **Aprobar** · **Rechazar** (con motivo) | Responsable del SGAI que no la aportó | `reviewSystemEvidence` | La base de datos registra revisor y fecha. Versión registrada. Historial «Evidencia aprobada» o «Evidencia rechazada» |
| **Eliminar evidencia** | Roles con permiso | Pide confirmación y ejecuta `deleteSystemEvidence` | Borra también sus versiones, alertas y vínculos. Historial «Evidencia eliminada» |
| Vista previa | Todos | Abre el fichero (PDF o imagen) o lo descarga | — |
| **Ver historial de versiones** | Todos | Panel con los cambios de la evidencia y su diferencia campo a campo, incluido el fichero (por su nombre) | — |
| Selección › **Enviar a revisión** / **Aprobar** (este, solo para el Responsable del SGAI) | Roles con permiso | `bulkReviewEvidences`: solo las que admiten el cambio; al aprobar, omite las que aportó quien aprueba | Revisor, fecha y versión registrados por la base de datos. Sin historial del sistema |
| Selección › **Vincular obligación** | Roles con permiso | Vincula las seleccionadas a una obligación de la organización | — |
| Selección › **CSV** | Todos | Descarga `evidencias_AAAA-MM-DD.csv` | — |
| Descartar alerta (X) | Todos | Oculta la alerta de caducidad | — |

**Versiones.** Las guarda la base de datos en cada cambio de contenido o de estado, venga de donde venga
(también la aprobación en bloque y la caducidad diaria): `trg_evidence_versions` escribe en
`system_evidence_versions` el estado anterior al cambio, con el tipo de cambio (Creada, Editada, Enviada a
revisión, Aprobada, Rechazada, Reabierta o Caducada) y el perfil de quien lo hizo. Las evidencias anteriores
a esta versión no tienen historial previo.

**Errores.** Si la base de datos rechaza o no aplica un cambio (permisos, transición no permitida), la fila
muestra el mensaje en lugar de darlo por hecho.

### Alertas de caducidad

Cada día a las 07:00 una tarea programada:
- crea alertas para las evidencias que caducan en 30 días, en 7 días o ya han caducado;
- pasa a «Caducada» las válidas vencidas;
- retira las alertas de las evidencias cuya caducidad se ha ampliado.

Una alerta descartada no vuelve a aparecer.

## Validaciones

| Situación | Mensaje |
|---|---|
| Sin título | «Faltan datos obligatorios.» |
| URL incorrecta | «La URL no es válida.» |
| Fuera de borrador sin fichero ni URL | «Una evidencia que no está en borrador necesita un fichero adjunto o una URL.» |
| Alta de organización sin fichero ni URL | «Adjunta un fichero o indica la URL del documento.» |
| Rechazo sin motivo | «Las notas de rechazo son obligatorias.» |
| Transición no permitida | «Esta acción no se puede aplicar a una evidencia en estado «…».» |
| Aprobar o rechazar sin el rol | «Solo el Responsable del SGAI puede aprobar o rechazar evidencias.» |
| Aprobar o rechazar la propia | «Quien aporta una evidencia no puede revisarla.» |
| Cambio sin permiso | «No tienes permisos para modificar esta evidencia.» / «No tienes permisos para eliminar esta evidencia.» |
| Fichero de más de 20 MB | «El fichero supera el máximo de 20 MB.» |
| Almacenamiento no configurado | «El almacenamiento de ficheros no está configurado en este entorno.» |
| Fichero que no llegó | «El fichero no llegó al almacenamiento. Inténtalo de nuevo.» |

## Estados

```mermaid
stateDiagram-v2
  [*] --> Borrador
  Borrador --> Pendiente_de_revisión: enviar a revisión
  Pendiente_de_revisión --> Válida: aprobar
  Pendiente_de_revisión --> Rechazada: rechazar
  Rechazada --> Borrador: reabrir
  Rechazada --> Pendiente_de_revisión: enviar a revisión
  Válida --> Caducada: tarea diaria
  Válida --> Borrador: cambiar el contenido
  Caducada --> Borrador: cambiar el contenido
  Pendiente_de_revisión --> Borrador: cambiar el contenido
```

Fuera de estas transiciones, la base de datos rechaza el cambio de estado. Las evidencias «Válidas» que nadie
revisó antes de esta regla llevan la etiqueta `sin-revision`; las del expediente generado (etiqueta
`generado`) se crean válidas porque salen de un documento aprobado.

## Vistas relacionadas

- [Detalle de evidencia](evidencia-detalle.md), [Ficha del sistema](ficha-sistema.md) (pestaña Evidencias).
- [Análisis de brechas](brechas.md): caducidades.
- Negocio: [Biblioteca de evidencias](../negocio/biblioteca-evidencias.md).
