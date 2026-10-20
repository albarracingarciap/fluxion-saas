---
id: PRD-PROPUESTA-B23B
titulo: Propuesta B23b · Funciones de gobierno, supervisión humana y comités
tipo: especificacion
modulo: transversal
audiencia: producto, tecnica
version: 0.1
fuente:
  - docs/producto/plan-resolucion-gaps.md
  - supabase/migrations/00000000000001_schema.sql
  - supabase/migrations/20260831090000_approvals_core.sql
  - supabase/migrations/20261020090000_roles_multiples.sql
  - apps/web/lib/auth/roles.ts
  - apps/web/lib/auth/roles-flujo.ts
  - apps/web/app/(app)/organizacion/tabs/gobernanza.tsx
  - apps/web/app/(app)/organizacion/CommitteesTab.tsx
---

# Propuesta B23b · Funciones de gobierno, supervisión humana y comités

Segunda parte del bloque B23 del [plan de resolución de gaps](plan-resolucion-gaps.md). B23a ya dio roles
múltiples por miembro, varios Administradores y la incompatibilidad DPO + Responsable del SGAI. Esta parte
cubre lo que DP-01 necesita y la aplicación todavía no puede expresar: las funciones de gobierno que no son
roles, el responsable de supervisión humana de cada sistema y los comités con voz sin voto, quórum y comité
técnico.

Al final hay **seis decisiones** para el responsable del proyecto (§7). **Aprobadas todas el 2026-10-20**
tal como se proponen.

## 1. Punto de partida

**Roles de la aplicación** (`profiles.roles`, perfiles de permisos) frente a los roles de DP-01:

| Rol de DP-01 | Rol de la aplicación | Situación |
|---|---|---|
| Alta dirección | Directivo (`executive`) | Equivale |
| CAIO / Responsable de IA | CAIO (`caio`) | Equivale |
| Responsable del SGAI | Responsable del SGAI (`sgai_manager`) | Equivale |
| Responsable del sistema | Responsable del sistema (`system_owner`) | Es un rol de organización: no dice **de qué sistema** es responsable |
| Analista de riesgos de IA | Analista de riesgos (`risk_analyst`) | Equivale |
| Cumplimiento / Legal | Analista de cumplimiento (`compliance_analyst`) | Cumplimiento sí; Legal no existe por separado |
| DPO | DPO (`dpo`) | Equivale |
| Auditoría interna | Auditor (`auditor`) | Equivale |
| Seguridad de la información (CISO) | — | No existe |
| Responsable de supervisión humana | — | No existe; además es **por sistema** |
| Riesgos corporativos, Responsable del tratamiento, función de calidad | — | No existen (aparecen en comités y en el mapa de aprobaciones) |

**Otras piezas que ya existen:**
- **Gobernanza** (Organización › Gobernanza) guarda en texto libre el Responsable del SGAI, el DPO y el
  auditor externo. No se usa en nada (F-13).
- **Ficha del sistema:** `ai_owner` y `responsible_team` son texto libre.
- **Comités:** tres tipos (`ai_committee`, `risk_committee`, `director_review`). Miembros internos o
  externos con papel `president`, `secretary`, `member` o `advisor`.
- **Flujos de aprobación:** pasos con aprobador por rol, por persona o por comité, quórum por paso y
  **delegaciones con fecha de fin** (`approval_delegations`), que sirven para la delegación de la dirección
  en Zona I (decidida el 2026-10-20).

## 2. Funciones de gobierno: designaciones, no roles

**Propuesta.** CISO, Legal, Riesgos corporativos, Responsable del tratamiento y función de calidad se
modelan como **funciones designadas en la organización**, no como roles nuevos.

**Por qué.** Un rol es un perfil de permisos: decide qué pantallas y botones tiene alguien. Estas funciones
no necesitan permisos propios; lo que hacen es **intervenir en un circuito concreto** (el CISO valida los
controles de seguridad del plan, el responsable del tratamiento aprueba la DPIA). Si fueran roles, habría
que decidir qué ve y qué edita un «CISO» en cada pantalla, y añadir cinco roles a las 67 políticas RLS sin
que cambie nada de lo que pueden hacer. Como designación:
- la persona sigue teniendo su rol de permisos (por ejemplo, Analista de cumplimiento) y además la función;
- las políticas de Flujos de aprobación (B11) pueden pedir «la función CISO» como paso de aprobación o de
  consulta, igual que hoy piden un rol o un comité;
- Gobernanza deja de ser texto libre: muestra quién ocupa cada función.

**Modelo de datos** (migración):

```text
fluxion.governance_designations
  id, organization_id
  function      governance_function   -- ciso | legal | corporate_risk | data_controller | quality
  profile_id    → profiles.id         -- miembro que la ocupa
  valid_from, valid_until (opcional)
  created_by, created_at
  UNIQUE (organization_id, function) entre las vigentes
```

- Una persona por función (la vigente). Una persona puede ocupar varias funciones.
- RLS: lectura para la organización; escritura para Administrador y Responsable del SGAI.
- Historial de cambios en la auditoría de la organización.

**Incompatibilidades nuevas** (además de DPO + Responsable del SGAI, que ya valida B23a):
- **DPO + Responsable del tratamiento:** el DPO no puede decidir sobre el tratamiento que supervisa
  (RGPD, Art. 38.6). Mismo motivo que la incompatibilidad que ya existe.
- **Auditor + cualquier función que apruebe:** «quien aprueba un riesgo no lo audita» (DP-01, reglas del
  circuito). Se propone como aviso, no como bloqueo, porque en una organización pequeña puede no haber
  alternativa.

## 3. Responsable de supervisión humana, por sistema

AI Act, Art. 14 y Art. 26.2: cada sistema de alto riesgo necesita una persona competente que pueda
intervenir o detenerlo. DP-02 lo exige para la etapa **Evaluado**.

**Propuesta.**
- Campo en la ficha del sistema: **Responsable de supervisión humana**, un miembro activo
  (`ai_systems.human_oversight_owner_id` → `profiles.id`), con un suplente opcional.
- Obligatorio para enviar a aprobación la evaluación de riesgos de un sistema de alto riesgo (aviso, no
  bloqueo, en el resto).
- Su papel en DP-01: «valida que la supervisión es viable antes del despliegue». En B11 puede ser un paso
  de consulta en la política del nivel 1-3 para sistemas de alto riesgo.
- No es un rol: cualquier miembro puede serlo.

## 4. Responsable de cada sistema

DP-01 dice que el Responsable del sistema «prepara la evaluación y el plan; no aprueba lo suyo». Hoy
`system_owner` es un rol de organización y la ficha guarda el responsable en texto libre, así que la
aplicación no sabe **de qué sistema** es responsable cada persona.

**Propuesta.** Campo **Responsable del sistema** en la ficha (`ai_systems.owner_profile_id`), un miembro con
el rol Responsable del sistema. Permite:
- preparar solo los sistemas propios (si se decide restringirlo, decisión 5);
- avisar al responsable de lo que pasa en su sistema (tareas, revisiones, incidentes);
- reforzar la segregación: el responsable de un sistema no aprueba nada de ese sistema.

El texto libre actual se conserva como «equipo responsable».

## 5. Comités

| Cambio | Detalle |
|---|---|
| **Comité técnico / validación de modelos** | Tipo nuevo `technical_committee` (opcional, por demanda). Revisa la calidad técnica antes del Comité de Riesgos |
| **Voz sin voto** | Se reutiliza el papel **Asesor** (`advisor`) que ya existe: no vota ni cuenta para el quórum. El DPO y el auditor externo se añaden como asesores; si se intenta añadir al DPO como miembro con voto en un comité que aprueba, se avisa |
| **Quórum y desempate** | Por comité: quórum (por defecto, mayoría de los miembros con voto) y regla de desempate (por defecto, **voto del presidente**; alternativa: escalar al órgano superior) |
| **Secretaría** | Se mantiene `secretary` (DP-01: el Responsable del SGAI es secretario del Comité de IA) |
| **Candidatos en Flujos de aprobación** | Al resolver quién decide un paso de comité, se excluyen los asesores |

## 6. Pantalla Roles y permisos

Usuarios › Roles y permisos pasa de describir los roles a mostrar el **mapa de aprobaciones de DP-01**:
para cada objeto, quién prepara, quién revisa y quién aprueba, con las personas que ocupan hoy cada rol,
función o comité, y avisos cuando falta alguien (por ejemplo, «No hay Responsable del SGAI: nadie puede
aprobar planes de nivel 1»).

## 7. Decisiones para el responsable

| # | Decisión | Propuesta (aprobada el 2026-10-20) |
|---|---|---|
| 1 | ¿Las funciones (CISO, Legal, Riesgos corporativos, Responsable del tratamiento, calidad) son designaciones y no roles? | Sí, designaciones (§2) |
| 2 | ¿Esa es la lista de funciones, o falta o sobra alguna? | Las cinco de DP-01. Legal se separa de Cumplimiento solo como función, no como rol |
| 3 | ¿Gobernanza pasa a mostrar miembros en lugar de texto libre (Responsable del SGAI y DPO salen de los roles; el resto, de las designaciones)? | Sí. El auditor externo sigue en texto, porque no es miembro |
| 4 | ¿Responsable de supervisión humana por sistema, obligatorio en alto riesgo? | Sí (§3) |
| 5 | ¿Responsable del sistema ligado a un miembro en cada sistema? ¿Restringe quién prepara cada sistema? | Ligarlo, sí. Restringir la preparación a los responsables de ese sistema, no por ahora: solo aviso y segregación |
| 6 | Quórum y desempate por defecto | Mayoría de los miembros con voto; desempata el presidente |

## 8. Alcance, orden y tamaño

- **Base de datos:** `governance_designations` con RLS; `ai_systems.human_oversight_owner_id`,
  `human_oversight_backup_id` y `owner_profile_id`; tipo de comité `technical_committee`; `committees.quorum`
  y `committees.tie_break`; exclusión de asesores en `approval_step_candidates`; incompatibilidades en
  designaciones y comités. Migración que intenta casar los textos libres actuales (Gobernanza y
  `ai_owner`) con miembros por nombre o correo, sin borrar los textos.
- **Aplicación:** Gobernanza con miembros y designaciones; campos nuevos en la ficha; comités con quórum,
  desempate y asesores; pantalla del mapa de aprobaciones; `roles-flujo.ts` con las funciones.
- **Orden:** antes de **B11**, porque las políticas por defecto de B11 usan las funciones, el responsable de
  supervisión humana y los comités. DP-02 (etapa Evaluado) también lo necesita.
- **Tamaño:** M-L.
- **Acepta si:** la configuración mínima de DP-01 (tres personas y un DPO externo) se da de alta con sus
  roles, funciones y comités, la pantalla del mapa no muestra huecos, y las incompatibilidades se rechazan o
  avisan.
