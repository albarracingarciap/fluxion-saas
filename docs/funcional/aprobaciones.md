---
id: FUN-APROBACIONES
titulo: Aprobaciones
tipo: funcional
modulo: flujos-de-aprobacion
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/aprobaciones/page.tsx
  - apps/web/app/(app)/aprobaciones/aprobaciones-client.tsx
  - apps/web/app/(app)/aprobaciones/actions.ts
  - apps/web/lib/approvals/catalog.ts
  - apps/web/lib/approvals/effects.ts
  - apps/web/lib/approvals/minutes.ts
  - apps/web/lib/approvals/notify.ts
  - apps/web/app/(app)/ajustes/tabs/aprobaciones.tsx
  - supabase/migrations/20260831090000_approvals_core.sql
  - supabase/migrations/20260901090000_approvals_view.sql
  - supabase/migrations/20260902090000_approval_minutes.sql
  - supabase/migrations/20260903090000_approval_candidates.sql
  - supabase/migrations/20261020140000_aprobaciones_objetos.sql
  - apps/web/lib/approvals/open.ts
  - supabase/migrations/20261020150000_aprobaciones_tipos_aprobador.sql
  - supabase/migrations/20261020150100_aprobaciones_politicas_defecto.sql
  - supabase/migrations/20261020160000_aprobaciones_caducidad.sql
  - apps/web/app/api/cron/approval-expiry/route.ts
  - supabase/migrations/20261020170000_aprobaciones_tipo_exclusion_brecha.sql
  - supabase/migrations/20261020170100_aprobaciones_consultas_condiciones.sql
  - apps/web/lib/documents/derive-approval.ts
  - apps/web/app/(app)/gaps/actions.ts
  - apps/web/lib/approvals/coverage.ts
  - supabase/migrations/20261021090000_plan_solo_circuito.sql
---

# Aprobaciones

Bandeja de los [flujos de aprobación](../glosario.md#flujos-de-aprobación): las solicitudes que le toca
decidir a cada persona y el histórico de las ya cerradas.

## Propósito

Decidir las solicitudes de aprobación y consultar el rastro de las decisiones. La vista dice: «Cada voto
queda registrado a nombre de quien lo emite: es lo que convierte una aprobación en evidencia.».

## Acceso y permisos

- **Ruta:** `/aprobaciones`
- **Menú:** **Aprobaciones**. Aparece siempre: Flujos de aprobación es Core.
- **Disponibilidad:** Core en todos los planes.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Quien puede decidir el paso actual | **Me toca decidir** | Aprobar, rechazar, abstenerse; en un paso de consulta, **Emitir dictamen** |
| Quien abrió la solicitud, Administrador, Responsable del SGAI | Ídem | Cancelar la solicitud |
| Todos los roles | **Histórico** de la organización (últimas 50) | Consultar |

Una persona puede decidir un paso si:
- no ha abierto ella la solicitud, salvo que la política lo permita;
- no ha votado ya en ese paso;
- no tiene el rol Auditor (B11d: el Auditor nunca decide, tampoco por delegación);
- no es asesor (voz sin voto) del comité;
- y además cumple una de estas condiciones:
  - tiene el rol indicado en el paso;
  - está designada en la política;
  - es miembro del comité;
  - tiene una delegación vigente, si el paso la admite.

**Qué abre solicitudes (B11a, B11d).** Los seis tipos de objeto, cuando la organización tiene una política
activa para su tipo:

| Objeto | Se abre al | Pantalla del objeto mientras está pendiente |
|---|---|---|
| Plan de tratamiento | Enviarlo a aprobación | El panel de aprobación remite a Aprobaciones |
| Evaluación AISIA | Enviarla para aprobación | La ficha muestra «La decisión se toma en Aprobaciones» en lugar de **Aprobar** y **Rechazar** |
| Expediente documental | Enviarlo a revisión (sin apartados obligatorios sin cubrir; la política puede depender de la plantilla, `template_key`) | En lugar de **Aprobar expediente**, el motivo. **Volver a borrador** cancela la solicitud |
| Declaración de Aplicabilidad | Enviarla a revisión (con todos los controles aplicables justificados) | **En Aprobaciones** en lugar de **Aprobar SoA**. **Iniciar nueva revisión** cancela la solicitud |
| Evidencia | Enviarla a revisión (también en bloque) | «Se decide en Aprobaciones». Si se cambia su contenido o su fichero, vuelve a borrador y la solicitud se cancela |
| Exclusión de brecha (B11d) | Excluir una brecha (también en bloque) cuya capa gobierna una política; por defecto, «Riesgo sin tratar» y «Obligación sin cubrir» (DP-07). El contexto lleva `gap_layer` y el título de la brecha | La brecha sigue en la cola con **Exclusión pendiente de aprobación**, y en [Brechas excluidas](brechas-excluidas.md) en **Pendientes de aprobación**. **Retirar exclusión** cancela la solicitud |

**Políticas por defecto (B11b).** Toda organización tiene una política para cada tipo de objeto, con el mapa
de aprobaciones de DP-01 (ver [Ajustes](ajustes.md), pestaña Aprobaciones), y cada tipo conserva siempre al
menos una activa. El plan de tratamiento ya no tiene vía propia (B11e): sin política para su nivel no se
puede enviar, y Ajustes no deja guardar, desactivar ni borrar una política si algún nivel del plan se queda
sin cubrir. Solo un expediente cuya plantilla no encaje con ninguna política se aprueba aún por su vía
propia.

Al aplicar las políticas por defecto, los objetos que ya esperaban aprobación por la vía antigua (planes,
AISIA, expedientes y evidencias en revisión, y la Declaración en revisión) abrieron su solicitud.

**Respaldo.** Si un paso pide un comité que no está constituido o una función de gobierno sin designar,
decide el rol de respaldo de la política, y la tarjeta lo indica en ámbar.

**Pasos de consulta (B11d).** Un paso de tipo consulta pide un dictamen: favorable o desfavorable, siempre con
texto y sin abstención. El dictamen consta en el histórico y en el acta, pero no decide: con cualquier dictamen
la solicitud pasa al paso siguiente, y un dictamen desfavorable no la cierra. Si al abrir la solicitud no hay
nadie a quien consultar (nadie con el rol, la función sin designar o el comité sin constituir), la consulta se
omite: no tiene rol de respaldo. Tampoco cuentan como consultados quien solicita (salvo que la política le deje
aprobar) ni el Auditor.

**Pasos condicionales (B11d).** Un paso puede llevar una condición sobre el contexto de la solicitud; si no se
cumple, el paso no entra. Hoy la aplicación rellena `has_security_controls` al enviar un plan: `true` si alguna
acción «Mitigar» trata un modo de fallo de la dimensión Seguridad. Es la condición de la consulta al CISO en
los planes de nivel 1 y 2.

Los pasos omitidos (por condición o por no haber a quién consultar) constan en el acta como «Paso omitido».

**Mapa por defecto con consultas (B11d):** DPO antes del aprobador en la AISIA, la FRIA y la DPIA; CISO,
si el plan tiene controles de seguridad, en los planes de nivel 1 y 2; exclusión de brechas «Riesgo sin
tratar» y «Obligación sin cubrir», el Responsable del SGAI. A las políticas por defecto ya existentes se les
añadió la consulta solo si seguían sin editar (un único paso).

> **Pendiente de implementar.** La clasificación AI Act y la política de IA como objetos aprobables (B13 y
> B20).

## Campos

**Pestañas:** **Me toca decidir (N)**, **Mis solicitudes (N)** (las pendientes que he abierto yo),
**Delegaciones** y **Histórico**. No hay filtros.

**Delegaciones** (B11c): cualquier miembro delega su autoridad en otra persona, con fecha de inicio y fin
obligatoria y, si quiere, solo para algunos tipos de objeto. El Administrador y el Responsable del SGAI pueden
registrar delegaciones en nombre de otros. Es el mecanismo de la delegación de la dirección en los planes de
Zona I.

**Cada solicitud:**

| Elemento | Descripción | Origen |
|---|---|---|
| Título | Objeto de la solicitud: nombre del sistema (plan), título (AISIA, expediente, evidencia) o «Declaración de Aplicabilidad ISO/IEC 42001» | `v_approval_requests.object_label` |
| **Ver {objeto} →** | Abre la pantalla del objeto para revisarlo antes de decidir | `object_href` |
| Título (exclusión de brecha) | «Exclusión de brecha · {título de la brecha}», guardado en el contexto: se conserva aunque la exclusión se borre al rechazarse | `context.gap_title` |
| Tipo | Plan de tratamiento · Evaluación AISIA · Documento regulatorio · Declaración de Aplicabilidad · Evidencia · Exclusión de brecha | `object_type` |
| Estado (cerradas) | Aprobada · Rechazada · Cancelada | `status` |
| Datos | «{política} · Paso N de M [(consulta)] · {votos} de {quórum} votos (en comités) · Solicitada por {persona} el {fecha}» | `policy_snapshot`, `current_position`, `current_step.kind` |
| Motivo | Por qué le toca decidir: «Te corresponde por tu rol», «Estás designado en la política», «Eres miembro del comité» o «Por delegación» | `approval_can_decide` |
| Motivo de cierre | «Motivo: «…»» | `closed_reason` |
| **Descargar acta** | Si se ha generado un [acta](../glosario.md#acta) | `minutes_render_id` |
| **Histórico de decisiones** | «Paso N · {persona} aprobó / rechazó / se abstuvo [· por cuenta de {titular}] · {fecha}», con el motivo. En los pasos de consulta, «emitió un dictamen favorable / desfavorable» | `approval_decisions`, `policy_snapshot.steps[].kind` |

**Si no hay solicitudes:**
- **Me toca decidir:** «No tienes nada pendiente de decidir.»
- **Histórico:** «Todavía no hay solicitudes cerradas.»

> TODO: confirmar el título de las solicitudes. En los planes de tratamiento muestra el nombre del
> sistema, no el código del plan.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Aprobar** | Decisor | `decideApproval` | Si se alcanza el quórum, el paso se cierra y se avanza al siguiente. En el último paso, la solicitud queda aprobada |
| **Rechazar** | Decisor | Pide el motivo («Qué hay que corregir para que esto pueda aprobarse») y **Confirmar rechazo** | Cierra la solicitud como rechazada |
| **Abstenerse** | Decisor | Registra la abstención | «Consta, pero no acerca la aprobación» |
| **Emitir dictamen** (paso de consulta) | Consultado | Abre **Dictamen** con texto obligatorio y **Desfavorable** / **Favorable** | El dictamen consta y la solicitud pasa al paso siguiente (o se aprueba, si era el último) |
| **Cancelar solicitud** | Solicitante (en **Mis solicitudes**), Administrador y Responsable del SGAI | Pide el motivo y cancela | Cierra la solicitud como cancelada, devuelve el objeto a borrador (con historial) y avisa al solicitante, si no fue él, y a quien tenía que decidir |

**Al cerrarse una solicitud:**

1. **Efecto sobre el objeto** (`lib/approvals/effects.ts`):

   | Objeto | Aprobada | Rechazada |
   |---|---|---|
   | Plan de tratamiento | Aprobado; la evaluación de riesgos queda aprobada (B07) | Vuelve a borrador con la nota «[DEVUELTO] {motivo}» |
   | Evaluación AISIA | Aprobada, con quien decidió y la referencia `APR-…`; actualiza los controles A.5.2-A.5.5 si la Declaración está en borrador | Rechazada, con el motivo |
   | Expediente documental | Aprobado, con quien decidió | Vuelve a borrador |
   | Declaración de Aplicabilidad | Aprobada, con quien decidió | Vuelve a borrador |
   | Evidencia | Válida, con quien decidió | Rechazada, con el motivo |
   | Exclusión de brecha | La exclusión pasa a activa: la brecha sale de la cola | La exclusión se borra: la brecha sigue en la cola |

   Cada efecto deja su evento en el historial del sistema (salvo la Declaración, que tiene su propio
   historial).
2. **Acta:** se genera en todo cierre con decisión (aprobada o rechazada), no solo con comité (B11c), y va
   al expediente del sistema cuando el objeto tiene sistema. Las cancelaciones y caducidades no llevan acta.
3. **Avisos:** el solicitante recibe un [aviso en la app](../glosario.md#aviso-en-la-app) y un correo
   «Aprobación {aprobada | rechazada | cancelada | caducada}», salvo que la cerrara él mismo.
4. **Integración saliente:** se envía `approval.{estado}` a las
   [integraciones salientes](../glosario.md#integración-saliente-webhook).

**Mientras siga pendiente:** se avisa a quienes pueden decidir el paso actual con «Aprobación pendiente:
{objeto}», en la aplicación, por correo y por los canales de aviso (con enlace absoluto). Solo se avisa al
abrir la solicitud y cada vez que avanza de paso, a los decisores del paso nuevo: un voto que deja el paso
pendiente no vuelve a avisar (B11c).

**Caducidad** (B11c). Si la política fija una caducidad, la tarjeta muestra «Caduca el {fecha}». La tarea
`approval-expiry` (cada hora) cancela las vencidas con el motivo «Caducada: nadie decidió en N días», con los
mismos efectos que una cancelación.

Los correos respetan las preferencias de notificación de cada persona (**Aprobación pendiente de mi
decisión** y **Decisión sobre mis solicitudes**).

Cada decisión queda en el registro de auditoría. Las decisiones no se pueden modificar ni borrar.

> TODO: confirmar un comportamiento de la bandeja: los avisos y mensajes que no son errores también se
> pintan en rojo.

**Configuración:** en **Ajustes › Aprobaciones**, para el Administrador, el Responsable del SGAI y el CAIO
(B11c):
- **Políticas:**
  - tipo de objeto y nombre;
  - niveles (planes de tratamiento) o plantillas (expedientes) a los que se aplica;
  - capas de brecha a las que se aplica (exclusiones de brechas, B11d);
  - cadena de pasos, cada uno de aprobación o de consulta, por rol, persona, comité concreto, tipo de comité
    o función de gobierno, con quórum, rol de respaldo (solo aprobación), condición y delegación;
  - si quien solicita puede aprobar;
  - caducidad de las solicitudes;
  - si la política está activa.
- Las **delegaciones** están en la pestaña **Delegaciones** de esta vista.

Ver [Ajustes](ajustes.md).

## Validaciones

| Situación | Mensaje |
|---|---|
| Rechazar sin motivo | **Confirmar rechazo** deshabilitado; en servidor, «Rechazar exige un motivo: quien rehaga el objeto necesita saber qué corregir.» |
| Dictamen sin texto | **Favorable** y **Desfavorable** deshabilitados; en servidor, «Un dictamen necesita su texto: es lo que leerá quien decida después.» |
| Abstenerse en una consulta | «En una consulta no cabe abstenerse: el dictamen es favorable o desfavorable.» |
| Cancelar sin permiso | «Solo quien la solicitó o un administrador puede cancelarla.» |
| Cancelar sin motivo | «Indica por qué se cancela.» |
| Solicitud inexistente | «La solicitud no existe.» |

Una persona solo puede votar una vez por paso. Solo puede haber una solicitud pendiente por objeto y una
política activa por tipo de objeto.

## Estados

```mermaid
stateDiagram-v2
  [*] --> Pendiente: enviar a aprobación
  Pendiente --> Pendiente: voto o abstención (avanza de paso al alcanzar el quórum) o dictamen (avanza siempre)
  Pendiente --> Aprobada: quórum en el último paso
  Pendiente --> Rechazada: un rechazo
  Pendiente --> Cancelada: cancelar
```

## Vistas relacionadas

- [Plan de tratamiento](plan-de-tratamiento.md): envío a aprobación.
- [Ajustes](ajustes.md), pestaña Aprobaciones.
- [Organización](organizacion.md): comités.
- [Análisis de brechas](brechas.md) y [Brechas excluidas](brechas-excluidas.md): exclusiones con aprobación.
- [Expediente documental](expediente-documental.md): actas generadas.
- Negocio: [Flujos de aprobación](../negocio/flujos-de-aprobacion.md).
