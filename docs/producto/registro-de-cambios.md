---
id: PRD-REGISTRO-CAMBIOS
titulo: Registro de cambios del plan de resolución de gaps
tipo: especificacion
modulo: transversal
audiencia: producto, tecnica
version: 0.1
fuente:
  - docs/producto/plan-resolucion-gaps.md
---

# Registro de cambios del plan de resolución de gaps

Qué se ha cambiado en cada bloque del [plan de resolución de gaps](plan-resolucion-gaps.md) y qué mejora o
resuelve. Se actualiza al cerrar cada bloque, antes de integrarlo en `main`.

**Convenciones:**
- Cada bloque se desarrolla en su rama (`fase0/bXX-…`) y se integra en `main` con un merge al terminar.
- Las **migraciones de base de datos las aplica el responsable del proyecto**. Cuando un bloque incluye
  SQL, se indica en el apartado **Migraciones pendientes de aplicar** con su fichero.
- Referencias: `GAP-nn` ([flujo completo](../funcional/flujo-completo-evaluacion.md)), letras y números como
  `R1` o `T15` ([incidencias](../_incidencias.md)), `Bnn` (bloques del plan).

## Estado

| Bloque | Estado | Rama | Fecha | Migración |
|---|---|---|---|---|
| B00a · Comprobaciones estáticas | Integrado en `main` | `fase0/b00-comprobaciones` | 2026-10-19 | No |
| B00b · Tests de la lógica central | Integrado en `main` | `prep/b00b-tests` | 2026-10-20 | No |
| P1 · Identificadores de perfil y de usuario | Integrado en `main` | `prep/p1-identificadores` | 2026-10-20 | No |
| T9 · `migrate.sh` atómico | Integrado en `main` | `prep/t9-migrate-atomico` | 2026-10-20 | No (cambia el script de migraciones) |
| Logo CompaaS IA (fuera del plan) | Integrado en `main` | `feat/logo-compaas` | 2026-10-20 | No |
| Textos CompaaS IA: títulos y bienvenida (fuera del plan) | Integrado en `main` | `feat/textos-compaas` | 2026-10-20 | No |
| B23a · Roles múltiples por miembro | Integrado en `main` | `fase1/b23a-roles-multiples` | 2026-10-20 | **Sí** · `20261020090000_roles_multiples.sql` |
| B07 · Ciclo único de la evaluación de riesgos | Integrado en `main` | `fase1/b07-ciclo-evaluacion` | 2026-10-20 | **Sí** · `20261020100000_fmea_ciclo_evaluacion.sql` |
| Corrección: editor de roles recortado en Usuarios (fuera del plan) | Integrado en `main` | `fix/usuarios-editor-roles` | 2026-10-20 | No |
| Etiquetas de roles según el glosario (fuera del plan) | Integrado en `main` | `fix/etiquetas-roles` | 2026-10-20 | No |
| B10 · Evidencias: revisión obligatoria y versiones | Integrado en `main` | `fase1/b10-evidencias` | 2026-10-20 | **Sí** · `20261020110000_evidencias_revision_versiones.sql` |
| B09 · Expediente documental: ciclo y rastro | Integrado en `main` | `fase1/b09-expediente` | 2026-10-20 | **Sí** · `20261020120000_expediente_ciclo.sql` |
| B08 · AISIA: mínimo (DP-05) | Integrado en `main` | `fase1/b08-aisia-minimo` | 2026-10-20 | No |
| B23b · Funciones de gobierno, responsables por sistema y comités | Integrado en `main` | `fase1/b23b-gobierno` | 2026-10-20 | **Sí** · `20261020130000_gobierno_designaciones_comites.sql` |
| Decisiones DP-06 a DP-10 (fuera del plan de bloques) | Integrado en `main` | `docs/decisiones-dp06-dp10` | 2026-10-20 | No |
| Glosario: decisiones de DP-01, DP-10, B02, B23a y B23b | Integrado en `main` | `docs/glosario-decisiones` | 2026-10-20 | No |
| B11a · Flujos de aprobación: efectos y apertura por tipo de objeto | Integrado en `main` | `fase2/b11a-aprobaciones-objetos` | 2026-10-20 | **Sí** · `20261020140000_aprobaciones_objetos.sql` |
| B11b · Flujos de aprobación: políticas por defecto de DP-01 | Integrado en `main` | `fase2/b11b-politicas-defecto` | 2026-10-20 | **Sí** · `20261020150000_aprobaciones_tipos_aprobador.sql` y `20261020150100_aprobaciones_politicas_defecto.sql` |
| B11c · Flujos de aprobación: cancelación, caducidad y avisos | Integrado en `main` | `fase2/b11c-cancelacion-caducidad` | 2026-10-20 | **Sí** · `20261020160000_aprobaciones_caducidad.sql` |
| B11d · Flujos de aprobación: consultas, pasos condicionales, Auditor y exclusión de brechas | Integrado en `main` | `fase2/b11d-consultas-condiciones` | 2026-10-20 | **Sí** · `20261020170000_aprobaciones_tipo_exclusion_brecha.sql` y `20261020170100_aprobaciones_consultas_condiciones.sql` |
| B04 · Declaración de Aplicabilidad: rol y propietario | Integrado en `main` | `fase0/b04-declaracion-rol` | 2026-10-19 | No |
| B02 · Controles sugeridos y control libre | Integrado en `main` | `fase0/b02-controles` | 2026-10-19 | **Sí** · `20261019090000_plan_control_libre.sql` |
| B01 · Permisos del plan y del FMEA (DP-01) | Integrado en `main` | `fase0/b01-permisos-plan` | 2026-10-19 | No |
| B06 · Aviso al aprobador y bandeja visible | Integrado en `main` | `fase0/b06-aviso-aprobaciones` | 2026-10-19 | No |
| B03 · Cierre de acciones sin depender de tareas | Integrado en `main` | `fase0/b03-cierre-acciones` | 2026-10-19 | **Sí** · `20261019100000_plan_tareas_de_acciones.sql` |
| B05 · Correcciones del FMEA y del plan | Integrado en `main` | `fase0/b05-correcciones-fmea-plan` | 2026-10-19 | No |

## Migraciones pendientes de aplicar

| Fichero | Bloque | Qué hace | Orden respecto al despliegue |
|---|---|---|---|
| `supabase/migrations/20261019090000_plan_control_libre.sql` | B02 | `controls.template_id` opcional; columnas `title` y `description`; restricción plantilla o título | **Antes** de desplegar B02: el plan de tratamiento y las brechas leen `controls.title` |
| `supabase/migrations/20261019100000_plan_tareas_de_acciones.sql` | B03 | Corrige el responsable de la tarea en los dos triggers; crea la tarea al decidir la opción; genera las tareas que faltan | Antes o después de desplegar B03 (el código funciona sin ella, pero sin tareas nuevas). Revisa el número de tareas creadas por el relleno final |
| `supabase/migrations/20261020090000_roles_multiples.sql` | B23a | Columna `profiles.roles`, trigger de sincronización con `role`, incompatibilidad DPO + Responsable del SGAI, reescritura de las 67 políticas RLS y de dos funciones de aprobación | **Antes** de desplegar B23a: la aplicación lee `profiles.roles` |
| `supabase/migrations/20261020100000_fmea_ciclo_evaluacion.sql` | B07 | Funciones `plan_estado_por_acciones` y `fmea_aplicar_aprobacion_plan`; trigger de estado del plan en `treatment_actions`; propagación tarea → acción en un trigger AFTER; aplica la aprobación a los planes ya aprobados cuya evaluación seguía en revisión | **Antes** de desplegar B07: aprobar un plan llama a `fmea_aplicar_aprobacion_plan`. Revisa cuántas evaluaciones pasan a «Aprobada» |
| `supabase/migrations/20261020110000_evidencias_revision_versiones.sql` | B10 | Reglas del ciclo de revisión en `system_evidences` (alta en borrador, transiciones, aprueba el Responsable del SGAI distinto del autor); versiones registradas por trigger, con fichero y caducidad; etiqueta `sin-revision` en las válidas sin revisar | **Antes** de desplegar B10: la aplicación ya no escribe las versiones. Revisa cuántas evidencias reciben `sin-revision` |
| `supabase/migrations/20261020120000_expediente_ciclo.sql` | B09 | `documents.version` y `previous_id`; reglas del ciclo del expediente (transiciones, edición solo en borrador, aprueba el Responsable del SGAI que no lo redactó); `document_reopen`; etiqueta `sin-revision` en evidencias válidas de PDF de expedientes sin aprobar | **Antes** de desplegar B09: la aplicación lee `documents.version` y llama a `document_reopen`. Aplicar después de la de B10 |
| `supabase/migrations/20261020130000_gobierno_designaciones_comites.sql` | B23b | `governance_designations` con RLS; incompatibilidad DPO + Responsable del tratamiento; responsables en `ai_systems` (y casa `ai_owner` con un miembro si es inequívoco); comité técnico, quórum y desempate; asesores sin voto en `approval_can_decide` y `approval_step_candidates` | **Antes** de desplegar B23b. Aplicar después de las de B10 y B09. Contiene `ALTER TYPE … ADD VALUE`, válido dentro de la transacción de `migrate.sh` (Postgres 12+) |
| `supabase/migrations/20261020140000_aprobaciones_objetos.sql` | B11a | La vista de la bandeja (`v_approval_requests`) resuelve el nombre de la AISIA, la Declaración y la evidencia, y añade `object_href` | **Antes** de desplegar B11a: la bandeja lee `object_href` |
| `supabase/migrations/20261020150000_aprobaciones_tipos_aprobador.sql` | B11b (1/2) | Tipos de aprobador `committee_type` y `function`. Va aparte porque un valor nuevo de enum no se puede usar en la misma transacción | **Antes** de la 2/2 y en una ejecución separada (en Studio, una consulta aparte) |
| `supabase/migrations/20261020150100_aprobaciones_politicas_defecto.sql` | B11b (2/2) | Rol de respaldo y quórum de los pasos; varias políticas activas por tipo con condiciones (gana la más específica); resolución de comité por tipo y función al abrir; siembra de las políticas de DP-01 (trigger al crear la organización y para las existentes, solo en tipos sin política propia); abre solicitud para lo que ya esperaba aprobación | **Antes** de desplegar B11b. Revisa en Ajustes › Aprobaciones las políticas creadas y en Aprobaciones las solicitudes abiertas |
| `supabase/migrations/20261020160000_aprobaciones_caducidad.sql` | B11c | `approval_policies.expires_after_days` y `approval_requests.expires_at` (fijada al abrir); la vista de la bandeja expone `expires_at` | **Antes** de desplegar B11c. Además, en el VPS, añadir al crontab la línea de `approval-expiry` (está en `infra/schedules/crontab`) |
| `supabase/migrations/20261020170000_aprobaciones_tipo_exclusion_brecha.sql` | B11d (1/2) | Tipo de objeto `gap_disposition`. Va aparte porque un valor nuevo de enum no se puede usar en la misma transacción | **Antes** de la 2/2 y en una ejecución separada (en Studio, una consulta aparte) |
| `supabase/migrations/20261020170100_aprobaciones_consultas_condiciones.sql` | B11d (2/2) | Pasos de consulta (`kind`) y condicionales (`condition`), contexto de la solicitud, `approval_decide` con dictamen, el Auditor no decide, `gap_dispositions.status` con su trigger, política de exclusión de brechas y consultas de DP-01 en las políticas por defecto sin editar; etiqueta y enlace de la exclusión en la bandeja | **Antes** de desplegar B11d: la aplicación lee `gap_dispositions.status` y `approval_policy_steps.kind`. Revisa en Ajustes › Aprobaciones las políticas con consulta |

---

## B00a · Comprobaciones estáticas

**Fecha:** 2026-10-19 · **Rama:** `fase0/b00-comprobaciones` · **Migración:** no

**Problema.** Las dos comprobaciones que `CLAUDE.md` exige pasar después de cada cambio daban «correcto»
sin comprobar nada (`T15`):
- `check-server-actions.sh` usaba `mapfile`, que no existe en el bash 3.2 de macOS. El error se perdía y
  el script terminaba con código 0.
- `check-python.sh` llamaba a `python` (en macOS solo existe `python3`) y, sin `pyflakes`, no encontraba
  errores y daba el resultado por bueno.
- Ninguno de los dos tenía permiso de ejecución en git, así que `./tools/…` fallaba.
- `check-server-actions.sh` marcaba `export default async function` (falso positivo) y no detectaba
  `export { … }` ni `export * from`.

**Cambios.**

| Fichero | Cambio |
|---|---|
| `tools/check-server-actions.sh` | Reescrito sin `mapfile` ni `xargs -r` (compatible con bash 3.2). Se sitúa en la raíz del repositorio. Admite `export default async function` y detecta `export { … }` y `export * from`. Falla con código 2 si no encuentra ficheros que revisar |
| `tools/check-python.sh` | Busca `python3` o `python`, o el indicado en `PYTHON=`. Falla con código 2 si no hay Python o `pyflakes`. Se sitúa en la raíz del repositorio |
| Ambos | Permiso de ejecución en git (`100755`) |
| `CLAUDE.md` | Nota de la variable `PYTHON=` |
| `docs/tecnica/herramientas-internas.md` | Comportamiento actualizado; se retira el `TODO` |
| `docs/_incidencias.md`, `docs/_pendientes.md` | `T15` y la fila 226 marcadas como resueltas |

**Verificación.**
- `check-server-actions.sh`: 42 ficheros `'use server'` revisados, sin errores. Con un fichero de prueba
  que exporta una constante y un `export { … }`, falla con código 1 y señala las dos líneas; el
  `export default async function` del mismo fichero no se marca.
- `check-python.sh`: sin `pyflakes`, falla con código 2 y explica cómo instalarlo. Con `pyflakes` (entorno
  virtual), 6 paquetes revisados sin errores. Con un nombre indefinido de prueba, falla con código 1.

**Qué mejora.** Las comprobaciones que protegen de los dos fallos que compilan pero rompen en ejecución
vuelven a funcionar en el entorno de desarrollo (macOS). Es la red mínima antes de tocar código en los
bloques siguientes.

**Pendiente.** Los tests de la lógica central (zonas FMEA, nivel de aprobación, clasificación) quedan para
B00b, antes de la fase 1.

---

## B04 · Declaración de Aplicabilidad: rol, propietario e historial

**Fecha:** 2026-10-19 · **Rama:** `fase0/b04-declaracion-rol` · **Migración:** no

**Problema.** Cuatro fallos con la misma causa (patrón `P1`: se confunde `profiles.id` con
`auth.users.id`):

| # | Fallo | Efecto |
|---|---|---|
| 1 | El rol se buscaba con `profiles.id = user.id` | Nadie veía **Enviar a revisión**, **Aprobar SoA** ni **Iniciar nueva revisión**, y el servidor rechazaba los cambios de estado (`E1`, GAP-28) |
| 2 | El selector de propietario enviaba `profiles.id`, pero `owner_user_id` referencia `auth.users` | Asignar propietario fallaba con «No se pudo actualizar el control.» (`E2`) |
| 3 | El historial de controles escribía `actor_user_id = user.id` (la FK espera `profiles.id`) con el cliente del usuario, y la tabla tiene RLS sin políticas | No se guardaba ningún cambio de control (`E3`, en parte) |
| 4 | El registro del ciclo de vida escribía también `user.id` donde la FK espera `profiles.id` | Los cambios de estado no dejaban rastro |

**Cambios.**

| Fichero | Cambio |
|---|---|
| `plantillas/soa-iso42001/page.tsx` | El rol sale del perfil de la sesión (`getAppAuthState().profile`), que ya está filtrado por la organización activa. Sin consulta extra |
| `plantillas/soa-iso42001/actions.ts` · `transitionSoAStatus` | Mismo origen del rol. «Aprobado por» se busca por `profile.id`. El registro del ciclo de vida guarda `profile.id` |
| `plantillas/soa-iso42001/actions.ts` · `updateSoAControl` | Comprueba que el propietario es miembro de la organización (la escritura va con service role). El historial se escribe con `adminClient` y `actor_user_id = profile.id` |
| `plantillas/soa-iso42001/actions.ts` · `getSoAHistory` | Lee con `adminClient` filtrado por organización, como ya hacía `getSoALifecycleLog` |
| `lib/templates/data.ts` | `OrgMember` incluye `user_id`; el nombre del propietario se resuelve por `user_id` |
| `plantillas/soa-iso42001/soa-client-view.tsx` | El selector de propietario envía `user_id` |
| Documentación | `funcional/declaracion-aplicabilidad.md`, `negocio/declaracion-aplicabilidad.md`, `funcional/flujo-completo-evaluacion.md` (GAP-28), `_incidencias.md` (`E1`, `E2`, `E3` en parte), `_pendientes.md` (117, 118 en parte, 119 en parte, 141) |

**Coherencia.** Se ha preferido el service role filtrado por organización a añadir políticas RLS para no
requerir migración; es el mismo criterio que ya seguía el resto del módulo (`organization_soa_controls`,
`organization_soa_metadata`, `soa_lifecycle_log`). No hay datos que corregir: las escrituras afectadas
fallaban, así que no quedaron filas con identificadores erróneos.

**Verificación.** `tsc --noEmit` sin errores; `next lint` sin avisos en los ficheros cambiados;
`check-server-actions.sh` correcto. No se ha probado contra la base de datos.

**Qué mejora.** La Declaración de Aplicabilidad se puede enviar a revisión y aprobar; su aprobación deja
rastro con autor; los controles admiten propietario e historial. Elimina uno de los cinco cortes del flujo
(GAP-28).

**Pendiente en el área.** Aplicar propuestas borra la justificación de los excluidos y la vista de
impresión tiene textos fijos (`E3`); la vista Por sistema no usa los vínculos reales. La aprobación por
Flujos de aprobación llega con B11.

---

## B02 · Controles sugeridos y control propio

**Fecha:** 2026-10-19 · **Rama:** `fase0/b02-controles` ·
**Migración:** **sí**, `supabase/migrations/20261019090000_plan_control_libre.sql` (aplicar antes de desplegar)

**Problema.**
- Las tres consultas de controles sugeridos (evaluación FMEA, plan de tratamiento y brechas) pedían
  `control_templates.name`, una columna que no existe (es `title`). La lista salía vacía, y en brechas el
  error se perdía en silencio (`R1`).
- Sin controles sugeridos no se podía elegir **Mitigar**, y tampoco había forma de crear un control que no
  estuviera en el catálogo (`R9`). En la práctica, ningún modo de fallo se podía mitigar (GAP-15).

**Cambios.**

| Fichero | Cambio |
|---|---|
| `lib/fmea/data.ts`, `lib/fmea/treatment-plan.ts`, `lib/gaps/data.ts` | `name` → `title` en las consultas de plantillas de control |
| `lib/gaps/data.ts` | Se registra el error si fallan las plantillas; las brechas de control de un control propio muestran «Control propio · {título}» |
| `supabase/migrations/20261019090000_plan_control_libre.sql` | `controls.template_id` deja de ser obligatorio; columnas `title` y `description`; restricción `chk_controls_template_or_title` |
| `plan/actions.ts` | `saveTreatmentActionDecision` acepta un control propio (`customControlTitle`, `customControlDescription`, título de 5 caracteres o más) y lo crea, o lo actualiza si la acción ya tenía uno. El autoguardado conserva y actualiza un control propio ya creado |
| `lib/fmea/treatment-plan.ts`, `treatment-plan-utils.ts` | La acción incluye `custom_control_title` y `custom_control_description`, leídos de los controles sin plantilla |
| `plan/action-detail-panel.tsx`, `plan/treatment-plan-client.tsx` | Opción **Control propio** (título y descripción) bajo los sugeridos, también cuando el modo no tiene sugerencias. Elegir un sugerido descarta el propio y al revés |
| Documentación | `funcional/plan-de-tratamiento.md`, `funcional/catalogo-medidas.md`, `funcional/catalogo-modo-medida.md`, `tecnica/modelo-datos.md`, `funcional/flujo-completo-evaluacion.md` (GAP-15), `_incidencias.md` (`R1`, `R9`), `_pendientes.md` (102, 184, 177 y 181 en parte, y una fila nueva para el glosario) |

**Coherencia.** Ninguna vista ni función de la base de datos usa `controls.template_id`. Los demás lectores
de `controls` (sugerencias de la evaluación FMEA) filtran por plantilla, así que un control propio no
aparece como sugerencia de otros modos, que es lo esperado. El envío del plan a aprobación sigue exigiendo
`control_id` en las mitigaciones, lo cumplan con plantilla o con control propio.

**Verificación.** `tsc --noEmit` sin errores; `next lint` sin avisos en los ficheros cambiados;
`check-server-actions.sh` correcto. No se ha probado contra la base de datos.

**Qué mejora.** Se puede mitigar: con un control del catálogo (las sugerencias vuelven a aparecer) o con un
control propio. Elimina el segundo de los cinco cortes del flujo (GAP-15) y la fricción F-08 del plan.

**Pendiente.** Validar en el glosario el término «Control propio». El autoguardado no crea controles
nuevos (ni de plantilla ni propios): se crean con **Guardar decisión**, como hasta ahora (ver B05, `R7`).

---

## B01 · Permisos del plan y del FMEA según DP-01

**Fecha:** 2026-10-19 · **Rama:** `fase0/b01-permisos-plan` · **Migración:** no

**Problema.** Los permisos del plan de tratamiento y de la segunda revisión del FMEA se comprobaban contra
`['admin', 'editor', 'dpo', 'technical']`, de los que solo existe `dpo`. En la práctica:
- solo el DPO podía editar y enviar el plan, y resolver segundas revisiones; sin DPO el flujo se detenía;
- el aprobador del plan sin política se elegía con esos mismos roles y acababa siendo el DPO o «el primer
  miembro distinto de quien envía» (GAP-14, en parte);
- había dos copias de esa lógica (al enviar el FMEA y al enviar el plan);
- la pantalla no sabía nada de roles: quien no podía editar veía todos los botones, y el autoguardado
  fallaba en el servidor.

**Cambios.**

| Fichero | Cambio |
|---|---|
| `lib/auth/roles-flujo.ts` (nuevo) | Roles de DP-01 en un único sitio: preparan el plan el **Analista de riesgos** y el **Responsable del sistema**; la segunda revisión la resuelve el **Responsable del SGAI** (propuesta pendiente de confirmar); el aprobador sin política es el **Responsable del SGAI** en los tres niveles. B23 lo sustituirá por roles múltiples |
| `lib/fmea/treatment-plan.ts` | `getApproverRolePriority` devuelve los roles de DP-01. Nueva `resolvePlanApprover` única: miembro **activo**, con rol aprobador y **distinto de quien envía**; si no hay ninguno, devuelve `null` en lugar de elegir a cualquiera. `read_only` del plan también depende del rol de quien mira |
| `plan/actions.ts` | Edición solo para quien prepara. Al enviar sin política: si no hay aprobador, error claro; si el aprobador guardado es quien envía, se busca otro (quien prepara no aprueba). Se elimina la copia local del resolutor |
| `evaluar/actions.ts` | Segunda revisión solo para el Responsable del SGAI distinto del evaluador. Al enviar el FMEA, el plan se crea aunque todavía no haya aprobador: se exige al enviarlo a aprobación. Se elimina la copia local del resolutor |
| `plan/page.tsx`, `evaluar/page.tsx`, `lib/fmea/data.ts`, `evaluar/fmea-evaluation-client.tsx` | El rol llega a la pantalla: el plan se muestra en solo lectura a quien no prepara, y el botón de segunda revisión solo aparece al Responsable del SGAI; texto de ayuda corregido |
| Documentación | `funcional/plan-de-tratamiento.md`, `funcional/fmea-evaluacion.md`, `funcional/flujo-completo-evaluacion.md` |

**Coherencia.** El DPO deja de editar planes (DP-01: consultivo). Las demás vistas que construyen el plan
(pestaña de la ficha y resumen) son de solo lectura y no cambian. La edición de la evaluación FMEA sigue
sin comprobar el rol en el servidor (depende de RLS); se restringirá con el modelo de roles (B23).

**Verificación.** `tsc --noEmit` sin errores; `next lint` sin avisos nuevos (queda uno previo de
`useMemo` en `fmea-evaluation-client.tsx`); `check-server-actions.sh` correcto. No se ha probado contra la
base de datos.

**Qué mejora.** El flujo ya no depende de tener un DPO. Prepara quien debe, aprueba un Responsable del SGAI
que nunca es quien envía, y la pantalla refleja los permisos reales. Elimina el tercer corte del flujo y
la parte de «aprobador al azar» de GAP-14.

**Impacto para las organizaciones existentes.** Un DPO que tuviera un plan en borrador deja de poder
editarlo: lo continúa un Analista de riesgos o un Responsable del sistema. Los planes ya enviados conservan
su aprobador; si era quien envió, al volver a enviarlo se asigna otro.

**Pendiente.** Confirmar el rol de la segunda revisión (`_pendientes.md` 245). El aviso al aprobador en la
vía sin política llega con B06; los comités de los niveles 2 y 3, con las políticas por defecto de B11.

---

## B06 · Aviso al aprobador y bandeja de Aprobaciones visible

**Fecha:** 2026-10-19 · **Rama:** `fase0/b06-aviso-aprobaciones` · **Migración:** no

**Problema.**
- Sin política en Flujos de aprobación, el aprobador asignado a un plan no recibía ningún aviso: tenía que
  descubrir el plan por su cuenta (GAP-14).
- La entrada **Aprobaciones** del menú solo aparecía con el módulo `approvals` activo, que la prueba
  automática no concede. Una organización nueva no veía la bandeja (GAP-01). Flujos de aprobación es Core
  desde la revisión v1.3 del inventario (§14.2), pero el código lo seguía tratando como módulo.

**Cambios.**

| Fichero | Cambio |
|---|---|
| `plan/actions.ts` | Al enviar un plan sin política, aviso en la app al aprobador asignado: «Aprobación pendiente: plan {código}», con el nivel y enlace al plan |
| `lib/fmea/treatment-plan.ts` | `getApprovalLevelLabel`: nombre de negocio del nivel (glosario) |
| `lib/modules/registry.ts` | `approvals` sale del catálogo de módulos: deja de mostrarse en **Organización › Módulos** y no se puede activar ni desactivar |
| `app/(app)/layout.tsx`, `components/layout/sidebar.tsx` | La entrada **Aprobaciones** aparece siempre |
| `plan/treatment-plan-ui-constants.ts` | Descripción de los niveles 2 y 3 según DP-01 (Comité de Riesgos de IA, Revisión por la Dirección) |
| Documentación | `funcional/aprobaciones.md`, `funcional/organizacion.md`, `funcional/navegacion.md`, `negocio/flujos-de-aprobacion.md`, `negocio/modulos-y-planes.md`, `funcional/flujo-completo-evaluacion.md` (GAP-01, GAP-14) |

**Coherencia.** Las filas `approvals` que pueda haber en `organization_modules` quedan sin efecto (ya no se
leen) y no hace falta borrarlas. El aviso usa el mismo tipo (`approval_pending`) y el mismo emisor
(`createNotification`) que la vía con política. No envía correo: los avisos por correo de aprobaciones son
la incidencia `S12` (bloque B11).

**Verificación.** `tsc --noEmit` sin errores; `next lint` sin avisos nuevos (queda uno previo de `useMemo`
en `sidebar.tsx`); `check-server-actions.sh` correcto. No se ha probado contra la base de datos.

**Qué mejora.** Los aprobadores se enteran de lo que tienen pendiente y encuentran la bandeja en el menú,
también en organizaciones recién creadas. Cierra GAP-01 y GAP-14.

---

## B03 · Tareas de las acciones y cierre sin tarea

**Fecha:** 2026-10-19 · **Rama:** `fase0/b03-cierre-acciones` ·
**Migración:** **sí**, `supabase/migrations/20261019100000_plan_tareas_de_acciones.sql`

**Problema.**
- Las tareas de las acciones del plan no se creaban nunca: el trigger solo actuaba al **insertar** una
  acción con opción, y las acciones se crean sin opción (`R2`).
- La pantalla solo dejaba cerrar una acción y registrar su severidad residual desde el estado de su tarea.
  Sin tareas, ninguna acción se podía cerrar (GAP-18).
- **Hallazgo nuevo:** los dos triggers (crear la tarea y sincronizarla) escribían en `tasks.assignee_id` el
  `owner_id` de la acción, que guarda `auth.users.id`, cuando esa columna referencia `profiles.id`. En
  cuanto se creara una tarea, el guardado de la acción fallaría por la clave foránea. No se había notado
  porque nunca se ejecutaban.
- **Hallazgo nuevo:** al cerrar una mitigación con tarea, la aplicación marcaba primero la tarea como
  hecha; un trigger de la tarea completaba la acción, y cuando se registraba la severidad residual la
  acción ya estaba completada. El trigger que traslada la severidad residual al FMEA no se disparaba.
- Se podía registrar la severidad residual (que cambia el FMEA) en un plan sin aprobar.

**Cambios.**

| Fichero | Cambio |
|---|---|
| `supabase/migrations/20261019100000_plan_tareas_de_acciones.sql` | La función de creación ignora acciones sin opción, aceptadas o con tarea, y traduce el responsable a `profiles.id`. La de sincronización también. Trigger nuevo `BEFORE UPDATE OF option` que crea la tarea al decidir la opción. Relleno de las tareas de las acciones ya decididas y abiertas |
| `plan/actions.ts` · `recordMitigarResidualAction` | Tarea opcional. Exige el plan aprobado o en ejecución. Actualiza primero la acción y después la tarea, para que la severidad residual llegue al FMEA |
| `plan/actions.ts` · `saveTreatmentActionDecision` | Devuelve la tarea creada por la base de datos |
| `plan/action-detail-panel.tsx`, `actions-group-section.tsx`, `treatment-plan-client.tsx`, `record-residual-modal.tsx` | Botón **Cerrar acción** en las mitigaciones sin tarea de un plan aprobado; el modal acepta cerrar sin tarea; la tarea creada aparece sin recargar |
| Documentación | `funcional/plan-de-tratamiento.md`, `negocio/plan-de-tratamiento.md`, `negocio/tareas.md`, `funcional/tareas.md`, `funcional/flujo-completo-evaluacion.md` (GAP-18), `_incidencias.md` (`R2`), `_pendientes.md` (104, 116, 160 en parte) |

**Coherencia.** La lógica de la tarea sigue en la base de datos (un único sitio para el alta, la decisión y
el relleno). Las tareas que crea el trigger no generan aviso al asignado, igual que el resto de tareas que
crean otros módulos.

**Verificación.** `tsc --noEmit` sin errores; `next lint` sin avisos en los ficheros cambiados;
`check-server-actions.sh` correcto. La migración no se ha ejecutado: la aplicas tú.

**Qué mejora.** Las acciones del plan tienen su tarea, se pueden cerrar con o sin ella y la severidad
residual llega al FMEA, con lo que la zona del sistema puede bajar. Elimina el cuarto corte del flujo
(GAP-18).

**Pendiente.** Completar una tarea desde **Tareas** o **Kanban** sigue cerrando la acción aunque el plan no
esté aprobado, y sin pedir la severidad residual; el ciclo de vida completo llega con B07.

---

## B05 · Correcciones del FMEA y del plan

**Fecha:** 2026-10-19 · **Rama:** `fase0/b05-correcciones-fmea-plan` · **Migración:** no

**Problema.**

| Ref. | Fallo |
|---|---|
| `R4` | Guardar (también el autoguardado) devolvía a borrador una evaluación enviada y convertía en evaluador a quien guardaba, rompiendo la segregación de la segunda revisión. Se podía modificar la evaluación aunque su plan ya estuviera aprobado |
| `R5` | El autoguardado rellenaba O = 3, D = 3 y una severidad sugerida en los ítems pendientes; esa severidad aparecía en Evaluaciones (alertas de Zona I) y en la exportación |
| `R6` | Ningún ajuste individual quedaba marcado como manual, así que aplicar o retirar una estimación por familia sobrescribía los modos confirmados uno a uno |
| `R7` | **Guardar borrador** del plan no guardaba las decisiones de las acciones, aunque la vista las daba por guardadas |
| `R8` | «Diferir» no guardaba fecha de revisión, así que las acciones pospuestas nunca llegaban a Revisiones pendientes |

**Cambios.**

| Fichero | Cambio |
|---|---|
| `evaluar/actions.ts` · `requireEditableEvaluation` | Una evaluación enviada solo admite cambios mientras su plan siga en borrador |
| `evaluar/actions.ts` · `saveFmeaDraft` | Los ítems pendientes se guardan sin rellenar O y D ni severidad. El evaluador solo se fija si no lo había |
| `evaluar/actions.ts` · `saveFmeaItem`, posponer en bloque | Marcan el ítem como ajuste manual (`estimate_source = 'manual'`). **Restablecer a pendiente** quita la marca |
| `evaluar/fmea-evaluation-client.tsx`, `lib/fmea/data.ts` | El cliente envía los pendientes sin normalizar; la evaluación se muestra en solo lectura si su plan está en aprobación o aprobado (`lockedByPlan`) |
| `plan/treatment-plan-client.tsx` | **Guardar borrador** envía las acciones modificadas (misma función que el autoguardado) |
| `plan/actions.ts`, `action-detail-panel.tsx`, `bulk-change-option-modal.tsx` | Fecha de revisión obligatoria y guardada en Diferir, en la decisión individual, el autoguardado, el cambio en bloque y el envío |
| `plan/actions.ts` · envío | La justificación mínima de Transferir, Evitar y Diferir al enviar pasa de 30 a 50 caracteres, la misma que exige la decisión individual |
| Documentación | `funcional/fmea-evaluacion.md`, `funcional/plan-de-tratamiento.md`, `funcional/revisiones-pendientes.md`, `funcional/flujo-completo-evaluacion.md` (GAP-13 en parte, GAP-16, GAP-21 en parte), `_incidencias.md` (`R4` a `R8`), `_pendientes.md` |

**Verificación.** `tsc --noEmit` sin errores; `next lint` sin avisos nuevos (queda uno previo de `useMemo`);
`check-server-actions.sh` correcto. No se ha probado contra la base de datos.

**Qué mejora.** La evaluación deja de volver sola a borrador y de cambiar de evaluador; no aparecen
severidades que nadie ha confirmado; las estimaciones por familia respetan los ajustes manuales; el borrador
del plan guarda lo que dice guardar; y lo pospuesto entra en las revisiones periódicas.

**Impacto para las organizaciones existentes.** Las acciones diferidas sin fecha de revisión no se pueden
volver a enviar hasta tener fecha. Las evaluaciones con el plan en aprobación o aprobado pasan a solo lectura.

**Pendiente.** El ciclo de vida completo de la evaluación (aprobada, sustituida, versión 2) llega con B07.

---

## B00b · Tests de la lógica central

**Fecha:** 2026-10-20 · **Rama:** `prep/b00b-tests` · **Migración:** no

**Problema.** No había ningún test. Los bloques de la fase 1 (sobre todo B07) cambian la lógica central del
FMEA y del plan, y sin una red mínima un error en las reglas de zona o de aprobación no se detectaría hasta
producción.

**Cambios.**

| Fichero | Cambio |
|---|---|
| `apps/web/lib/fmea/treatment-plan-rules.ts` (nuevo) | Reglas puras del plan movidas desde `treatment-plan.ts`: nivel de aprobación, cadencia y plazo por zona, nombre del nivel, roles aprobadores. Nueva `pickPlanApprover`, la regla de elección del aprobador sin base de datos |
| `apps/web/lib/fmea/treatment-plan.ts` | Reexporta esas reglas (nadie cambia sus importaciones); `resolvePlanApprover` usa `pickPlanApprover` |
| `apps/web/tests/` (nuevo) | `fmea-domain.test.ts` y `plan-reglas.test.ts`: 18 casos. `support/` con el hook de resolución de `@/` y de importaciones sin extensión |
| `apps/web/package.json` | Script `npm test` (`node --test`, sin dependencias nuevas) |
| `CLAUDE.md`, `docs/tecnica/herramientas-internas.md` | Comando y alcance de los tests |

**Verificación.** `npm test`: 18 de 18; `tsc --noEmit` sin errores (incluye los tests).

**Qué mejora.** Las reglas que deciden la zona, la severidad, el nivel de aprobación, el plazo y quién
prepara y aprueba quedan fijadas por tests. Cualquier cambio que las altere sin querer falla en `npm test`.

**Límites.** No hay tests de integración contra la base de datos (el recorrido alta → FMEA → plan →
aprobación que proponía B00). Requieren una base local con las migraciones; se pueden abordar cuando haya
entorno local.

---

## P1 · Identificadores de perfil y de usuario

**Fecha:** 2026-10-20 · **Rama:** `prep/p1-identificadores` · **Migración:** no

**Problema.** Patrón P1 de `_incidencias.md`: en varias pantallas se guarda el identificador de usuario
(`auth.users.id`) y se busca por el de perfil (`profiles.id`), o al revés. B04 y B01 lo corrigieron en la
Declaración de Aplicabilidad y en el plan; quedaban estos sitios:

| Sitio | Efecto |
|---|---|
| Biblioteca y detalle de evidencias | Responsable y revisor salían vacíos |
| Plan de tratamiento | Nombres de responsables y aprobador como «Usuario» (`R10`); el reasignado en bloque siempre respondía «no pertenece a la organización» |
| Planes de tratamiento | Nombres vacíos y filtro por aprobador sin resultados (`R10`) |
| Recordatorio semanal de revisiones | El aviso se dirigía a un identificador que no es de perfil y no llegaba (`R11`) |
| Vistas guardadas de tareas | No se guardaban ni se borraban: la clave foránea y la RLS esperan `auth.users.id` (`O13`) |
| Análisis de brechas | Responsables como «Sin owner» y **Mis gaps** vacío |

**Regla aplicada.** Los campos de responsable, aprobador, revisor y autor de vista guardan `auth.users.id`
(así lo exigen sus claves foráneas o las RLS). Los nombres se buscan por `profiles.user_id`, filtrando por la
organización. Donde conviven ambos tipos (detalle de evidencia, brechas), la búsqueda acepta los dos.

**Cambios.**

| Fichero | Cambio |
|---|---|
| `lib/evidences/data.ts` | Nombres por `profiles.user_id` |
| `lib/evidences/detail.ts`, `lib/gaps/data.ts` | Búsqueda por `user_id` o `id` y mapa con las dos claves |
| `lib/fmea/treatment-plan.ts` | Nombres de miembros por `user_id` |
| `plan/actions.ts` · reasignado en bloque | Valida el responsable por `user_id` |
| `app/(app)/planes/page.tsx` | Los miembros se identifican por `user_id` |
| `app/api/cron/review-reminders/route.ts` | Traduce cada responsable a su perfil en la organización antes de avisar; si ya no es miembro, cuenta como sin asignar |
| `app/(app)/tareas/actions.ts` | Vistas guardadas con `owner_id = auth.users.id` |
| `app/(app)/gaps/page.tsx` | **Mis gaps** compara con el usuario de la sesión |
| Documentación | `funcional/{evidencias,plan-de-tratamiento,planes-de-tratamiento,revisiones-pendientes,tareas,brechas}.md`, `_incidencias.md` (`P1`, `R10`, `R11`, `O13`), `_pendientes.md` |

**Verificación.** `tsc --noEmit` sin errores; `next lint` sin avisos; `npm test` 18 de 18;
`check-server-actions.sh` correcto. No se ha probado contra la base de datos.

**Qué mejora.** Los nombres de responsables, aprobadores y revisores aparecen; el filtro por aprobador, **Mis
gaps** y el reasignado en bloque funcionan; el recordatorio semanal llega a su destinatario; las vistas
guardadas de tareas se guardan.

---

## T9 · `migrate.sh` atómico

**Fecha:** 2026-10-20 · **Rama:** `prep/t9-migrate-atomico` · **Migración:** no

**Problema.**
- La migración y su registro en `supabase_migrations.schema_migrations` iban en dos llamadas a psql. Si la
  segunda fallaba o se cortaba la conexión, la migración quedaba aplicada sin registrar y el siguiente
  `migrate.sh` la volvía a ejecutar (`T9`).
- **Hallazgo nuevo:** la migración se pasaba con `-1 < fichero`. psql solo abre la transacción de `-1` con
  `-c` o `-f`; con la entrada redirigida, cada sentencia se confirmaba por separado. Una migración que
  fallara a medias quedaba aplicada en parte.

**Cambios.**

| Fichero | Cambio |
|---|---|
| `infra/db/migrate.sh` | La migración y su `INSERT` de registro van juntos por `--single-transaction -f -`. Se registra también el nombre del fichero. Marca `-- migrate: sin-transaccion` para el caso excepcional de sentencias que no admiten transacción |
| `docs/tecnica/despliegue.md` | Procedimiento actualizado; se retira el `TODO` |

Todas las migraciones actuales admiten transacción (ninguna usa `CONCURRENTLY`, `VACUUM` ni `BEGIN`/`COMMIT`
propios).

**Verificación.** `bash -n` correcto. Ejecución simulada con `docker` y `git` falsos: la migración ya
aplicada se salta; la nueva llega a psql junto con su registro en una sola transacción; la marcada sin
transacción va por separado; si psql falla, el script termina con error sin registrar ni continuar. No se ha
ejecutado contra una base de datos real.

**Acción para ti.** El servidor usa una copia en `/root/migrate.sh`. Hay que actualizarla:
`cp infra/db/migrate.sh /root/migrate.sh && chmod +x /root/migrate.sh`.

---

## Logo CompaaS IA (fuera del plan)

**Fecha:** 2026-10-20 · **Rama:** `feat/logo-compaas` · **Migración:** no

**Petición.** Sustituir el logo de Fluxion por el nuevo logo CompaaS IA («by Fluxion»).

**Cambios.**

| Fichero | Cambio |
|---|---|
| `apps/web/public/compaas-ia.png` (nuevo) | Logotipo sin márgenes, 833×240 px, generado desde `CompaaS_IA.png` (el original se conserva como fuente) |
| `apps/web/public/compaas-ia-simbolo.png` (nuevo) | Símbolo (círculo con el check) recortado del logotipo con máscara circular, 256×256 px |
| `apps/web/app/favicon.ico` | Favicon nuevo a partir del símbolo (16, 32, 48 y 64 px) |
| `app/(auth)/login/page.tsx`, `app/(auth)/onboarding/page.tsx` | Logotipo nuevo |
| `components/layout/sidebar.tsx` | Logotipo nuevo con el menú expandido y símbolo con el menú plegado |
| `apps/web/public/fluxion.png`, `logo_2.png` | Eliminados: ya no se usan |

**Verificación.** `tsc --noEmit` sin errores; `next lint` sin avisos nuevos. No se ha visto en el navegador.

**Pendiente de decidir.** Los textos siguen diciendo «Fluxion» (ver el bloque siguiente para los ya cambiados).

---

## Textos CompaaS IA: títulos de pestaña y bienvenida (fuera del plan)

**Fecha:** 2026-10-20 · **Rama:** `feat/textos-compaas` · **Migración:** no

**Cambios.**
- Título general de la pestaña: «Fluxion SaaS» → «CompaaS IA» (`app/layout.tsx`).
- Títulos de pestaña de 20 páginas: «… · Fluxion» y «… | Fluxion» → «… · CompaaS IA» y «… | CompaaS IA»
  (inicio de sesión, registro, tareas, planes, aprobaciones, observabilidad, cuestionario preliminar, etc.).
- Inicio de sesión: «Bienvenido a Fluxion» → «Bienvenido a CompaaS IA».

**Verificación.** `tsc --noEmit` sin errores.

**Pendiente (más adelante, a petición del responsable).** Resto de textos con «Fluxion»: descripción del
registro, mensaje de prueba de canales de Slack y Teams, correos, PDF generados y documentación.

---

## B23a · Roles múltiples por miembro

**Fecha:** 2026-10-20 · **Rama:** `fase1/b23a-roles-multiples` ·
**Migración:** **sí**, `supabase/migrations/20261020090000_roles_multiples.sql` (aplicar antes de desplegar)

**Problema.** Cada miembro tenía un solo rol (`profiles.role`). DP-01 exige acumular roles (Administrador +
Responsable del SGAI, Responsable del sistema + Analista de riesgos…) y permitir varios Administradores. Con
B01 se notaba: un Administrador no podía preparar ni aprobar planes. Además, el rol de Administrador no se
podía asignar al invitar, y las invitaciones no validaban el rol (`A14`).

**Decisiones del responsable (2026-10-20).** Adelantar B23 a B07. El rol de Administrador se combina con
cualquier otro y puede haber más de un Administrador.

**Cambios en la base de datos** (migración):
- `profiles.roles` (`org_role[]`): todos los roles. `profiles.role` se mantiene como rol principal
  (= `roles[1]`), sincronizado por el trigger `trg_profiles_sync_roles` en los dos sentidos (una escritura
  antigua de `role` sustituye el principal y conserva los demás).
- Restricciones `chk_profiles_rol_principal` y `chk_profiles_dpo_no_sgai` (DPO + Responsable del SGAI).
- Las **67 políticas RLS** que comparaban `profiles.role` se reescriben desde el catálogo a `roles && ARRAY[…]`.
  La migración comprueba al final que no queda ninguna con el patrón antiguo; si queda, se aborta.
- `approval_can_decide` y `approval_step_candidates` comparan con la lista de roles.

**Cambios en la aplicación:**

| Área | Cambio |
|---|---|
| `lib/auth/roles.ts` (nuevo) | `rolesOf`, `hasRole`, `hasAnyRole`, `findIncompatibleRoles`: toda comprobación de permisos mira la lista completa |
| `lib/auth/app-state.ts`, `lib/types/auth.ts`, `lib/fmea/data.ts` | La sesión y los contextos cargan `roles` |
| 37 consultas sobre `profiles` | Leen también `roles` |
| 39 comprobaciones de permisos (ajustes, organización, usuarios, aprobaciones, incidentes, descubrimientos, logo, perfil) | `hasRole`/`hasAnyRole` en lugar de comparar `role` |
| Plan, FMEA, Declaración de Aplicabilidad, ficha del sistema (aprobar AISIA), comités, incidentes | La interfaz recibe todos los roles |
| Avisos de incidentes y señales, aprobador sin política | Destinatarios y candidatos por cualquiera de sus roles (`.overlaps('roles', …)`) |
| `lib/users/roles.ts` | Los diez roles son asignables, incluido Administrador |
| **Usuarios** | Editor de roles con casillas en cada fila (también para uno mismo); invitar y crear admiten Administrador; validación de roles en invitaciones; la organización conserva siempre un Administrador activo (al quitar el rol, desactivar o eliminar); errores visibles |
| **Perfil** | Los roles pasan a solo lectura: cambiar el rol principal desde aquí podía quitar el rol de Administrador sin la comprobación de Usuarios |
| Tests | `tests/roles.test.ts` y casos de roles múltiples en `plan-reglas.test.ts` (23 en total) |

**Verificación.**
- Migración probada en un Postgres 17 local con las 53 migraciones del repositorio cargadas (arnés con
  Supabase simulado): se aplica, es idempotente (la segunda vez no reescribe nada), el trigger sincroniza bien,
  la incompatibilidad se rechaza, la RLS acepta un rol secundario y rechaza a quien no tiene rol, y las
  funciones de aprobación encuentran al candidato por un rol secundario.
- `tsc --noEmit` sin errores, `next lint` sin avisos en las áreas tocadas, `npm test` 23/23,
  `check-server-actions.sh` correcto.

**Pendiente (B23b).** Responsable de supervisión humana por sistema, comité técnico, voz sin voto en comités y
funciones de gobierno (CISO, Legal, Responsable del tratamiento). Las invitaciones asignan un solo rol; el
resto se añade en **Miembros**.

---

## B07 · Ciclo único de la evaluación de riesgos

**Fecha:** 2026-10-20 · **Rama:** `fase1/b07-ciclo-evaluacion` ·
**Migración:** **sí**, `supabase/migrations/20261020100000_fmea_ciclo_evaluacion.sql` (aplicar antes de desplegar)

**Problema.** La evaluación FMEA y su plan no tenían un ciclo de vida completo (GAP-13, GAP-20, parte de
GAP-32; F-06 y F-07):
- la evaluación se quedaba «En revisión» para siempre: nada la aprobaba, así que no había versión vigente,
  no se podía abrir la versión 2 y la comparativa era inalcanzable;
- el plan se quedaba «Aprobado»: nada lo pasaba a «En ejecución», «Cerrado» ni «Sustituido»;
- las acciones «Aceptar» se quedaban «Pendiente» y el plan no habría podido cerrarse nunca;
- sin candidatos a tratamiento no se creaba plan y la evaluación no pasaba por ninguna aprobación;
- reenviar una evaluación corregida no ajustaba el plan (zona, nivel, acciones sobrantes) y cambiaba el
  evaluador.

**Decisión aplicada.** DP-03 (2026-10-19): la evaluación FMEA y el plan forman una sola evaluación de
riesgos del sistema.

**Desviación respecto al plan.** El plan proponía marcar la versión anterior como sustituida al **crear**
la nueva. Se hace al **aprobar** la nueva: así el sistema conserva una evaluación aprobada mientras dura la
reevaluación, y el plan en ejecución no se interrumpe hasta que hay otro aprobado.

**Bug encontrado y corregido.** Completar desde **Tareas** la tarea de una acción del plan fallaba siempre:
`trg_task_done_propagate` (BEFORE UPDATE en `tasks`) completaba la acción, y su trigger AFTER volvía a
actualizar la misma tarea, que Postgres rechaza («tuple to be updated was already modified by an operation
triggered by the current command»). La propagación pasa a un trigger AFTER.

**Cambios en la base de datos** (migración):
- `fmea_aplicar_aprobacion_plan(plan, aprobador)`, en una transacción: acciones «Aceptar» → `accepted` con
  `acceptance_approved_by/at`; evaluación → `approved` con aprobador, fecha y `next_review_at` según la
  cadencia; versiones anteriores → `superseded`, sus planes abiertos → `superseded` y sus acciones abiertas
  → `cancelled` (con sus tareas); plan → `in_progress` o `closed`. Solo `service_role`.
- `plan_estado_por_acciones` y el trigger `trg_treatment_action_plan_status`: un plan aprobado está
  `in_progress` mientras quede una acción que no sea `completed`, `accepted` ni `cancelled`, y `closed` si
  no queda ninguna; se reabre si una acción vuelve a abrirse.
- `trg_task_done_propagate_action` (AFTER, `SECURITY DEFINER`): la propagación tarea → acción.
- Datos: se aplica la aprobación a los planes aprobados cuya evaluación seguía «En revisión», de la versión
  más antigua a la más reciente.

**Cambios en la aplicación:**

| Área | Cambio |
|---|---|
| `lib/fmea/lifecycle-rules.ts` (nuevo, puro) | Reglas del ciclo: estado del plan según sus acciones, próxima revisión, cuándo se puede abrir una versión nueva, evaluación de referencia y etiquetas |
| `lib/fmea/lifecycle.ts` (nuevo) | `applyRiskEvaluationApproval`: llama a la función de la base de datos, guarda las instantáneas (ejecución iniciada o plan cerrado; reemplazado) y el historial del sistema |
| Aprobación del plan | La aprueban igual las dos vías: aprobador asignado (`approveTreatmentPlanAction`) y Flujos de aprobación (`lib/approvals/effects.ts`, que ahora recibe quién decidió) |
| Envío de la evaluación | Siempre crea o actualiza el plan, también sin candidatos (plan sin acciones). En un reenvío recalcula zona, nivel, cadencia y recuentos, vuelve a asignar aprobador si cambia el nivel, retira las acciones de modos que ya no son candidatos y cancela sus tareas. Conserva el evaluador |
| Entrada al FMEA | Abre la versión en curso o, si no hay, la vigente; solo crea la versión 1. Ya no hay creación implícita de versiones |
| **Nueva versión** (`startFmeaReevaluationAction`) | Desde la vigente, para Analista de riesgos y Responsable del sistema. Copia los valores, justificaciones y segundas revisiones de los modos confirmados y las estimaciones por familia; los modos nuevos arrancan pendientes |
| Barra de versiones (evaluación y plan) | Vigente con próxima revisión (en rojo si vence), en curso o sustituida; enlaces a la vigente y a la versión en curso; botón **Nueva versión** |
| Revisión periódica | Una aceptación que pasa a tratarse vuelve a «Pendiente» y reabre el plan |
| Evaluaciones, Dashboard | Etapas «Plan en ejecución» y «Evaluación vigente»; la fila usa la última versión y su plan (antes, el último modificado) |
| Brechas, documentos, ficha | Usan la evaluación de referencia (la vigente; si no hay, la última) y su plan. La ficha muestra el plan en ejecución mientras una reevaluación no tiene plan |
| Tests | `tests/ciclo-evaluacion.test.ts` (31 en total) |

**Verificación.**
- Migración probada en el Postgres local con todas las migraciones del repositorio: la migración de datos
  aprueba una evaluación con plan aprobado (aceptación aprobada, próxima revisión a tres meses, plan en
  ejecución); completar la tarea de la última acción cierra el plan y reabrir la acción lo devuelve a
  ejecución; aprobar la versión 2 sustituye la 1 y su plan, cancela su acción abierta y su tarea, y cierra
  el plan vacío de la 2. Es idempotente.
- `tsc --noEmit` sin errores, `next lint` sin avisos nuevos, `npm test` 31/31, `check-server-actions.sh`
  correcto.

**Documentación.** `funcional/fmea-evaluacion.md` (entrada, envío, aprobación, versiones, estados),
`funcional/plan-de-tratamiento.md` (estados y aprobación), `funcional/fmea-comparativa.md`,
`funcional/evaluaciones.md`, `funcional/flujo-completo-evaluacion.md` (GAP-13 y GAP-20 resueltos; GAP-32
parcial), `negocio/analisis-modos-de-fallo.md`, `negocio/plan-de-tratamiento.md`, `tecnica/modelo-datos.md`;
TODO 31, 32, 98 y 100 de `_pendientes.md` resueltos.

**Pendiente.**
- Instantáneas de inicio y cierre cuando el plan cambia de estado después de la aprobación (al cerrar su
  última acción).
- Disparadores de reevaluación (próxima revisión vencida, incidentes, cambios en la ficha) y AISIA
  versionable (B08): el resto de GAP-32.
- Cambiar una aceptación a otra opción en la revisión periódica crea la tarea, pero no pide control ni
  severidad residual si pasa a «Mitigar».

---

## Corrección: editor de roles recortado en Usuarios (fuera del plan)

**Fecha:** 2026-10-20 · **Rama:** `fix/usuarios-editor-roles` · **Migración:** no

**Problema.** En **Configuración › Usuarios › Miembros**, el panel **Editar** de los roles (B23a) se abría
dentro de la tarjeta de la tabla, que recorta lo que sobresale (`overflow-hidden`). En las últimas filas
solo se veían los primeros roles y no se llegaba a **Guardar**.

**Cambio.** `usuarios/tabs/miembros.tsx`: el panel se pinta en un portal con posición fija, alineado con el
botón; se abre hacia arriba si no cabe debajo, se recoloca al desplazar o redimensionar y se cierra al
pulsar fuera o con Escape.

**Verificación.** `tsc --noEmit` sin errores y `next lint` sin avisos. No se ha probado en el navegador.

---

## Etiquetas de roles según el glosario (fuera del plan)

**Fecha:** 2026-10-20 · **Rama:** `fix/etiquetas-roles` · **Migración:** no

**Problema.** Había cuatro copias de la tabla de nombres de roles (Usuarios, Perfil, Ajustes › Aprobaciones y
barra superior), con nombres en inglés que no coinciden con el glosario («SGAI Manager», «System Owner») y
mayúsculas distintas («Analista de Riesgos»). Además, el chip de la organización del menú lateral mostraba
«Miembro» para casi todos los roles, porque comparaba con nombres de rol que no existen.

**Decisión del responsable (2026-10-20).** Unificar las etiquetas con las del glosario.

**Cambios.**
- `lib/auth/role-labels.ts` (nuevo): `ROLE_LABELS` y `getRoleLabel`, única fuente: Administrador,
  Responsable del SGAI, CAIO, DPO, Responsable del sistema, Analista de riesgos, Analista de cumplimiento,
  Directivo, Auditor y Lector.
- Usuarios, Perfil, Ajustes › Aprobaciones y la barra superior la usan; el menú lateral muestra el rol
  principal con su nombre.
- Test en `tests/roles.test.ts` (32 en total).
- Documentación: `funcional/usuarios.md`, `funcional/navegacion.md`, `negocio/vision-general.md` y
  `negocio/plataforma.md`; TODO 15, 17 y 19 de `_pendientes.md` resueltos y el 60 en parte.

**Pendiente.** La entrada «Rol» del glosario conserva su TODO sobre estos nombres y la del punto 250 (roles
múltiples): se actualiza cuando lo indique el responsable.

**Verificación.** `tsc --noEmit` sin errores, `next lint` sin avisos, `npm test` 32/32.

---

## B10 · Evidencias: revisión obligatoria y versiones

**Fecha:** 2026-10-20 · **Rama:** `fase1/b10-evidencias` ·
**Migración:** **sí**, `supabase/migrations/20261020110000_evidencias_revision_versiones.sql` (aplicar antes de desplegar)

**Problema** (GAP-26 en parte, F-15; `E4`, `E6`, `I16`, `P5`):
- al crear o editar una evidencia, en la biblioteca y en la ficha, se podía elegir «Válida»: el ciclo de
  revisión se podía saltar;
- cualquier rol con permiso de edición aprobaba, también sus propias evidencias, y la aprobación en bloque no
  guardaba quién revisaba;
- el historial de versiones estaba siempre vacío: la tabla no admite inserciones por RLS y la aplicación
  guardaba el usuario donde la clave foránea pide el perfil; los dos fallos se perdían en silencio;
- cambiar el fichero de una evidencia válida la dejaba válida;
- 20 MB en la vista y 100 MB en el servidor;
- revisar, eliminar o editar sin permiso no hacía nada y la vista no avisaba; si el fichero del alta de
  organización no subía, tampoco.

**Decisión aplicada.** DP-01: las evidencias las aprueba el Responsable del SGAI, distinto de quien las
aporta. El «revisor designado» queda pendiente.

**Cambios en la base de datos** (migración):
- `trg_evidence_review_rules` (BEFORE INSERT/UPDATE): con usuario autenticado, alta en borrador o pendiente de
  revisión; el estado solo cambia por el ciclo (más la vuelta a borrador al cambiar el contenido); aprobar o
  rechazar exige `sgai_manager` y no ser el responsable de la evidencia, y rellena revisor y fecha. Sin usuario
  (caducidad diaria, expediente generado) no aplica.
- `trg_evidence_versions` (AFTER INSERT/UPDATE): registra cada versión (estado anterior al cambio, tipo de
  cambio, perfil de quien lo hace). `system_evidence_versions` gana `storage_path` y el tipo `expired`.
- Las evidencias «Válidas» sin revisor reciben la etiqueta `sin-revision` (salvo las generadas del
  expediente). No cambian de estado.

**Cambios en la aplicación:**

| Área | Cambio |
|---|---|
| `lib/evidences/review-rules.ts` (nuevo, puro) | Transiciones, `statusAfterEdit`, `evidenceReviewBlocker`, límite de 20 MB y rol revisor |
| Server actions de evidencias | El alta siempre en borrador; la edición no recibe estado y devuelve a borrador si cambia el contenido; revisar comprueba rol y autor con mensajes claros; ya no escriben versiones; detectan cuándo RLS no aplicó el cambio («No tienes permisos…») |
| Subida de ficheros | Límite único de 20 MB (al elegir el fichero y en el servidor); un fichero nuevo en una evidencia ya enviada o validada la devuelve a borrador |
| Biblioteca, detalle y ficha | Sin selector de **Estado** (texto que explica el ciclo); **Aprobar** y **Rechazar** solo para el Responsable del SGAI que no la aportó, y a los demás un aviso; errores de revisión, eliminación y subida visibles |
| Historial de versiones | Muestra el cambio de fichero (por su nombre) y la caducidad |
| Tests | `tests/evidencias-revision.test.ts` (37 en total) |

**Verificación.**
- Migración probada en el Postgres local: rechaza crear una evidencia válida y caducarla a mano; un analista
  no aprueba; el Responsable del SGAI aprueba y queda como revisor; las versiones se registran (creada,
  enviada, aprobada, editada) con autor; cambiar solo etiquetas no crea versión; marca `sin-revision`; es
  idempotente.
- `tsc --noEmit` sin errores, `next lint` sin avisos, `npm test` 37/37, `check-server-actions.sh` correcto.

**Documentación.** `funcional/evidencias.md`, `funcional/evidencia-detalle.md`, `funcional/ficha-sistema.md`,
`negocio/biblioteca-evidencias.md`, `funcional/flujo-completo-evaluacion.md` (GAP-26 en parte),
`tecnica/modelo-datos.md`; TODO 86, 123, 124, 126 y 140 resueltos y el 122 en parte.

**Pendiente.**
- Revisor designado (DP-01) y validación por Flujos de aprobación (B11).
- El fichero se sube al elegirlo aunque se cancele la edición, y quitarlo no lo borra del almacenamiento.
- Aviso de caducidad a los responsables (GAP-27) y biblioteca única con las evidencias del plan (GAP-19).

---

## B09 · Expediente documental: ciclo y rastro

**Fecha:** 2026-10-20 · **Rama:** `fase1/b09-expediente` ·
**Migración:** **sí**, `supabase/migrations/20261020120000_expediente_ciclo.sql` (aplicar antes de desplegar, después de la de B10)

**Problema** (GAP-24 en parte, F-15; `E15`, `E16`):
- cualquier miembro aprobaba el expediente, también desde borrador y también quien lo había redactado;
- no se podía volver a borrador desde «En revisión», y en revisión se seguía editando;
- reabrir un aprobado lo devolvía a borrador y lo sobrescribía: «Sustituido» no se asignaba nunca y la
  versión aprobada se perdía;
- los cambios de estado no dejaban historial;
- cada PDF creaba una evidencia «Válida» aunque el expediente estuviera en borrador;
- todos los PDF (FRIA, DPIA, ficha del modelo, actas) decían «Anexo IV» en portada, pie, nombre del fichero,
  instantánea y evidencia, y el estado salía sin traducir.

**Decisión aplicada.** DP-01: quien prepara no aprueba; el Anexo IV lo aprueba el Responsable del SGAI. Los
aprobadores de la DPIA (responsable del tratamiento con dictamen del DPO) y de la FRIA (Comité de IA) no son
roles de la aplicación todavía: hasta B11 aprueba el Responsable del SGAI todas las plantillas, como hizo B01
con el plan.

**Cambios en la base de datos** (migración):
- `documents.version` y `documents.previous_id`.
- `trg_document_lifecycle_rules` (BEFORE INSERT/UPDATE): con usuario autenticado, alta en borrador; contenido
  editable solo en borrador; transiciones borrador ⇄ revisión → aprobado → sustituido; aprobar exige
  `sgai_manager` y no ser autor de ningún apartado, y rellena aprobador y fecha. Las actas (sin usuario) no
  pasan por estas reglas.
- `document_reopen`: en una transacción, el aprobado pasa a sustituido y nace la versión siguiente en borrador
  con su contenido.
- Evidencias «Válidas» de PDF generados con el expediente sin aprobar: etiqueta `sin-revision`.

**Cambios en la aplicación:**

| Área | Cambio |
|---|---|
| `lib/documents/lifecycle-rules.ts` (nuevo, puro) | Transiciones, aprobadores por plantilla (constante hasta B11), `documentApprovalBlocker` y autores del contenido |
| `lib/documents/templates.ts` | Rótulo, referencia legal y nombre de fichero por plantilla (y para las actas); etiquetas de estado |
| Server actions | `changeDocumentStatus` (enviar, devolver, aprobar) con comprobaciones e historial del sistema; `reopenDocument`; `getDocumentApprovalContext`; editar solo en borrador; los entregables se listan de todas las versiones |
| PDF (`render.ts`, `render-html.ts`) | Rótulo, referencia legal, estado en español, versión y fecha de aprobación; fichero `{plantilla}-{fecha}.pdf`; instantánea con el tipo de la plantilla; evidencia pendiente de revisión salvo con el expediente aprobado, con quien genera como responsable |
| Pantalla del expediente | Botones por estado (**Enviar a revisión**, **Volver a borrador**, **Aprobar expediente**, **Reabrir (versión nueva)**); a quien no puede aprobar, el motivo; versión y fecha de aprobación; versión y estado de cada entregable |
| Tests | `tests/expediente-ciclo.test.ts` (41 en total) |

**Verificación.**
- Migración probada en el Postgres local tras las de B23a, B07 y B10: rechaza aprobar desde borrador, editar en
  revisión y que apruebe quien redactó; otro Responsable del SGAI aprueba y queda registrado; `document_reopen`
  deja la versión 1 sustituida y crea la 2 en borrador con el contenido; es idempotente.
- `tsc --noEmit` sin errores, `next lint` sin avisos, `npm test` 41/41, `check-server-actions.sh` correcto.

**Documentación.** `funcional/expediente-documental.md`, `negocio/documentacion-del-sistema.md`,
`funcional/flujo-completo-evaluacion.md` (GAP-24 en parte), `tecnica/modelo-datos.md`; TODO 135 y 143
resueltos.

**Pendiente.**
- Aprobadores por plantilla de DP-01 y aprobación por Flujos de aprobación (B11, B23b).
- El resto de TODO de la vista (orden de pestañas, ficha del modelo en sistemas no GPAI, apartado IV.8).

---

## B08 · AISIA: mínimo (DP-05)

**Fecha:** 2026-10-20 · **Rama:** `fase1/b08-aisia-minimo` · **Migración:** no

**Decisiones del responsable (2026-10-20).** DP-04 (la AISIA pasa al Core) y DP-05 (la AISIA será una
plantilla del expediente) aprobadas. Con DP-05, B08 se reduce a lo imprescindible hasta B15: la versión nueva
y el estado «Sustituida» llegan con las versiones del expediente (B09). Para B23b se aprueba íntegra la
[propuesta](propuesta-b23b-roles-comites.md).

**Problema** (GAP-22 y GAP-23 en parte, `E19`):
- aprobar o rechazar la AISIA solo lo restringía la pantalla (Administrador, Responsable del SGAI o CAIO), y
  quien la había preparado podía aprobarla;
- al aprobarla, los controles A.5.2-A.5.5 de la Declaración de Aplicabilidad pasaban a «Implantado» aunque la
  Declaración estuviera enviada o aprobada;
- los valores de S1 y S2 que el asistente precargaba de la ficha no se guardaban si nadie los editaba.

**Cambios:**

| Área | Cambio |
|---|---|
| `lib/auth/roles-flujo.ts` | `AISIA_APPROVER_ROLES` (Responsable del SGAI hasta B11/B15; DP-01 asigna el Comité de IA) y `aisiaApprovalBlocker` |
| `approveAisia`, `rejectAisia` | Comprueban en el servidor el rol y que quien decide no la creó ni la envió; rechazar exige motivo |
| `lib/aisia/soa-sync.ts` (nuevo) | La sincronización con los controles A.5.2-A.5.5 solo actúa con la Declaración en borrador; si no, se avisa y se aplica al iniciar su siguiente revisión (`transitionSoAStatus('draft')`) |
| `lib/aisia/prefill.ts` (nuevo, puro) | `initAisia` guarda S1 y S2 con los datos de la ficha |
| Ficha › ISO 42001 | **Aprobar** y **Rechazar** solo para quien puede decidir; a los demás, el motivo. Aviso si la Declaración no está en borrador |
| Tests | `tests/aisia.test.ts` (43 en total) |

**Verificación.** `tsc --noEmit` sin errores, `next lint` sin avisos, `npm test` 43/43,
`check-server-actions.sh` correcto. No se ha probado en el navegador.

**Documentación.** `funcional/aisia.md`, `funcional/ficha-sistema.md`, `funcional/flujo-completo-evaluacion.md`
(GAP-22 y GAP-23 en parte), `producto/plan-resolucion-gaps.md` (DP-04, DP-05 y B23b decididas); TODO 137
resuelto y 136 en parte.

**Pendiente (B15).** Plantilla `aisia` del expediente, versiones, acta y aprobación por el Comité de IA con
Flujos de aprobación.

---

## B23b · Funciones de gobierno, responsables por sistema y comités

**Fecha:** 2026-10-20 · **Rama:** `fase1/b23b-gobierno` ·
**Migración:** **sí**, `supabase/migrations/20261020130000_gobierno_designaciones_comites.sql` (aplicar antes de desplegar)

**Decisión del responsable (2026-10-20).** Aprobada íntegra la
[propuesta de B23b](propuesta-b23b-roles-comites.md): funciones como designaciones, la lista de DP-01,
Gobernanza con miembros, supervisión humana obligatoria en alto riesgo, responsable de cada sistema ligado a
un miembro (sin restringir la preparación) y quórum por mayoría con desempate del presidente.

**Problema** (I-02, I-03, I-07, I-09 de DP-01; F-13; DP-02):
- CISO, Legal, Riesgos corporativos, Responsable del tratamiento y función de calidad no existían, y DP-01 los
  usa como revisores y aprobadores;
- Gobernanza guardaba nombres en texto libre que no usaba nada;
- la ficha no decía qué miembro es responsable de cada sistema ni quién supervisa su funcionamiento (AI Act,
  Art. 14 y 26.2), que DP-02 exige para la etapa Evaluado;
- los comités no tenían voz sin voto, quórum, desempate ni comité técnico, y en Flujos de aprobación un asesor
  podía aprobar;
- el Administrador que no tenía ese rol como principal no podía editar la organización.

**Cambios en la base de datos** (migración): `governance_designations` (una persona por función, RLS para
Administrador y Responsable del SGAI); incompatibilidad DPO + Responsable del tratamiento en los dos sentidos;
`ai_systems.owner_profile_id`, `human_oversight_owner_id` y `human_oversight_backup_id` (se casa `ai_owner` con
un miembro cuando el nombre o el correo coinciden con uno solo); tipo `technical_committee`, `committees.quorum`
y `tie_break`; los asesores quedan fuera de `approval_can_decide` y `approval_step_candidates`.

**Cambios en la aplicación:**

| Área | Cambio |
|---|---|
| `lib/governance/functions.ts` (nuevo, puro) | Funciones de gobierno, incompatibilidades, aviso de auditor, miembros con voto, quórum efectivo, aviso del DPO con voto y obligación de supervisión humana |
| `lib/governance/approval-map.ts` (nuevo, puro) | Mapa de aprobaciones de DP-01 con lo que aplica hoy cada objeto |
| Organización › Gobernanza | Responsable del SGAI y DPO desde los roles; funciones de gobierno designables; el auditor externo sigue en texto |
| Organización › Comités | Comité técnico; quórum y desempate; «Asesor (voz sin voto)»; confirmación al añadir al DPO con voto |
| Ficha del sistema | Tarjeta **Responsables**: Responsable del sistema, Responsable de supervisión humana y suplente |
| Evaluación FMEA | En alto riesgo, no se envía sin responsable de supervisión humana |
| Usuarios › Roles y permisos | Mapa de aprobaciones con quién ocupa cada papel y «sin asignar» donde falta |
| Organización | El Administrador se reconoce por cualquiera de sus roles |
| Auditoría | Eventos `org.governance_designation_changed` y `system.responsibles_changed` |
| Tests | `tests/gobierno.test.ts` (49 en total) |

**Verificación.**
- Migración probada en el Postgres local tras las demás: casa `ai_owner` con el miembro; el asesor no es
  candidato ni decide y el miembro con voto sí; rechaza al DPO como Responsable del tratamiento y dar el rol DPO
  a quien ya lo es; crea el comité técnico con quórum y desempate; es idempotente.
- `tsc --noEmit` sin errores, `next lint` sin avisos, `npm test` 49/49, `check-server-actions.sh` correcto. No se
  ha probado en el navegador.

**Documentación.** `funcional/organizacion.md`, `funcional/usuarios.md`, `funcional/ficha-sistema.md`,
`funcional/fmea-evaluacion.md`, `funcional/flujo-completo-evaluacion.md`, `tecnica/modelo-datos.md`,
`producto/propuesta-b23b-roles-comites.md`; TODO nuevo para el glosario.

**Pendiente.**
- B11: políticas por defecto que usen funciones, comités (con su quórum y desempate) y la delegación de la
  dirección en Zona I. Hoy el quórum se guarda y se muestra, pero Flujos de aprobación sigue usando el quórum de
  cada paso.
- Avisos al responsable de cada sistema y uso del responsable de supervisión humana en la etapa Evaluado (B18).
- Glosario: términos nuevos (ver `_pendientes.md`).

---

## Decisiones DP-06 a DP-10

**Fecha:** 2026-10-20 · **Rama:** `docs/decisiones-dp06-dp10` · **Migración:** no

**Decisiones del responsable (2026-10-20)**, todas según la recomendación del plan:

| Decisión | Contenido | Bloque |
|---|---|---|
| DP-06 | Informes del sistema consolidados: se retira el dossier técnico como pantalla; la ficha del registro UE pasa a plantilla del expediente (Anexo VIII); el informe de brechas pasa a ser el análisis de brechas por sistema | B16 |
| DP-07 | Excluir una brecha «Riesgo sin tratar» u «Obligación sin cubrir» requiere aprobación del Responsable del SGAI; el resto, no | B11 |
| DP-08 | Plan parcial sobre los modos críticos, en una segunda iteración de B14 | B14 |
| DP-09 | Alcance ISO/IEC 42001 de organización: las 10 obligaciones ISO del catálogo, con sesiones de comité y acta | B20 |
| DP-10 | Términos «Fuera del ámbito» y «Sistema basado en un modelo GPAI de terceros» aceptados; GPAI como categoría aparte; cambios del catálogo (Art. 50 en 50.1 a 50.4, Art. 27 solo en el 27.1, obligación de la excepción del Art. 6.3); «Fuera del ámbito» en un campo de ámbito aparte. Anexo I Sección B y `c2b_seguros` · `admisibilidad`, a revisión jurídica | B13 |

**Cambio en la aplicación.** Se retira del cuestionario preliminar la opción «admisibilidad» de **Acceso a
seguros de salud y vida** (`lib/preliminary-questionnaire/schema.ts`): no figura en el Anexo III, punto 5.c.
Las respuestas guardadas se conservan.

**Documentación.** `producto/plan-resolucion-gaps.md` (tabla de decisiones),
`producto/cuestionario-preliminar-reglas.md` (TODO convertidos en decisiones); `_pendientes.md`: 241, 242 y
243 resueltos; 237 y 240 decididos y pendientes de llevar al glosario; 238 y 239 a revisión jurídica.

---

## Glosario: decisiones de DP-01, DP-10, B02, B23a y B23b

**Fecha:** 2026-10-20 · **Rama:** `docs/glosario-decisiones` · **Migración:** no

A petición del responsable, `glosario.md` incorpora lo decidido e implementado:
- **Nivel de riesgo AI Act:** GPAI deja de ser un nivel (DP-10); entradas nuevas **Categoría GPAI** y
  **Ámbito del AI Act** (Dentro del ámbito, Fuera del ámbito, No es un sistema de IA), con lo pendiente de B13.
- **Control** y entrada nueva **Control propio** (B02).
- **Nivel de aprobación:** aprobadores de DP-01 y delegación de la dirección en Zona I.
- **Comité** (tipo técnico, quórum, desempate) y entradas nuevas **Comité técnico / validación de modelos**,
  **Asesor (voz sin voto)** y **Quórum** (B23b).
- **Miembro** y **Rol** con roles múltiples, varios Administradores e incompatibilidad DPO + Responsable del
  SGAI (B23a); entrada nueva **Función de gobierno** (B23b).
- Entrada nueva **Responsable de supervisión humana** (B23b).

`_pendientes.md`: 8, 237, 240, 249, 250 y 251 resueltos; 247 queda abierto solo por `_inventario.md`.

---

## B11a · Flujos de aprobación: efectos y apertura por tipo de objeto

**Fecha:** 2026-10-20 · **Rama:** `fase2/b11a-aprobaciones-objetos` ·
**Migración:** **sí**, `supabase/migrations/20261020140000_aprobaciones_objetos.sql` (solo la vista de la bandeja)

Primera parte de B11 (el plan lo parte en B11a efectos y apertura, B11b políticas por defecto, B11c
cancelación, caducidad y avisos, B11d pasos de consulta y condicionales).

**Problema** (F-01; GAP-22, GAP-24, GAP-26 en parte): Flujos de aprobación se diseñó como motor común, pero
solo lo usaba el plan de tratamiento. La AISIA, el expediente, la Declaración de Aplicabilidad y las
evidencias tenían cada uno su aprobación propia aunque se configurara una política para su tipo, y la
bandeja no enlazaba con el objeto que se estaba decidiendo.

**Cambios:**

| Área | Cambio |
|---|---|
| `lib/approvals/open.ts` (nuevo) | `openApprovalRequest` (abre la solicitud y avisa al primer paso), `liveApprovalRequest`, `cancelLiveApprovalRequest` y `hasApprovalPolicy` |
| `lib/approvals/effects.ts` | Efectos de la AISIA, el expediente, la Declaración y la evidencia al aprobarse o rechazarse, con historial; recibe también el perfil de quien decide |
| `lib/approvals/minutes.ts` | El acta de los objetos con sistema va a su expediente |
| AISIA | Enviar abre la solicitud; con ella viva, **Aprobar** y **Rechazar** remiten a Aprobaciones y la ficha lo indica |
| Expediente | Enviar a revisión abre la solicitud (con política, sin huecos obligatorios; el contexto lleva la plantilla); **Volver a borrador** la cancela; aprobar desde la pantalla remite a Aprobaciones |
| Declaración de Aplicabilidad | Enviar abre la solicitud (con política, controles justificados); **Iniciar nueva revisión** la cancela; **En Aprobaciones** en lugar de **Aprobar SoA** |
| Evidencias | Enviar a revisión (también en bloque) abre la solicitud; aprobar o rechazar desde la biblioteca o el detalle remite a Aprobaciones; cambiar el contenido o el fichero de una pendiente cancela la solicitud |
| Bandeja | Enlace **Ver {objeto} →** para revisar el objeto antes de decidir |

Sin política para su tipo, cada objeto conserva su aprobación propia: B11a no cambia nada en una
organización que no haya configurado políticas. B11b sembrará las políticas por defecto de DP-01.

**Verificación.** La vista se probó en el Postgres local tras todas las migraciones (columnas y orden; es
idempotente). `tsc --noEmit` sin errores, `next lint` sin avisos, `npm test` 49/49, `check-server-actions.sh`
correcto. No se ha probado en el navegador.

**Documentación.** `funcional/aprobaciones.md` (qué abre solicitudes y efectos), `funcional/aisia.md`,
`funcional/expediente-documental.md`, `funcional/declaracion-aplicabilidad.md`, `funcional/evidencias.md`.

**Pendiente.** B11b (políticas por defecto con el mapa de DP-01, funciones y comités, eliminar la vía propia
del plan); B11c (cancelación que devuelve a borrador y avisa, caducidad, avisos solo a nuevos decisores); B11d
(pasos de consulta y condicionales; exclusión de brechas, DP-07). En la ficha del sistema, las evidencias en el
circuito muestran el aviso al intentar decidir, no antes.

---

## B11b · Flujos de aprobación: políticas por defecto de DP-01

**Fecha:** 2026-10-20 · **Rama:** `fase2/b11b-politicas-defecto` ·
**Migraciones:** **sí**, `20261020150000_aprobaciones_tipos_aprobador.sql` y después
`20261020150100_aprobaciones_politicas_defecto.sql` (aplicar en dos ejecuciones separadas, antes de desplegar)

**Problema** (F-01; GAP-14, GAP-22, GAP-24, GAP-26 y GAP-28 en parte): sin políticas configuradas a mano, cada
objeto se aprobaba por su vía propia; una política no podía decir «el Comité de Riesgos» o «el Responsable del
tratamiento» sin conocer el comité o la persona concretos; y solo cabía una política activa por tipo, así que el
plan no podía tener aprobadores distintos por nivel ni el expediente por plantilla.

**Cambios en la base de datos:**
- Tipos de aprobador **por tipo de comité** y **por función de gobierno**, con **rol de respaldo**. Al abrir la
  solicitud se resuelven al comité activo (quórum fijado en el paso, el del comité o la mayoría de los miembros con
  voto, sin superar los que pueden votar) o a la persona designada; si no hay, decide el rol de respaldo. Queda
  congelado en la solicitud (`resolved_from`, `fallback`), así que `approval_can_decide` y
  `approval_step_candidates` no cambian.
- Varias políticas activas por tipo con condiciones distintas; `approval_policy_for` elige la más específica.
- `approval_policies.is_default` y `seed_default_approval_policies`: las diez políticas de DP-01 (plan por nivel,
  AISIA, expediente por plantilla, Declaración y evidencias). Se siembran al crear la organización (trigger) y aquí
  para las existentes, solo en los tipos sin política propia.
- Los objetos que esperaban aprobación por la vía antigua abren su solicitud con la política por defecto.

**Cambios en la aplicación:**

| Área | Cambio |
|---|---|
| Ajustes › Aprobaciones | Comité por tipo, función de gobierno y rol de respaldo; condición por plantilla en documentos; etiqueta **Por defecto**; varias políticas por tipo; no se puede desactivar ni borrar la única activa de un tipo |
| Aprobaciones | Aviso en ámbar cuando decide el rol de respaldo |
| Plan de tratamiento | Con solicitud viva, el panel remite a Aprobaciones en lugar de mostrar el aprobador asignado |
| Usuarios › Roles y permisos | La columna «Hoy» del mapa refleja las políticas por defecto |

**Verificación.** Migraciones probadas en el Postgres local tras todas las anteriores: siembra las diez políticas
en cada organización (también en una nueva, por el trigger); el nivel 1 del plan elige su política; un comité de
riesgos con dos miembros con voto y un asesor se resuelve con quórum 2; sin comité ni Responsable del tratamiento
designado decide el Responsable del SGAI con la marca de respaldo; un plan en revisión por la vía antigua abrió su
solicitud con quien lo preparó como solicitante; repetir la migración no duplica nada. `tsc --noEmit` sin errores,
`next lint` sin avisos, `npm test` 49/49, `check-server-actions.sh` correcto. No se ha probado en el navegador.

**Documentación.** `funcional/ajustes.md`, `funcional/aprobaciones.md`; TODO 252 para el glosario («Flujos de
aprobación» y «Nivel de aprobación»).

**Pendiente.** B11c (cancelación que devuelve el objeto a borrador y avisa, caducidad, avisos solo a los nuevos
decisores, acta en todo cierre); B11d (pasos de consulta como el dictamen del DPO o la revisión del CISO, pasos
condicionales, exclusión de brechas de DP-07, la clasificación y la política de IA como objetos aprobables). La vía
propia del plan (aprobador asignado) solo queda para los planes sin política aplicable; se retirará cuando B11d
cubra todos los casos.

**Glosario (2026-10-20, a petición del responsable).** «Flujos de aprobación» recoge los aprobadores por tipo de
comité y por función, el rol de respaldo, las políticas por defecto y las condiciones; «Nivel de aprobación» ya
no lleva la marca de pendiente. TODO 252 resuelto.

---

## B11c · Flujos de aprobación: cancelación, caducidad y avisos

**Fecha:** 2026-10-20 · **Rama:** `fase2/b11c-cancelacion-caducidad` ·
**Migración:** **sí**, `supabase/migrations/20261020160000_aprobaciones_caducidad.sql` (aplicar antes de desplegar)
· **Crontab:** nueva línea `approval-expiry` en `infra/schedules/crontab` (instalar en el VPS)

**Problema** (GAP-17; `O7`, `O8`, `S12`, `A15`):
- quien pedía una aprobación no veía **Cancelar solicitud**, y cancelar no devolvía el objeto a borrador ni avisaba;
- las solicitudes no caducaban: sin quórum, el objeto se quedaba «en aprobación» para siempre;
- cada voto que dejaba el paso pendiente volvía a avisar a todos los decisores, y los errores del motor salían en
  texto técnico;
- el correo de aprobaciones no se enviaba nunca (el correo exigía una tarea vinculada) y el enlace de los canales
  era relativo;
- el acta solo se generaba con comité;
- las políticas solo las veía el Administrador, y los demás miembros no tenían dónde delegar.

**Cambios:**

| Área | Cambio |
|---|---|
| Migración | Caducidad por política (`expires_after_days`), fecha de caducidad congelada en cada solicitud, índice y vista |
| `lib/approvals/effects.ts` | `applyApprovalCancellation`: el plan, la AISIA, el expediente, la Declaración y la evidencia vuelven a borrador, con historial |
| `lib/approvals/notify.ts` | Aviso de cancelación a quien tenía que decidir; aviso al solicitante salvo que lo cerrara él («caducada» cuando procede); enlaces absolutos en los canales |
| Correo | `sendGenericEmail` y tipos de aviso de aprobaciones con correo, según las preferencias (renombradas: «Aprobación pendiente de mi decisión», «Decisión sobre mis solicitudes») |
| Bandeja | Pestañas **Mis solicitudes** (con **Cancelar solicitud**) y **Delegaciones** (para cualquier miembro); «Caduca el …»; solo se avisa al avanzar de paso; mensajes del motor legibles |
| Acta | En todo cierre con decisión (aprobada o rechazada) |
| Ajustes | La pestaña **Aprobaciones** la ven también el Responsable del SGAI y el CAIO; caducidad en el editor; las delegaciones pasan a Aprobaciones |
| Tarea programada | `/api/cron/approval-expiry` cada hora: cancela las caducadas con los mismos efectos que una cancelación |

**Verificación.** Migración probada en el Postgres local (la caducidad de una política se congela en la solicitud;
es idempotente). `tsc --noEmit` sin errores, `next lint` sin avisos, `npm test` 49/49, `check-server-actions.sh`
correcto. No se ha probado en el navegador ni el envío real de correo (requiere `RESEND_API_KEY`).

**Documentación.** `funcional/aprobaciones.md`, `funcional/ajustes.md`, `funcional/perfil.md`,
`funcional/flujo-completo-evaluacion.md` (GAP-17 resuelto), `tecnica/tareas-programadas.md`; TODO 72 y 153 en parte.

**Pendiente.** B11d: pasos de consulta (dictamen del DPO, revisión del CISO), pasos condicionales, exclusión de
brechas (DP-07), la clasificación y la política de IA como objetos aprobables; retirar la vía propia del plan.

---

## B11d · Flujos de aprobación: consultas, pasos condicionales, Auditor y exclusión de brechas

**Fecha:** 2026-10-20 · **Rama:** `fase2/b11d-consultas-condiciones` ·
**Migración:** **sí**, `20261020170000_aprobaciones_tipo_exclusion_brecha.sql` y después, en una ejecución
aparte, `20261020170100_aprobaciones_consultas_condiciones.sql` (aplicar antes de desplegar)

**Problema** (DP-01 I-04, I-05, I-08; DP-07; GAP-10):
- las políticas solo tenían pasos de aprobación: el dictamen del DPO en la AISIA, la FRIA y la DPIA, o la
  revisión del CISO, no tenían dónde constar;
- todos los pasos entraban siempre: no había forma de pedir al CISO solo los planes con controles de seguridad;
- el Auditor podía aprobar si tenía además el rol del paso o una delegación;
- excluir un riesgo sin tratar o una obligación sin cubrir sacaba la brecha de la cola sin que nadie lo aprobara.

**Cambios:**

| Área | Cambio |
|---|---|
| Motor (migración) | `approval_policy_steps.kind` (`approval`, `consultation`) y `condition`; `approval_requests.context`. `approval_resolve_snapshot(org, snap, context)` descarta los pasos cuya condición no se cumple y omite las consultas sin nadie a quien consultar (ni el solicitante ni el Auditor cuentan), y deja constancia en `omitted_steps`. `approval_decide`: en una consulta exige texto, no admite abstención y avanza con cualquier dictamen |
| Auditor | `approval_can_decide` y `approval_step_candidates` excluyen el rol `auditor`, también por delegación |
| Exclusión de brechas | Tipo de objeto `gap_disposition`; `gap_dispositions.status` (`active`, `pending`); trigger `trg_gap_disposition_rules` que impide activar desde la API una exclusión que gobierna una política. Excluir abre la solicitud si hay política (por defecto, Riesgo sin tratar y Obligación sin cubrir, aprueba el Responsable del SGAI); aprobada pasa a activa; rechazada, cancelada o caducada se borra. Retirarla cancela la solicitud (quien la pidió o Administrador, Responsable del SGAI, CAIO) |
| Políticas por defecto | Consulta al DPO delante en la AISIA, la FRIA y la DPIA; consulta al CISO (función de gobierno) con la condición «el plan tiene controles de seguridad» en los niveles 1 y 2; política de exclusión de brechas. En las organizaciones existentes, la consulta solo se añade a las políticas por defecto sin editar |
| Plan de tratamiento | El envío añade al contexto `has_security_controls` (`planHasSecurityControls`, con test): alguna acción «Mitigar» sobre un modo de fallo de la dimensión Seguridad |
| Bandeja | En un paso de consulta, **Emitir dictamen** con texto obligatorio y **Favorable** / **Desfavorable**; «(consulta)» en el paso; el histórico dice «emitió un dictamen favorable / desfavorable» |
| Acta | Los pasos dicen si son consulta, con etiquetas legibles de rol, función y tipo de comité; constan los pasos omitidos y por qué; los dictámenes se nombran como tales |
| Ajustes | Tipo de paso (**Aprobación** o **Consulta (dictamen)**), casilla **Solo si el plan tiene controles de seguridad**, **Se aplica a las brechas**; la política necesita al menos un paso de aprobación sin condición |
| Brechas | La brecha con exclusión pendiente sigue en la cola con **Exclusión pendiente de aprobación**; aviso en los modales de exclusión; sección **Pendientes de aprobación** en Brechas excluidas, con **Retirar exclusión** y **Ver en Aprobaciones** |

**Verificación.** Migraciones probadas en el Postgres local, dos veces (idempotentes): una organización nueva
recibe las 11 políticas con sus consultas; un plan de nivel 1 sin controles de seguridad omite al CISO por la
condición y, con controles pero sin CISO designado, lo omite por no haber a quién consultar; con CISO
designado, su dictamen desfavorable avanza al paso 2 y el Responsable del SGAI aprueba; sin texto o con
abstención, el dictamen se rechaza; una AISIA sin DPO, o pedida por el único DPO, omite la consulta; el Auditor
no puede decidir ni es candidato; una exclusión de capa `control` no abre solicitud; el trigger impide activar
una exclusión pendiente o crearla activa desde la API. `tsc --noEmit` sin errores, `next lint` sin avisos,
`npm test` 50/50, `check-server-actions.sh` correcto. No se ha probado en el navegador.

**Documentación.** `funcional/aprobaciones.md`, `funcional/ajustes.md`, `funcional/brechas.md`,
`funcional/brechas-excluidas.md`, `negocio/flujos-de-aprobacion.md` (puesto al día con todo B11),
`negocio/brechas.md`, `tecnica/modelo-datos.md`; TODO 253 (glosario).

**Pendiente.** La clasificación AI Act y la política de IA como objetos aprobables pasan a B13 y B20, que crean
esos objetos. Retirar la vía propia del plan (aprobador asignado) cuando no quede ningún plan sin política
aplicable (posible B11e).

