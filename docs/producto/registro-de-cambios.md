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
| B02 · Controles sugeridos y control libre | Pendiente | — | — | — |
| B01 · Permisos del plan y del FMEA (DP-01) | Pendiente | — | — | — |
| B06 · Aviso al aprobador y bandeja visible | Pendiente | — | — | — |
| B03 · Cierre de acciones sin depender de tareas | Pendiente | — | — | — |
| B05 · Correcciones del FMEA y del plan | Pendiente | — | — | — |

## Migraciones pendientes de aplicar

Ninguna.

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
