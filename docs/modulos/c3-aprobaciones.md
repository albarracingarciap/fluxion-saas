# C3 · Motor de aprobaciones

Especificación a nivel de migraciones y contratos. Módulo `approvals` del
registro de entitlements.

**Estado**: plan. Sin código.

---

## 0 · Qué problema resuelve

Fluxion ya tiene aprobaciones. El problema es que tiene **seis**, cada una a su
manera:

| Objeto | Cómo se aprueba hoy |
|---|---|
| Plan de tratamiento | `approval_level` (1/2/3) y un único `approver_id` |
| Evaluación AISIA | `status`: draft → submitted → approved/rejected |
| Documento (Anexo IV, FRIA, DPIA) | `status`: draft → in_review → approved |
| Declaración de Aplicabilidad | `lifecycle_status` |
| Evidencia | `change_type` en el histórico de versiones |
| Segunda revisión FMEA | `event_type` en `fmea_item_history` |

Seis vocabularios para la misma pregunta: **¿quién tiene autoridad para decir
que sí, y qué pasó para que lo dijera?**

Ninguna de las seis responde bien a la segunda mitad. En el plan de tratamiento,
un nivel 3 —el que acepta riesgo residual alto— se cierra con
`approval_minutes_ref`, que es **un campo de texto donde alguien teclea la
referencia de un acta**. No hay acta, no hay quorum, no hay votos, y nada impide
que quien redactó el plan escriba ahí «Acta 2026-04» y lo apruebe él solo.

Ese es el agujero. No falta una funcionalidad: la evidencia de aprobación no
prueba lo que dice probar.

## 1 · Anclaje legal

⚠️ **Pendiente de verificar contra el texto oficial** antes de escribir código,
como se hizo en C2 con el AI Act Service Desk. Lo que sigue es de dónde creo que
cuelga, no una cita comprobada.

**Art. 9.5** — las medidas de gestión del riesgo deben ser tales que el riesgo
residual se juzgue aceptable. Juzgar es un acto de alguien: hace falta saber de
quién y con qué autoridad.

**Art. 17** — el sistema de gestión de la calidad incluye un marco de rendición
de cuentas que fija las responsabilidades de la dirección. Una aprobación es
justamente el punto donde esa responsabilidad se ejerce.

**Art. 26.2** — la supervisión se encomienda a personas con la competencia, la
formación y la autoridad necesarias. «Autoridad» es lo que un motor de
aprobaciones modela.

**ISO 42001 · 5.3 y A.3.2** — roles, responsabilidades y autoridades definidas.

## 2 · Decisiones tomadas antes de escribir código

### 2.1 · No sustituye las seis máquinas de estado

Tentador y equivocado. Esas seis funcionan, están probadas, y cada dominio tiene
su vocabulario por buenos motivos: un documento «superseded» no es lo mismo que
un plan «closed».

El motor responde solo a **quién debe aprobar, en qué orden y con qué quorum**,
y devuelve un veredicto. Cada dominio conserva su columna de estado y decide qué
hacer con él. Es un servicio, no un reemplazo.

La ventaja práctica: se engancha un dominio cada vez, sin migrar nada, y si el
primero sale mal no se ha roto ninguno de los otros cinco.

### 2.2 · Quien redacta no aprueba

Por defecto, el autor de un objeto no puede aprobarlo. Es segregación de
funciones básica, y es exactamente lo que hoy no impide nada.

Configurable, porque en una organización de tres personas puede no haber
alternativa — pero **desactivarlo deja constancia en la política**, de modo que
un auditor vea una decisión consciente y no un descuido.

### 2.3 · La regla se congela al solicitar

Al pedir una aprobación, la política vigente se copia dentro de la solicitud. Si
alguien la cambia mañana, las solicitudes vivas siguen con la regla que se les
aplicó.

Sin esto el histórico miente: verías «aprobado por una persona» bajo una
política que hoy exige tres, sin forma de saber cuál regía entonces. Es el mismo
razonamiento que congela el coste en `telemetry.llm_spans`.

### 2.4 · Los comités aprueban de verdad

`fluxion.committees` ya existe, con miembros internos y externos y sus roles.
Hoy no participa en ninguna aprobación: solo se teclea una referencia de acta.

Un paso de tipo comité exige **quorum** y registra **votos nominales**. Y el
acta se **genera** a partir de esos votos, reutilizando el motor documental de
C1, en lugar de escribirse a mano en un campo de texto.

### 2.5 · Una aprobación es evidencia

El resultado se puede adjuntar al expediente como evidencia, con su huella. Que
es lo que un auditor pide cuando pregunta por el punto 9 del Anexo IV.

### 2.6 · Delegar no es suplantar

Una delegación tiene origen, destino, ventana de validez y alcance. La decisión
se registra a nombre de quien decide, **con** la anotación de por cuenta de
quién. Nunca como si hubiera decidido el titular.

## 3 · Modelo de datos

Esquema `fluxion`. Todo con RLS por organización.

### 3.1 · `approval_policies`

Qué objetos requieren aprobación y con qué cadena. Una política activa por
`(organization_id, object_type)`.

- `object_type` — `treatment_plan`, `aisia_assessment`, `document`, `soa`,
  `evidence`
- `conditions jsonb` — cuándo aplica. El caso real de hoy es el nivel de riesgo
  del plan: `{"approval_level": ["level_2", "level_3"]}`
- `author_can_approve boolean` — por defecto `false` (§2.2)
- `is_active boolean`

### 3.2 · `approval_policy_steps`

La cadena, ordenada.

- `position smallint`
- `approver_type` — `role` | `profile` | `committee`
- `approver_ref text` — el rol, el id del perfil o el id del comité
- `quorum smallint` — solo para comités; nulo en los demás
- `allow_delegation boolean`

### 3.3 · `approval_requests`

Una solicitud, viva o cerrada.

- `object_type`, `object_id` — a qué se refiere, sin clave ajena: los cinco
  objetos viven en tablas distintas
- `policy_snapshot jsonb` — la política congelada (§2.3)
- `status` — `pending` | `approved` | `rejected` | `cancelled`
- `current_position smallint`
- `requested_by`, `requested_at`, `closed_at`

### 3.4 · `approval_decisions`

Cada voto. Inmutable: se corrige con otra decisión, no editando la anterior.

- `request_id`, `position`
- `actor_profile_id` — quien decide de verdad
- `on_behalf_of` — el titular, si viene por delegación (§2.6)
- `decision` — `approved` | `rejected` | `abstained`
- `reason text` — obligatorio al rechazar
- `decided_at`

### 3.5 · `approval_delegations`

- `from_profile_id`, `to_profile_id`
- `valid_from`, `valid_until` — **obligatoria**: una delegación sin caducidad es
  una transferencia de autoridad disfrazada
- `object_types text[]` — alcance

## 4 · Contratos

Sin API de ingesta: esto es interno, no lo alimenta ningún conector.

**Acciones de servidor**

- `requestApproval(objectType, objectId)` — congela la política y abre la
  solicitud
- `decideApproval(requestId, decision, reason?)` — registra el voto, avanza de
  paso al cumplirse el quorum, cierra si es el último
- `cancelApproval(requestId, reason)`
- `upsertApprovalPolicy(...)`, `setDelegation(...)`

**Lectura**

- `getPendingApprovalsForMe()` — la bandeja
- `getApprovalTrail(objectType, objectId)` — el histórico, para pintarlo en el
  propio objeto

**Avisos** por los canales que ya existen: notificación al aprobador de turno y
recordatorio al vencer. El evento saldrá también por el `outbox` genérico cuando
exista.

## 5 · Fases

1. **Migración base y motor.** Las cinco tablas, RLS y la resolución de
   aprobadores. Sin interfaz: se prueba por SQL.
2. **Políticas en Ajustes.** Alta y edición de la cadena por tipo de objeto.
3. **Bandeja de aprobaciones.** Lo que me toca decidir, con el detalle del
   objeto y su histórico.
4. **Primer dominio: planes de tratamiento.** El del agujero más grande.
   Sustituye `approver_id` y `approval_minutes_ref` sin tocar `approval_level`,
   que sigue decidiendo qué política aplica.
5. **Comités con quorum y acta generada.** Reutiliza C1 para el documento.
6. **Delegaciones, avisos y evidencia.** Cierra el módulo.

Los pasos 1 a 4 ya entregan lo esencial: a partir de ahí, un plan de nivel 3 no
se puede aprobar en solitario.
