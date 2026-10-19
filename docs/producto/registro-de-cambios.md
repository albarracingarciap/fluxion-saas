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
| B00b · Tests de la lógica central | Pendiente (antes de la fase 1) | — | — | — |
| B04 · Declaración de Aplicabilidad: rol y propietario | Integrado en `main` | `fase0/b04-declaracion-rol` | 2026-10-19 | No |
| B02 · Controles sugeridos y control libre | Integrado en `main` | `fase0/b02-controles` | 2026-10-19 | **Sí** · `20261019090000_plan_control_libre.sql` |
| B01 · Permisos del plan y del FMEA (DP-01) | Integrado en `main` | `fase0/b01-permisos-plan` | 2026-10-19 | No |
| B06 · Aviso al aprobador y bandeja visible | Integrado en `main` | `fase0/b06-aviso-aprobaciones` | 2026-10-19 | No |
| B03 · Cierre de acciones sin depender de tareas | Pendiente | — | — | — |
| B05 · Correcciones del FMEA y del plan | Pendiente | — | — | — |

## Migraciones pendientes de aplicar

| Fichero | Bloque | Qué hace | Orden respecto al despliegue |
|---|---|---|---|
| `supabase/migrations/20261019090000_plan_control_libre.sql` | B02 | `controls.template_id` opcional; columnas `title` y `description`; restricción plantilla o título | **Antes** de desplegar B02: el plan de tratamiento y las brechas leen `controls.title` |

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
