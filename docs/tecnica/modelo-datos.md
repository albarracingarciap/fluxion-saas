---
id: TEC-MODELO-DATOS
titulo: Modelo de datos
tipo: tecnica
modulo: transversal
audiencia: tecnica
version: 0.1
fuente:
  - supabase/migrations/00000000000000_extensions.sql
  - supabase/migrations/00000000000001_schema.sql
  - supabase/migrations/00000000000002_public_objects.sql
  - supabase/migrations/00000000000003_auth_storage.sql
  - supabase/migrations/00000000000004_cron_jobs.sql
  - supabase/migrations/00000000000005_seed_compliance.sql
  - supabase/migrations/20260811000306_core_organization_modules.sql
  - supabase/migrations/20260812090000_signals_core.sql
  - supabase/migrations/20260818100000_connectors_connections.sql
  - supabase/migrations/20260818140000_connectors_discovered_assets.sql
  - supabase/migrations/20260818170000_incidents_core.sql
  - supabase/migrations/20260819200000_document_templates.sql
  - supabase/migrations/20260819210000_documents.sql
  - supabase/migrations/20260819230000_document_renders.sql
  - supabase/migrations/20260821090000_telemetry_core.sql
  - supabase/migrations/20260823090000_telemetry_budgets.sql
  - supabase/migrations/20260825090000_hitl_decisions.sql
  - supabase/migrations/20260827090000_shadow_ai.sql
  - supabase/migrations/20260831090000_approvals_core.sql
  - supabase/migrations/20261020170100_aprobaciones_consultas_condiciones.sql
  - supabase/migrations/20260908090000_fmea_estimacion_por_familia.sql
  - supabase/migrations/20260911090000_rol_cadena_de_valor.sql
  - supabase/migrations/20260913090000_registro_riesgos_negocio.sql
  - supabase/migrations/20260914090000_outbox.sql
  - supabase/migrations/20260915090000_cuestionario_preliminar.sql
  - supabase/migrations/20261020100000_fmea_ciclo_evaluacion.sql
  - supabase/migrations/20261020110000_evidencias_revision_versiones.sql
  - supabase/migrations/20261020120000_expediente_ciclo.sql
  - supabase/migrations/20261020130000_gobierno_designaciones_comites.sql
  - recursos/db/README.md
  - supabase/migrations/20261021100000_expediente_solo_circuito.sql
  - supabase/migrations/20261021110000_aprobaciones_resto_solo_circuito.sql
---

# Modelo de datos

Entidades principales de Fluxion, cómo se relacionan y cómo se aíslan los datos de cada
organización. La fuente de verdad es `supabase/migrations/`. Este documento describe el esquema vigente
y omite las tablas legacy o sin uso.

## Componentes

| Esquema | Ámbito | Contenido |
|---|---|---|
| `fluxion` | Por organización (`organization_id`) | Organizaciones y miembros, inventario, clasificación, obligaciones, análisis de modos de fallo, tratamiento, evidencias, Declaración de Aplicabilidad, AISIA, documentos, incidentes, tareas, aprobaciones, avisos, integración |
| `compliance` | Global | [Catálogo de tablas básicas](../glosario.md#catálogo-de-tablas-básicas): dimensiones, modos de fallo, controles, obligaciones, tipos de evidencia, grafo causal |
| `rag` | Global | [Corpus normativo](../glosario.md#corpus-normativo): documentos y fragmentos con embeddings |
| `telemetry` | Por organización | Trazas de llamadas a modelos, agregados, tarifas y presupuestos |
| `public` | — | Solo el envoltorio `public.search_chunks` y el event trigger `ensure_rls` |

> **Pendiente de implementar.** El esquema `compliance` pasará a tener una copia del catálogo por
> organización, que mantendrá su administrador (`_inventario.md` §14.1). Hoy es único y lo comparten
> todas las organizaciones.

Extensiones (`00000000000000_extensions.sql`): `uuid-ossp`, `pgcrypto`, `pgjwt`, `pg_net`,
`pg_graphql`, `pg_stat_statements`, `supabase_vault`, `vector` y `pg_cron`.

## Modelo de datos

**Convenciones**
- La clave primaria es `id uuid`, salvo que se indique otra cosa.
- Las tablas por organización llevan `organization_id` con FK a `fluxion.organizations` y
  `ON DELETE CASCADE`.
- Muchos estados son `text` con `CHECK` en lugar de enums.
- Las referencias a personas apuntan unas veces a `fluxion.profiles` y otras a `auth.users`; se indica
  en cada caso.

En los diagramas se omite `organizations`, salvo en el primero, porque casi todas las tablas cuelgan de
ella.

### Organización y acceso

```mermaid
erDiagram
  auth_users ||--o{ profiles : "user_id"
  organizations ||--o{ profiles : ""
  organizations ||--o{ invitations : ""
  organizations ||--o{ organization_modules : ""
  organizations ||--o{ committees : ""
  committees ||--o{ committee_members : ""
  profiles |o--o{ committee_members : "profile_id"
  profiles ||--o{ profile_systems : ""
  ai_systems ||--o{ profile_systems : ""
  organizations ||--o{ api_keys : ""
  organizations ||--o{ audit_log : ""
```

| Tabla | Término | Campos clave | Migración |
|---|---|---|---|
| `fluxion.organizations` | [Organización](../glosario.md#organización) | `slug` único, `plan`, `normative_modules` | `00000000000001` |
| `fluxion.profiles` | [Miembro](../glosario.md#miembro) | `user_id` → `auth.users`, `roles` (`org_role[]`, todos los roles), `role` (principal, = `roles[1]`), `is_active`. Único por (`user_id`, `organization_id`): un usuario puede pertenecer a varias organizaciones | `00000000000001` |
| `fluxion.invitations` | — | `email`, `role`, `token` único, `status`, `expires_at` | `00000000000001` |
| `fluxion.organization_modules` | [Módulo](../glosario.md#módulo) | PK (`organization_id`, `module_key`), `status` ∈ `enabled`, `disabled`, `trial`, `licensed_until` | `20260811000306` |
| `fluxion.committees`, `committee_members` | [Comité](../glosario.md#comité) | `type` único por organización (también `technical_committee`); `quorum` (NULL = mayoría de los que votan) y `tie_break` (`chair`, `escalate`); un miembro es un perfil o una persona externa; `committee_role = 'advisor'` tiene voz sin voto | `00000000000001`, `20261020130000` |
| `fluxion.governance_designations` | — | Funciones de gobierno de DP-01 (`ciso`, `legal`, `corporate_risk`, `data_controller`, `quality`): una persona (`profile_id`) por función y organización. Escriben Administrador y Responsable del SGAI | `20261020130000` |
| `fluxion.profile_systems` | — | Asignación de miembros a sistemas, con `is_lead` | `00000000000001` |
| `fluxion.api_keys` | [Clave API](../glosario.md#clave-api) | `key_prefix`, `key_hash` (SHA-256, índice único), `scopes text[]`, `revoked_at`, `expires_at` | `00000000000001`, `20260811150000` |
| `fluxion.audit_log` | — | `actor_id` → `profiles`, `action`, `target_type`, `target_id` | `00000000000001` |

### Inventario, clasificación y obligaciones

```mermaid
erDiagram
  ai_systems ||--o{ ai_system_history : ""
  ai_systems ||--o{ classification_events : ""
  ai_systems |o--|| classification_events : "current_classification_event_id"
  classification_events ||--o{ classification_diffs : ""
  ai_systems ||--o{ system_obligations : ""
  classification_events |o--o{ system_obligations : "classification_event_id"
  obligations ||..o{ system_obligations : "obligation_code"
  connector_connections |o--o{ discovered_assets : "connection_id"
  ai_systems |o--o{ discovered_assets : "linked_system_id"
  discovered_assets ||--o{ shadow_ai_findings : ""
  connector_connections ||--o{ connector_sync_runs : ""
```

| Tabla | Término | Campos clave | Migración |
|---|---|---|---|
| `fluxion.ai_systems` | [Sistema de IA](../glosario.md#sistema-de-ia) | `internal_id` único por organización, `aiact_risk_level`, `value_chain_roles`, `owner_profile_id`, `human_oversight_owner_id`, `human_oversight_backup_id` (B23b), `status`, `domain`, más de 100 columnas descriptivas | `00000000000001`, `20260911090000` |
| `fluxion.ai_system_history` | [Historial del sistema](../glosario.md#historial-del-sistema) | `event_type`, `payload`, `actor_user_id` → `auth.users` | `00000000000001` |
| `fluxion.classification_events` | [Clasificación AI Act](../glosario.md#clasificación-ai-act) | `version`, `method`, `risk_level`, `obligations_set`, `status`. Solo un `pending_reconciliation` por sistema | `00000000000001` |
| `fluxion.classification_diffs` | [Reclasificación](../glosario.md#reclasificación) | `diff_type` ∈ `added`, `removed`, `unchanged`; `resolution` | `00000000000001` |
| `compliance.obligations` | [Obligación](../glosario.md#obligación) (catálogo) | `code` único, `framework`, `article`, `scope`, `applies_to_roles` | `00000000000005`, `20260904090000`, `20260911090000` |
| `fluxion.system_obligations` | [Obligación](../glosario.md#obligación) (por sistema) | `obligation_code`, `status`, `priority`, `owner_user_id` → `auth.users` | `00000000000001` |
| `fluxion.discovered_assets` | [Sistema detectado pendiente de alta](../glosario.md#sistema-detectado-pendiente-de-alta) | `source_module`, `external_id` (único por organización y fuente), `status`, `linked_system_id` | `20260818140000` |
| `fluxion.shadow_ai_findings` | [Hallazgo de IA no declarada](../glosario.md#hallazgo-de-ia-no-declarada) | `finding_type`, `category`, `file_path`, `severity`, `resolved_at` | `20260827090000` |
| `fluxion.connector_connections`, `connector_sync_runs` | — | `connector_type` ∈ `mlflow`, `github`, `gitlab`; `secret_id` (Vault); estado de la última sincronización | `20260818100000` |

`system_obligations` no tiene FK al catálogo: se relaciona por `obligation_code` (línea discontinua).

### Riesgo y tratamiento

```mermaid
erDiagram
  risk_dimensions ||--o{ failure_modes : "dimension_id"
  failure_modes ||--o{ failure_mode_control_refs : ""
  control_templates ||--o{ failure_mode_control_refs : ""
  causal_families ||--o{ causal_relationships : "family_id"
  causal_nodes ||--o{ causal_relationships : "source/target_node_id"
  causal_nodes ||--o{ causal_node_failure_mode_links : ""
  failure_modes ||--o{ causal_node_failure_mode_links : ""
  failure_modes ||--o{ system_failure_modes : ""
  ai_systems ||--o{ system_failure_modes : ""
  ai_systems ||--o{ fmea_evaluations : "system_id"
  fmea_evaluations ||--o{ fmea_items : ""
  failure_modes ||--o{ fmea_items : ""
  fmea_evaluations ||--o{ fmea_family_estimates : ""
  fmea_evaluations ||--o| treatment_plans : "evaluation_id"
  treatment_plans ||--o{ treatment_actions : "plan_id"
  fmea_items ||--o| treatment_actions : "fmea_item_id"
  controls |o--o{ treatment_actions : "control_id"
  control_templates ||--o{ controls : "template_id"
  tasks |o--o{ treatment_actions : "task_id"
  treatment_actions ||--o{ treatment_action_events : ""
  treatment_actions ||--o{ treatment_action_reviews : ""
  treatment_plans ||--o{ treatment_plan_snapshots : ""
  ai_systems ||--o{ business_risk_assessments : ""
```

| Tabla | Término | Campos clave | Migración |
|---|---|---|---|
| `compliance.risk_dimensions` | [Dimensión de riesgo](../glosario.md#dimensión-de-riesgo) | PK `text` (`tecnica`, `seguridad`, `etica`, `gobernanza`, `roi`, `legal_b`) | `00000000000005` |
| `compliance.failure_modes` | [Modo de fallo](../glosario.md#modo-de-fallo) | `code` único, `r_value`, `i_value`, `d_value`, `e_value` ([criterios R.I.D.E.](../glosario.md#criterios-ride)), `s_default` ([severidad por defecto](../glosario.md#severidad-por-defecto-s_default)), `origin` | `00000000000005`, `20260905090000` |
| `compliance.causal_families`, `causal_nodes`, `causal_relationships`, `causal_node_failure_mode_links` | [Familia causal](../glosario.md#familia-causal), [relación causal](../glosario.md#relación-causal), [grafo causal](../glosario.md#grafo-causal) | Familias A-H; cada relación une dos nodos dentro de una familia, con `type` ∈ `causes`, `amplifies`, `enables`, `correlates`; los nodos se vinculan a modos de fallo | `00000000000005` |
| `compliance.control_templates`, `failure_mode_control_refs` | [Plantilla de control](../glosario.md#plantilla-de-control) | CTL-001 a CTL-059; vínculo entre modo de fallo y control | `00000000000005` |
| `fluxion.system_failure_modes` | [Activación](../glosario.md#activación-de-modos-de-fallo) y [priorización](../glosario.md#priorización) | Único por (sistema, modo); `activation_source`, `priority_status`, `priority_score` | `00000000000001` |
| `fluxion.fmea_evaluations` | [Análisis de modos de fallo (FMEA)](../glosario.md#análisis-de-modos-de-fallo-fmea) | `state`, `version`, `cached_zone` ([zona de riesgo](../glosario.md#zona-de-riesgo)), `approver_id`, `approved_at`, `next_review_at`. `approved` = vigente; las versiones anteriores pasan a `superseded` al aprobarse una nueva | `00000000000001`, `20261020100000` |
| `fluxion.fmea_items` | — | `o_value` ([O](../glosario.md#ocurrencia-o)), `d_real_value` ([D_real](../glosario.md#detectabilidad-real-d_real)), `s_default_frozen`, `s_actual`, `s_residual`, `second_review_status`. Sin `organization_id`: hereda la organización de la evaluación | `00000000000001` |
| `fluxion.fmea_family_estimates` | [Estimación por familia](../glosario.md#estimación-por-familia) | Único por (`evaluation_id`, `family_label`); justificación de al menos 50 caracteres | `20260908090000` |
| `fluxion.treatment_plans` | [Plan de tratamiento](../glosario.md#plan-de-tratamiento) | Uno por evaluación, también sin acciones; `status`, `zone_at_creation`, `zone_target`, `ai_act_floor`, `approval_level`, `deadline`. `in_progress` y `closed` los mantiene `trg_treatment_action_plan_status` | `00000000000001`, `20261020100000` |
| `fluxion.treatment_actions` | [Acción de tratamiento](../glosario.md#acción-de-tratamiento) | Única por (plan, ítem); `option` ([opción de tratamiento](../glosario.md#opción-de-tratamiento)), `status`. CHECK: aceptar exige 100 caracteres de justificación y no se admite con severidad 9 | `00000000000001` |
| `fluxion.treatment_action_events`, `treatment_action_reviews`, `treatment_plan_snapshots` | [Revisión periódica](../glosario.md#revisión-periódica), [instantánea](../glosario.md#instantánea) | Eventos de solo inserción; revisiones de acciones aceptadas o pospuestas; instantáneas en cada transición | `00000000000001` |
| `fluxion.controls` | [Control](../glosario.md#control) | `template_id` → `control_templates` (nulo en los controles propios, que llevan `title` y `description`), `system_id`, `status` | `00000000000001`, `20261019090000` |
| `fluxion.business_risk_assessments` | [Riesgo de negocio](../glosario.md#riesgo-de-negocio) | `probability` y `impact` (1-5), `exposure` (columna calculada), único por (sistema, modo) | `20260913090000` |

Los triggers de `treatment_actions` crean y sincronizan la tarea asociada y recalculan la zona objetivo
del plan (`recalculate_plan_zone_target`).

### Evidencias, brechas y cumplimiento ISO

```mermaid
erDiagram
  ai_systems |o--o{ system_evidences : "ai_system_id"
  system_evidences ||--o{ system_evidence_versions : ""
  system_evidences ||--o{ system_obligation_evidences : ""
  system_obligations ||--o{ system_obligation_evidences : ""
  system_evidences ||--o{ system_failure_mode_evidences : ""
  system_failure_modes ||--o{ system_failure_mode_evidences : ""
  system_evidences ||--o{ evidence_expiry_alerts : ""
  evidences |o--o{ treatment_actions : "evidence_id"
  evidence_types ||--o{ obligation_evidence_types : ""
  obligations ||--o{ obligation_evidence_types : ""
  organization_soa_controls }o--o| system_evidences : "validation_evidence_id"
  organization_soa_controls ||--o{ organization_soa_system_links : ""
  ai_systems ||--o{ aisia_assessments : ""
  aisia_assessments ||--o{ aisia_sections : ""
```

| Tabla | Término | Campos clave | Migración |
|---|---|---|---|
| `fluxion.system_evidences` | [Evidencia](../glosario.md#evidencia) | `scope` (sistema u organización), `status` ([estado de la evidencia](../glosario.md#estado-de-la-evidencia)), `expires_at`, `storage_backend` ∈ `supabase`, `s3`, `checksum_sha256` | `00000000000001`, `20260819090000` |
| `fluxion.system_evidence_versions` | — | Historial de cambios y revisiones: estado anterior a cada cambio, `change_type` (también `expired`), `storage_path` y `changed_by` (perfil). Solo escribe el trigger `trg_evidence_versions` (sin política de inserción) | `00000000000001`, `20261020110000` |
| `fluxion.evidences` | [Evidencia](../glosario.md#evidencia) (adjuntos de acciones de tratamiento) | `type`, `verification_status`, `storage_backend` | `00000000000001`, `20260819170000` |
| `compliance.evidence_types`, `obligation_evidence_types` | [Tipo de evidencia](../glosario.md#tipo-de-evidencia) | EVT-*; `requirement_level` por obligación | `00000000000005` |
| `fluxion.evidence_expiry_alerts` | — | `alert_type` ∈ `expiry_30d`, `expiry_7d`, `expired` | `00000000000001` |
| `fluxion.gap_dispositions` | [Disposición de la brecha](../glosario.md#disposición-de-la-brecha) | `gap_key` único por organización, `gap_layer` ([tipo de brecha](../glosario.md#tipo-de-brecha)), `disposition`, `rationale`, `status` (`active`, o `pending` mientras espera aprobación) | `00000000000001`, `20261020170100` |
| `fluxion.task_gap_links` | — | Vínculo entre tarea y `gap_key` | `00000000000001` |
| `fluxion.organization_soa_controls`, `organization_soa_metadata`, `organization_soa_system_links`, `soa_lifecycle_log` | [Declaración de Aplicabilidad ISO 42001](../glosario.md#declaración-de-aplicabilidad-iso-42001) | `control_code` único por organización (el catálogo de 38 controles está en `apps/web/lib/templates/iso42001-catalog.ts`), `is_applicable`, `lifecycle_status` | `00000000000001` |
| `fluxion.aisia_assessments`, `aisia_sections` | [AISIA](../glosario.md#evaluación-de-impacto-del-sistema-de-ia-aisia) | `version` única por sistema, `status`; secciones S1-S6 con `data jsonb` | `00000000000001` |
| `fluxion.preliminary_questionnaires` | [Cuestionario preliminar](../glosario.md#cuestionario-preliminar) | `status` ∈ `borrador`, `completado`; `answers jsonb` | `20260915090000` |

Las [brechas](../glosario.md#brecha) no se guardan: se calculan en `apps/web/lib/gaps/data.ts`. Solo
se persisten las disposiciones y los vínculos con tareas.

> **Pendiente de implementar.** Unificar `fluxion.evidences` y `fluxion.system_evidences` en una sola
> Biblioteca de evidencias (`_inventario.md` §10.3).

### Documentos, incidentes, operación y aprobaciones

```mermaid
erDiagram
  document_templates ||..o{ documents : "template_key"
  ai_systems ||--o{ documents : ""
  documents ||--o{ document_renders : ""
  system_evidences |o--o{ document_renders : "evidence_id"
  approval_requests |o--o{ documents : "approval_request_id"
  approval_policies ||--o{ approval_policy_steps : ""
  approval_policies |o--o{ approval_requests : "policy_id"
  approval_requests ||--o{ approval_decisions : ""
  ai_incidents ||--o{ ai_incident_systems : ""
  ai_systems ||--o{ ai_incident_systems : ""
  signals |o--o{ ai_incidents : "source_signal_id"
  ai_systems |o--o{ signals : "system_id"
  tasks |o--o{ signals : "task_id"
  ai_systems |o--o{ tasks : "system_id"
  profiles |o--o{ tasks : "assignee_id"
  ai_systems ||--o{ hitl_decisions : ""
  outbox_events ||--o{ outbox_deliveries : ""
  webhooks ||..o{ outbox_deliveries : "target_id"
```

| Tabla | Término | Campos clave | Migración |
|---|---|---|---|
| `fluxion.document_templates` | [Documentación del sistema](../glosario.md#documentación-del-sistema) | `key` ∈ `annex_iv`, `fria`, `dpia`, `model_card`, `approval_minutes`; `organization_id` nulo significa plantilla de Fluxion | `20260819200000` |
| `fluxion.documents` | — | `template_key`, `template_version`, `status` ∈ `draft`, `in_review`, `approved`, `superseded`, `content jsonb` (con `author_id` por apartado), `version`, `previous_id`. Un solo documento no sustituido por sistema y plantilla | `20260819210000`, `20261020120000` |
| `fluxion.document_renders` | — | PDF generado, inmutable (trigger); `storage_*`, `checksum_sha256`, `content_sha256` | `20260819230000` |
| `fluxion.system_report_snapshots` | [Instantánea](../glosario.md#instantánea) de [informes del sistema](../glosario.md#informes-del-sistema) | `report_type`, `payload jsonb` | `00000000000001` |
| `fluxion.ai_incidents`, `ai_incident_systems`, `incident_deadline_alerts` | [Incidente](../glosario.md#incidente), [incidente grave](../glosario.md#incidente-grave) | `reference` INC-AAAA-NNN y `notification_deadline`, ambos por trigger ([plazo de notificación](../glosario.md#plazo-de-notificación)); `category`, `status`, `is_serious` | `20260818170000` |
| `fluxion.signals` | [Señal de riesgo](../glosario.md#señal-de-riesgo) | `source_module`, `signal_type`, `severity`, `status`, `dedupe_key` (único por organización) | `20260812090000` |
| `fluxion.tasks` (+ `task_*`) | [Tarea](../glosario.md#tarea) | `status`, `priority`, `assignee_id` → `profiles`, `source_type` y `source_id` polimórficos | `00000000000001`, `20260812090000` |
| `fluxion.hitl_decisions`, `hitl_reason_codes` | [Supervisión humana](../glosario.md#supervisión-humana) | `case_ref`, `decision`, `agreement` (por trigger), `reason_code` | `20260825090000` |
| `fluxion.approval_policies`, `approval_policy_steps`, `approval_requests`, `approval_decisions`, `approval_delegations` | [Flujos de aprobación](../glosario.md#flujos-de-aprobación) | `object_type` + `object_id` polimórficos (incluye `gap_disposition`); `policy_snapshot` congelado; pasos con `kind` (`approval` o `consultation`) y `condition`; `approval_requests.context`; decisiones inmutables | `20260831090000`, `20261020170100` |
| `fluxion.notifications` | [Aviso en la app](../glosario.md#aviso-en-la-app) | `recipient_id` → `profiles`, `type`, `read_at` | `00000000000001` |
| `fluxion.notification_channels`, `channel_deliveries` | [Aviso a Slack/Teams](../glosario.md#aviso-a-slackteams) | `channel_type` ∈ `slack`, `teams`; `secret_id` (Vault); entregas con reintentos | `20260818190000` |
| `fluxion.webhooks`, `outbox_events`, `outbox_deliveries` | [Integración saliente (webhook)](../glosario.md#integración-saliente-webhook) | Eventos inmutables; entregas con `status` y `next_attempt_at` | `00000000000001`, `20260914090000` |

### Telemetría y corpus normativo

| Tabla | Término | Campos clave | Migración |
|---|---|---|---|
| `telemetry.llm_spans` | [Coste y uso de IA](../glosario.md#coste-y-uso-de-ia-finops) | Particionada por mes en `started_at`; PK (`organization_id`, `started_at`, `trace_id`, `span_id`); `cost_*` fijado al ingerir, `cost_status` | `20260821090000` |
| `telemetry.rollup_daily`, `rollup_runs` | — | Agregado diario con p50 y p95 de duración y de tiempo hasta el primer token | `20260822090000`, `20260822120000` |
| `telemetry.model_prices` | [Tarifa de modelo](../glosario.md#tarifa-de-modelo) | Vigencia por fechas; `organization_id` nulo significa tarifa de catálogo | `20260821090000`, `20260824090000` |
| `telemetry.cost_budgets`, `cost_budget_alerts` | [Presupuesto de IA](../glosario.md#presupuesto-de-ia) | `scope` (organización o sistema), `alert_at_pct` | `20260823090000` |
| `rag.documents`, `rag.chunks` | [Corpus normativo](../glosario.md#corpus-normativo) | `source_type`, `short_name`; `embedding vector(1024)` (`voyage-law-2`, índice HNSW) | `00000000000001` |

El contenido del corpus no está en las migraciones: se restaura desde un volcado descrito en
`recursos/baseline/rag_corpus.manifest.json`.

## API

Funciones SQL que usa la aplicación como RPC o mediante triggers:

| Función | Uso |
|---|---|
| `fluxion.handle_new_user()` | Trigger sobre `auth.users`. Con invitación pendiente, crea el perfil en esa organización. Sin ella, crea una organización nueva y un perfil `org_admin` |
| `fluxion.grant_trial_modules()` | Trigger al crear una organización: concede 30 días de prueba de cinco módulos (todos los disponibles salvo Flujos de aprobación) |
| `fluxion.auth_user_org_id()` | Devuelve la organización del usuario autenticado. Se usa en políticas RLS |
| `fluxion.calculate_failure_mode_priority(...)` | Puntuación de priorización de un modo de fallo |
| `fluxion.recalculate_plan_zone_target(uuid)` | Zona objetivo de un plan a partir de las severidades residuales |
| `fluxion.fmea_aplicar_aprobacion_plan(plan, aprobador)` | Aprobación de la evaluación de riesgos (B07): aceptaciones aprobadas, evaluación `approved` con `next_review_at`, versiones anteriores y sus planes abiertos `superseded` (acciones abiertas canceladas) y plan `in_progress` o `closed`. Solo `service_role` |
| `fluxion.plan_estado_por_acciones(uuid)` | `in_progress` o `closed` de un plan aprobado según sus acciones. La llaman el trigger `trg_treatment_action_plan_status` y la función anterior |
| `fluxion.trg_evidence_review_rules()` | Trigger BEFORE en `system_evidences` (B10, revisado en B11g): con usuario autenticado, alta en `draft` o `pending_review` y solo las transiciones del ciclo; pasar a `valid` o `rejected` solo sin usuario (efecto de Flujos de aprobación). Las escrituras sin usuario (cron, expediente) no pasan por él |
| `fluxion.trg_evidence_versions()` | Trigger AFTER en `system_evidences`: registra la versión en `system_evidence_versions` |
| `fluxion.trg_aisia_lifecycle_rules()`, `trg_soa_lifecycle_rules()` | B11g: con usuario autenticado, la AISIA no pasa a `approved` ni `rejected` y la Declaración (`organization_soa_metadata.lifecycle_status`) no pasa a `approved`; lo hace el efecto de Flujos de aprobación |
| `fluxion.trg_document_lifecycle_rules()` | Trigger BEFORE en `documents` (B09, revisado en B11f): con usuario autenticado, alta en `draft`, contenido editable solo en `draft`, transiciones `draft` ⇄ `in_review` y `approved` → `superseded`; pasar a `approved` solo sin usuario (el efecto de Flujos de aprobación y las actas) |
| `fluxion.document_reopen(uuid)` | Reabre un expediente aprobado: lo pasa a `superseded` y crea la versión siguiente en borrador (`version`, `previous_id`) con su contenido |
| `fluxion.trg_governance_designation_rules()`, `trg_profiles_dpo_data_controller()` | B23b: la persona designada es de la organización; el DPO no puede ser Responsable del tratamiento, ni al designar ni al dar el rol |
| `fluxion.approval_can_decide`, `approval_step_candidates` (revisadas en `20261020130000` y `20261020170100`) | Los asesores (`committee_role = 'advisor'`) de un comité y quien tiene el rol `auditor` no son candidatos ni pueden decidir |
| `fluxion.approval_is_preparer(request, profile)` | B11f: si el perfil pidió la solicitud o figura en `context.prepared_by`, y la política no deja aprobar a quien solicita. Lo usan `approval_can_decide` (también para el titular de una delegación) y `approval_step_candidates` |
| `fluxion.approval_resolve_snapshot(org, snapshot, context)` | B11d: descarta los pasos cuya `condition` no cumple el contexto, resuelve comités y funciones (versión de dos argumentos) y omite las consultas sin nadie a quien consultar (ni quien solicita, salvo que la política le deje aprobar, ni el Auditor). Lo omitido queda en `policy_snapshot.omitted_steps` con `omitted_reason` (`condition`, `no_consultee`) |
| `fluxion.approval_decide` (revisada en `20261020170100`) | En un paso `consultation` exige texto, no admite abstención y avanza con cualquier dictamen; un dictamen desfavorable no cierra la solicitud |
| `fluxion.add_default_consultations(uuid)` | Añade a una política por defecto sin editar (un paso) la consulta de DP-01: DPO en AISIA, FRIA y DPIA; función `ciso` con `has_security_controls` en los planes de nivel 1 y 2 |
| `fluxion.trg_gap_disposition_rules()` | Trigger BEFORE en `gap_dispositions` (B11d): con usuario autenticado, no se puede crear ni rehacer activa una exclusión que gobierna una política, ni modificar una pendiente |
| `fluxion.trg_task_done_propagate_action()` | Trigger AFTER en `tasks`: al completar la tarea de una acción, completa la acción (antes era BEFORE y abortaba la actualización) |
| `fluxion.process_task_recurrences()` | Genera las tareas recurrentes (pg_cron) |
| `fluxion.incident_notification_days(...)`, `set_incident_deadline()` | Plazo del AI Act, Art. 73 |
| `fluxion.approval_policy_for`, `approval_open`, `approval_decide`, `approval_cancel`, `approval_can_decide`, `approval_step_candidates` | Motor de flujos de aprobación |
| `fluxion.hitl_overview(p_days)`, `hitl_discordance_spikes(...)` | Indicadores de supervisión humana |
| `fluxion.connector_secret_set/get/cleanup`, `channel_secret_set/get/cleanup` | Acceso a Vault; solo desde el backend |
| `telemetry.price_at(...)`, `compute_rollup(...)`, `ensure_partitions(n)` | Coste, agregados y particiones de telemetría |
| `public.search_chunks(...)` → `rag.search_chunks(...)` | Búsqueda semántica en el corpus normativo |

Vistas destacadas: `fluxion.v_approval_requests`, `fluxion.v_business_risks`,
`fluxion.v_fmea_item_families`, `fluxion.v_shadow_ai_summary`, `compliance.v_system_obligations`,
`telemetry.v_budget_status` y `telemetry.v_models_without_price`. Todas con `security_invoker`.

## Dependencias

- **Supabase:** Postgres 15.8, PostgREST (expone `public`, `storage`, `graphql_public`, `fluxion`,
  `compliance`, `rag` y `telemetry`), GoTrue (`auth.users`), Vault y Storage.
- **pg_cron:** recurrencias de tareas (`5 * * * *`), rollup de telemetría (`25 * * * *`) y creación de
  particiones (`0 3 1 * *`).
- **pgvector:** embeddings del corpus normativo.
- **Storage:** buckets `organization-logos`, `user-avatars` y `task-attachments`. Las evidencias y los
  documentos generados van a MinIO (`storage_backend = 's3'`). Ver
  [almacenamiento-ficheros.md](almacenamiento-ficheros.md).

## Seguridad

- **RLS:** está activa en las tablas de `fluxion` y `telemetry`. Conviven dos patrones de política:
  - `organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())`.
    Admite usuarios en varias organizaciones.
  - `organization_id = fluxion.auth_user_org_id()`. Devuelve una sola organización por usuario.
- **Tablas hijas sin `organization_id`** (`fmea_items`, `task_*`, `approval_decisions`): la pertenencia
  se comprueba con `EXISTS` sobre la tabla padre.
- **Escrituras por rol:** las de gobierno exigen además un `profiles.role` concreto en la política.
- **Escrituras solo con service role:** señales, sistemas detectados, decisiones de supervisión humana,
  trazas, outbox y avisos no tienen política de inserción para `authenticated`. Entran por la API de
  ingesta o por procesos del servidor.
- **Catálogos compartidos** (`compliance`, plantillas de documento, códigos de supervisión humana,
  tarifas de catálogo): se leen por cualquier usuario autenticado.
- **Inmutabilidad por trigger:** `document_renders`, `approval_decisions` y `outbox_events`.
- **Secretos:** las credenciales de conectores y las URLs de canales se guardan en Vault. Las tablas
  solo guardan su `secret_id`.

Detalle en [seguridad.md](seguridad.md).

## Configuración

| Elemento | Valor | Descripción |
|---|---|---|
| Nombre de migración | `<timestamp>_<modulo>_<descripcion>.sql` | En `supabase/migrations/`. Una migración aplicada no se edita: se corrige con otra |
| Registro de migraciones | `supabase_migrations.schema_migrations` | Lo mantiene `infra/db/migrate.sh` |
| Esquemas expuestos | `PGRST_DB_SCHEMAS` | Debe incluir `fluxion`, `compliance`, `rag` y `telemetry` |
| Catálogo inicial | `00000000000005_seed_compliance.sql` | [Catálogo estándar de Fluxion](../glosario.md#catálogo-estándar-de-fluxion): 418 modos de fallo, 59 plantillas de control, 19 obligaciones y 20 tipos de evidencia, ampliados por migraciones posteriores |
| Histórico | `recursos/db/_legacy/` | Solo documental; no se aplica |
