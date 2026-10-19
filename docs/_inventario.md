# Inventario del sistema — Fase 1

| Versión | Fecha | Estado | Cambios |
|---|---|---|---|
| **1.4** | **2026-10-14** | **Revisado** por Pedro Albarracín | Modelo del catálogo de tablas básicas: catálogo estándar de Fluxion, copia por organización y actualizaciones ofrecidas al `org_admin`. Ver §14.1 |
| 1.3 | 2026-10-13 | Revisado por Pedro Albarracín | Catálogo de tablas básicas mantenido por el `org_admin` de cada cliente; Flujos de aprobación pasa al Core (corrige v1.2); niveles de aprobación pendientes de definir. Ver §14 |
| 1.2 | 2026-10-13 | Revisado por Pedro Albarracín | Respuestas a las preguntas abiertas de §11.5 y §8: 72-73, catálogo `/datos`, flujo de aprobación básico, seguridad aplazada, audiencias, servicios desplegados, modelos LLM. Ver §13 |
| 1.1 | 2026-10-13 | Revisado por Pedro Albarracín | Aplicadas las decisiones de revisión (puntos 1-71): nombres de negocio, estructura objetivo de módulos, clasificación de elementos obsoletos e internos, huecos a implementar. Ver §9-§12 |
| 1.0 | 2026-10-13 | Borrador | Análisis inicial del código en `main` (`c043fd7`) |

> Documento de trabajo, no es documentación. Sirve de base para generar la documentación en la Fase 2.
> Describe el código **tal como está**. Las decisiones de la revisión fijan el **estado objetivo**, que se
> recoge en §9-§12 y en notas `→ Decisión` en cada sección. Donde ambos chocan, la documentación de la
> Fase 2 debe explicar el estado objetivo y marcar lo que todavía no está implementado.
>
> **Nota:** no existe `CLAUDE.md` en el repo (ni en el historial de git ni en `~/.claude`), así que no he
> podido seguir su sección «Documentación». El inventario sigue el encargo literal: módulos, vistas,
> entidades, endpoints, roles e integraciones.

Leyenda: **[?]** = no deducible del código, requiere confirmación humana · **[!]** = incoherencia o
deuda detectada · **→ Decisión (n)** = decisión de la revisión v1.1, con su número de punto ·
rutas relativas a la raíz del repo salvo que se indique.

---

## 0. Mapa del repositorio

| Pieza | Ruta | Tecnología | Estado según docs |
|---|---|---|---|
| Web (frontend + server actions + API) | `apps/web` | Next.js 14.2 App Router, standalone, puerto 3001 | Desplegado (Dokploy `fluxion-saas`) |
| Agentes (clasificación AI Act, asistente SGAI) | `services/agents` | FastAPI, OpenAI, Voyage AI, puerto 8001 | Desplegado (`agent1`) |
| Conector MLflow | `services/connector-mlflow` | Worker Python (httpx) | Desplegado (`fluxionconnectormlflow`) |
| Conector Shadow AI | `services/connector-shadow-ai` | Worker Python (GitHub/GitLab) | Desplegado (confirmado en v1.2); no figura en la topología |
| Renderer PDF | `services/renderer` | FastAPI + Playwright/Chromium, puerto 8000 | Desplegado (confirmado en v1.2) |
| Telemetría OTLP | `services/telemetry` | FastAPI + asyncpg, puerto 8000, `otel.fluxion-ai.es` | Desplegado (confirmado en v1.2); `docs/modulos/b2-telemetria-finops.md` dice «no implementado» |
| Librería común Python | `packages/py-common` (`fluxion_common`) | — | — |
| Esquema BD (fuente de verdad) | `supabase/migrations` | Postgres 15 / Supabase | — |
| Infra | `infra/` (supabase compose, backups, migrate.sh, crontab) | Dokploy, Docker Swarm, Traefik, VPS Hostinger | — |
| Legacy / material de diseño | `recursos/` (incl. `recursos/db/_legacy`) | — | No es fuente de verdad |

[!] El README raíz dice «Tres servicios hoy». Hay seis piezas desplegables.

---

## 1. Módulos

### 1.1 Core (siempre activo, no es un módulo)
Inventario, clasificación AI Act, FMEA, gaps, evidencias, SoA ISO 42001 y tareas (`apps/web/lib/modules/registry.ts`).

Áreas funcionales que hay en el código y que el registro no menciona: obligaciones, modos de fallo, plan de tratamiento, AISIA, riesgos de negocio, incidentes (Art. 73), comités, cuestionario preliminar, catálogos maestros (`/datos`), asistente IA, notificaciones y auditoría.
[?] No sé si alguna de ellas debería ser un módulo de pago.

### 1.2 Módulos contratables (`lib/modules/registry.ts`, tabla `fluxion.organization_modules`)

| key | Nombre | Grupo | `available` | Implementación |
|---|---|---|---|---|
| `connector-mlflow` | Conector MLOps | Integración | sí | `services/connector-mlflow` |
| `shadow-ai` | Detección de Shadow AI | Integración | sí | `services/connector-shadow-ai`, `/inventario/descubrimientos` |
| `telemetry` | Telemetría y evaluación | Supervisión | sí | `services/telemetry`, `/observabilidad` |
| `doc-engine` | Documentación regulatoria | Cumplimiento | sí | `/inventario/[id]/expediente/[key]`, `services/renderer` |
| `hitl` | Auditoría de discordancias | Cumplimiento | sí | `/supervision`, ingesta `hitl-decisions` |
| `approvals` | Flujos de aprobación | Cumplimiento | sí | `/aprobaciones`, `ajustes > Aprobaciones`. → **v1.3:** deja de ser módulo y pasa al Core (§14.2) |
| `lineage` | Linaje de datos y modelos | Integración | no | — |
| `ai-gateway` | AI Gateway | Supervisión | no | — |
| `drift-monitor` | Deriva y equidad | Supervisión | no | — |
| `itsm` | Incidentes e ITSM | Cumplimiento | no | — |

- **Estados:** `enabled | disabled | trial`, con `licensed_until`. Las pruebas duran 30, 60, 90 o 120 días.
- **Prueba automática:** al crear una organización, el trigger `grant_trial_modules` da 30 días de prueba de `connector-mlflow`, `shadow-ai`, `telemetry`, `doc-engine` y `hitl`. `approvals` queda fuera (`supabase/migrations/20260829090000_*.sql`).
- **Quién cambia el estado:** el `org_admin` activa la prueba o desactiva desde `/organizacion > Módulos`. El estado `enabled` no se puede poner desde la UI.
- Docs de módulo existentes: `docs/modulos/{a2-shadow-ai,aisia-auditoria,b2-telemetria-finops,c1-documentacion-regulatoria,c2-supervision-humana,c3-aprobaciones}.md`.

[!] **El gating por módulo solo oculta entradas del sidebar.** Ni `hasModule` ni `requireModule` se llaman desde ninguna página, acción ni ruta. Por URL se puede entrar en `/supervision`, `/observabilidad`, `/expediente`, `/aprobaciones` y `/descubrimientos`. La API de ingesta nunca devuelve el `402 module_not_enabled` que documenta `docs/ingesta.md`.
[!] Hay dos fuentes para lo mismo: `organizations.active_modules` / `normative_modules` (`text[]`) y la tabla `organization_modules`.
→ **Decisión (23-31):** la estructura objetivo de módulos está en §10. Cambia el Core (salen AISIA, Riesgos de negocio y Cuestionario preliminar) y los módulos `connector-mlflow`/`shadow-ai`, `telemetry`, `hitl`, `itsm`, `approvals` y `doc-engine`.
→ **Decisión (31):** `organization_modules` pasa a ser la única fuente de módulos activos. `normative_modules` se reinterpreta como «Marcos aplicables».
→ **Decisión (38, 66-71):** el gating por módulo (`hasModule`/`requireModule`) es hoy código muerto y debe implementarse en páginas, acciones y API (§12).

[?] Qué incluye cada plan (`starter` / `pro` / `enterprise`) y su precio. El plan se muestra pero no tiene ningún efecto funcional.
[?] Cómo se factura y quién pasa un módulo a `enabled`.
[?] Hoja de ruta de los módulos con `available: false`.

---

## 2. Vistas

Columna Control:
- **MW**: prefijo protegido en `apps/web/lib/supabase/middleware.ts` (fuerza sesión y onboarding).
- **AUTH**: la página comprueba la sesión.
- **FMEA**: usa `requireFmeaContext()`, que comprueba sesión y perfil pero no el rol.
- **—**: ningún control en la página.

### 2.1 Autenticación
| Ruta | Propósito | Control |
|---|---|---|
| `/` | Redirige a login, dashboard u onboarding | AUTH |
| `/login` | Email y contraseña | — |
| `/register` | Alta de usuario y organización | — |
| `/onboarding` | Asistente de 4 pasos: perfil de la organización, madurez ISO 42001, foco inicial y fin | MW |

[!] «¿Olvidaste la contraseña?» es `href="#"`: no hay flujo de recuperación.
→ **Decisión (54):** documentar la recuperación de contraseña como funcionalidad a implementar.

### 2.2 Principal / Sistemas
| Ruta | Propósito | Control |
|---|---|---|
| `/dashboard` | KPIs, top de subcategorías y modos de fallo, planes, cadenas causales, guía de onboarding | AUTH, MW |
| `/inventario` | Registro de sistemas de IA | AUTH, MW |
| `/inventario/nuevo` | Asistente de alta (`SystemWizard`). Al guardar lanza la clasificación IA | MW |
| `/inventario/descubrimientos` | Cola de descubrimientos (conectores y Shadow AI): vincular, ignorar o crear sistema | MW |
| `/inventario/[id]` | Ficha del sistema. Pestañas: Obligaciones AI Act, Ficha técnica, ISO 42001, Historial, Evidencias, Modos de fallo, Plan de tratamiento | AUTH, MW |
| `/inventario/[id]/editar` | Edición del sistema | AUTH, MW |
| `/inventario/[id]/clasificacion` | Clasificación AI Act con el motor de reglas (ruta «heredada») | MW · [!] huérfana |
| `/inventario/[id]/riesgos-negocio` | Registro de riesgos de negocio | MW |
| `/inventario/[id]/aisia/[assessmentId]` | AISIA (ISO 42001), secciones S1 a S6 | AUTH |
| `/inventario/[id]/expediente/[key]` | Documento regulatorio: `annex_iv`, `fria`, `dpia`, `model_card` | MW |
| `/inventario/[id]/anexo-iv` | Redirección antigua a `expediente/annex_iv` | — |
| `/inventario/[id]/technical-dossier` (+ `snapshots/[id]`) | Dossier técnico y sus versiones | AUTH, MW |
| `/inventario/[id]/eu-registry` (+ `snapshots/[id]`) | Ficha para el registro UE (Art. 71) | AUTH, MW |
| `/inventario/[id]/gap-report` (+ `snapshots/[id]`) | Informe de brechas del sistema | AUTH, MW |
| `/inventario/[id]/fmea` | Crea o abre la evaluación FMEA y redirige | MW |
| `…/fmea/[evaluationId]/evaluar` | Evaluación FMEA (O/D, estimación por familia causal, grafo) | FMEA |
| `…/fmea/[evaluationId]/comparar` | Comparativa entre versiones de la FMEA | FMEA |
| `…/fmea/[evaluationId]/plan` | Plan de tratamiento (mitigar, aceptar, transferir, evitar, diferir), evidencias, aprobación, riesgo residual | FMEA |
| `…/fmea/[evaluationId]/plan/summary` | Resumen del plan (niveles de aprobación 1 a 3) | FMEA · [!] huérfana |
| `…/fmea/[evaluationId]/exportar` | HTML imprimible de la FMEA (route handler) | AUTH |
| `/gaps` | Análisis consolidado de brechas (capas: normativo, fmea, control, caducidad) | AUTH, MW |
| `/gaps/excluded` | Brechas aceptadas o no aplicables | AUTH, MW |
| `/gaps/snapshots`, `/[id]`, `/compare?a&b` | Instantáneas del análisis de brechas y comparación entre dos | AUTH, MW |
| `/evidencias`, `/evidencias/[id]` | Biblioteca de evidencias, alertas de caducidad y detalle con versiones | AUTH, MW |

### 2.3 Evaluación
| Ruta | Propósito | Control |
|---|---|---|
| `/evaluaciones` | Cola priorizada, FMEA activas, segundas revisiones | AUTH, MW |
| `/planes` | Todos los planes de tratamiento | AUTH · [!] fuera de MW |
| `/planes/revisiones-pendientes` | Acciones aceptadas o diferidas con revisión periódica | AUTH |
| `/incidentes`, `/incidentes/[id]` | Incidentes de IA y plazos del Art. 73 | — · gobierno por rol en la UI |
| `/supervision` | Supervisión humana (Art. 14): KPIs HITL | — |
| `/aprobaciones` | Mis aprobaciones pendientes y el histórico | — |
| `/cuestionario-preliminar`, `/nuevo`, `/[id]` | Cuestionario previo al alta de un sistema | — |

### 2.4 Seguimiento
| Ruta | Propósito | Control |
|---|---|---|
| `/observabilidad` | Coste y latencia de llamadas LLM (solo metadatos) | — |
| `/observabilidad/tarifas` | Tarifas de modelos por organización | — |
| `/observabilidad/presupuestos` | Presupuestos de coste y umbrales | — |
| `/tareas` (+ `calendario`, `metricas`, `plantillas`, `recurrentes`) | Gestión de tareas | AUTH |
| `/kanban` | Tablero de tareas con límites WIP | AUTH |
| `/notificaciones` | Centro de notificaciones in-app | — |

### 2.5 Cumplimiento
| Ruta | Propósito | Control |
|---|---|---|
| `/plantillas/soa-iso42001` | Declaración de Aplicabilidad (38 controles del Anexo A, ciclo draft → under_review → approved, sugerencias IA) | AUTH |

### 2.6 Datos: catálogos maestros globales (esquema `compliance`)
`/datos` (portada), `/datos/modos-de-fallo`, `/datos/medidas`, `/datos/tipos-de-evidencia`, `/datos/obligaciones`,
`/datos/mappings/obligacion-evidencia`, `/datos/mappings/modo-medida`, `/datos/relaciones-causales`,
`/datos/catalogo-causal` (grafo). Control: MW.

[!] **Grave:** las acciones de `/datos/*` escriben con service role y su `requireAdmin()` solo comprueba que haya sesión (TODO en `datos/modos-de-fallo/actions.ts:22`). Cualquier usuario de cualquier organización puede modificar los catálogos que comparten todas.
→ ~~**Decisión (36):** `/datos` se clasifica como ruta sin uso de cliente.~~ **Corregida en v1.2 (§13.2):** `/datos` es el catálogo de tablas básicas y lo mantiene el administrador. Se documenta. Hay que implementar la restricción por rol.

### 2.7 Configuración
| Ruta | Pestañas | Quién edita |
|---|---|---|
| `/organizacion` | Identidad, Datos legales, Perfil regulatorio, Gobernanza, Operaciones, Comités, Plan (solo lectura), Módulos | `org_admin` (comités: también `sgai_manager` y `caio`) |
| `/usuarios` | Miembros (con drawer de detalle), Invitaciones, Roles y permisos (descriptiva), Auditoría | `org_admin` |
| `/ajustes` | Personal: Mi cuenta, Notificaciones, Sesiones. Workspace: Auditoría, Seguridad, API, Webhooks, Conectores, Canales de aviso, Aprobaciones | Personal: todos. Workspace: `org_admin` |
| `/perfil` | Información personal, Cuenta, Seguridad (contraseña y TOTP), Preferencias, Notificaciones, Apariencia | El propio usuario |

### 2.8 Navegación
- **Sidebar** (`components/layout/sidebar.tsx`):
  - Principal: Dashboard; Sistemas (Inventario, Gaps, Evidencias, Descubrimientos\*).
  - Evaluación: Evaluaciones, Planes, Incidentes\*, Supervisión humana, Aprobaciones\*.
  - Seguimiento: Observabilidad, Tareas, Kanban.
  - Cumplimiento: SoA.
  - Datos: los 9 catálogos.
  - Configuración: Organización, Usuarios, Ajustes.
- **Condicionales** (\*), calculados en `app/(app)/layout.tsx`: Descubrimientos si está activo `connector-mlflow` o `shadow-ai`; Aprobaciones si está activo `approvals`; contador de Incidentes. Nada depende del rol ni del plan.
- **Topbar:** campana de notificaciones, menú de usuario (Perfil, Ajustes, Salir) y `OverdueReviewsBanner`.
- **Rutas sin enlace en el sidebar:** `/perfil`, `/notificaciones`, `/cuestionario-preliminar` (enlace desde el dashboard), `/planes/revisiones-pendientes`, subrutas de `/tareas`, `/observabilidad`, `/gaps` y todo `/inventario/[id]/*`.
- **Huérfanas** (sin enlace en ninguna parte): `/inventario/[id]/clasificacion` y `…/plan/summary`.

[!] El middleware no protege `/planes`, `/incidentes`, `/supervision`, `/aprobaciones`, `/observabilidad`, `/tareas`, `/kanban`, `/notificaciones`, `/plantillas` ni `/cuestionario-preliminar`. En esas rutas no se fuerza el onboarding y varias no comprueban sesión en la página. Además protege `/governance` y `/settings`, que no existen.
→ **Decisión (32-35):** `/inventario/[id]/clasificacion`, `…/plan/summary`, `/inventario/[id]/anexo-iv` y los prefijos `/governance` y `/settings` son rutas sin uso. No se documentan (§11.1).
[!] La entrada «Modos de fallo · Próximamente» del sidebar apunta a una página que ya funciona.
[!] El topbar muestra el título «Dashboard» en supervisión, observabilidad, incidentes, aprobaciones, notificaciones, perfil y plantillas.

---

## 3. Entidades (base de datos)

Fuente de verdad: `supabase/migrations/`. `00000000000001_schema.sql` es un pg_dump base y lo demás son migraciones incrementales.
El inventario de abril (`recursos/docs/db_inventory_2026-04-28.md`) está parcialmente desactualizado.

### 3.1 Schemas
| Schema | Contenido |
|---|---|
| `fluxion` | Dominio multi-tenant (`organization_id` en casi todo) |
| `compliance` | Catálogo metodológico global: modos de fallo, obligaciones, controles, grafo causal |
| `rag` | Corpus normativo con embeddings (pgvector) |
| `telemetry` | Spans LLM, rollups, tarifas, presupuestos |
| `public` | Solo `search_chunks` (wrapper) y el event trigger `ensure_rls` |
| `auth`, `storage`, `vault`, `cron` | Supabase: triggers de alta, buckets, secretos y pg_cron |

### 3.2 Tablas por dominio
| Dominio | Tablas |
|---|---|
| Organización y usuarios | `organizations`, `profiles` (un usuario puede estar en N organizaciones), `invitations`, `member_role_changes`, `profile_systems`, `organization_modules` |
| Comités | `committees`, `committee_members` (internos o externos), `committee_sessions` |
| Inventario | `ai_systems` (más de 100 columnas), `ai_system_history`, `discovered_assets` |
| Clasificación AI Act | `classification_events`, `classification_diffs`, `ai_system_classification_reviews`, `agent_sessions`, `agent_messages`, `preliminary_questionnaires` |
| Obligaciones | `compliance.obligations`, `compliance.evidence_types`, `compliance.obligation_evidence_types`, `compliance.control_templates`, `fluxion.system_obligations`, `compliance.frameworks`, `compliance.requirements` y `compliance.requirement_control_mappings` (las tres últimas vacías) |
| Modos de fallo (catálogo) | `compliance.risk_dimensions` (6), `failure_modes` (436), `failure_mode_norm_refs`, `failure_mode_control_refs`, `causal_families` (A a H), `causal_nodes`, `causal_relationships`, `causal_node_failure_mode_links`, `failure_mode_causal_relations` (vacía) |
| FMEA | `system_failure_modes`, `fmea_evaluations`, `fmea_items`, `fmea_item_history`, `fmea_family_estimates`, `causal_graph_instances`, `reevaluation_triggers` |
| Plan de tratamiento | `treatment_plans`, `treatment_actions`, `treatment_action_events`, `treatment_action_reviews`, `treatment_plan_snapshots`, `controls`, `evidence_controls` y dos tablas `*_legacy_20260417` |
| Gaps | `gaps` (parece muerta), `gap_dispositions`, `task_gap_links`. Las brechas se calculan en `apps/web/lib/gaps/data.ts` |
| Evidencias | `system_evidences`, `system_evidence_versions`, `system_obligation_evidences`, `system_failure_mode_evidences`, `evidence_expiry_alerts`, `evidences` (segundo modelo) |
| SoA ISO 42001 | `organization_soa_controls`, `organization_soa_metadata`, `organization_soa_system_links`, `soa_controls_log`, `soa_lifecycle_log`. El catálogo de controles está en `apps/web/lib/templates/iso42001-catalog.ts` |
| AISIA | `aisia_assessments`, `aisia_sections`, `aisia_ai_generations` |
| Riesgos de negocio | `business_risk_assessments` (exposición calculada como probabilidad × impacto) |
| Tareas | `tasks` (origen polimórfico), `task_comments`, `task_attachments`, `task_checklist_items`, `task_watchers`, `task_activity_log`, `task_templates`, `task_saved_views`, `task_recurrences`, `task_recurrence_runs` |
| Notificaciones y canales | `notifications`, `notification_channels` (Slack o Teams; la URL va en Vault), `channel_deliveries` |
| Auditoría | `audit_log` y logs por dominio (`ai_system_history`, `fmea_item_history`, `treatment_action_events`, `soa_*_log`, `member_role_changes`, `task_activity_log`) |
| API e integración | `api_keys` (hash SHA-256 y scopes), `webhooks`, `signals`, `connector_connections`, `connector_sync_runs`, `shadow_ai_findings`, `outbox_events`, `outbox_deliveries` |
| Incidentes (Art. 73) | `ai_incidents` (referencia INC-AAAA-NNN y plazo calculados por trigger), `ai_incident_systems`, `incident_deadline_alerts` |
| Documentos | `document_templates` (annex_iv, fria, dpia, model_card, approval_minutes), `documents`, `document_renders` (inmutable), `system_report_snapshots` |
| Aprobaciones | `approval_policies`, `approval_policy_steps`, `approval_requests`, `approval_decisions` (inmutable), `approval_delegations` |
| HITL | `hitl_reason_codes`, `hitl_decisions` |
| Telemetría | `telemetry.model_prices`, `llm_spans` (particionada por mes), `rollup_daily`, `rollup_runs`, `cost_budgets`, `cost_budget_alerts` |
| RAG | `rag.documents`, `rag.chunks` (vector 1024), `rag.ingestion_jobs` y el equivalente por organización: `organization_documents`, `organization_chunks` (vector 1536), `org_ingestion_jobs` |
| Asistente | `assistant_conversations` |

### 3.3 Enums clave
- `org_role`: org_admin, sgai_manager, caio, dpo, system_owner, risk_analyst, compliance_analyst, executive, auditor, viewer
- `platform_role`: platform_admin, partner
- `aiact_risk_level`: prohibited, gpai, high, limited, minimal, pending
- `value_chain_role`: provider, deployer, importer, distributor, authorised_representative
- `treatment_option`: mitigar, aceptar, transferir, evitar, diferir
- `treatment_plan_status`: draft, in_review, approved, in_progress, closed, superseded
- `evaluation_state`: draft, in_review, approved, superseded
- `approval_level`: level_1, level_2, level_3
- `task_status`: todo, in_progress, blocked, in_review, done, cancelled
- `approval_object_type`: treatment_plan, aisia_assessment, document, soa, evidence
- `incident_status`: open, investigating, contained, closed

Hay muchos estados guardados como `text` con CHECK en vez de enum.

### 3.4 Lógica en la base de datos
- **Alta de usuario** (`handle_new_user`): si el usuario tenía invitación, entra en esa organización con el rol de la invitación. Si no, se crea una organización nueva y el usuario queda como `org_admin`.
- **RLS:** dos patrones conviven.
  - `organization_id IN (SELECT … FROM profiles WHERE user_id = auth.uid())`: soporta varias organizaciones por usuario.
  - `organization_id = fluxion.auth_user_org_id()`: usa LIMIT 1, así que ve una sola organización. [!]
- **Escrituras solo con service role:** signals, discoveries, HITL, spans, outbox, notificaciones.
- **pg_cron:** `process-task-recurrences` (`5 * * * *`), `telemetry-rollup` (`25 * * * *`), `telemetry-partitions` (`0 3 1 * *`).
- **Storage Supabase:** buckets `evidence-files` (legacy), `task-attachments`, `organization-logos` y `user-avatars`. Desde agosto los ficheros nuevos van a MinIO/S3.
- **Semilla:** `00000000000005_seed_compliance.sql` (catálogo `compliance`), más plantillas documentales, códigos HITL y obligaciones del AI Act incluidos en migraciones.

### 3.5 Incoherencias de datos
- [!] **Grave:** las vistas base `plan_summary`, `treatment_actions_pending_review`, `failure_mode_priority_diagnostic_*` y `rag.org_corpus_status` no tienen `security_invoker` y conceden `SELECT, INSERT, UPDATE, DELETE` a `authenticated`. Como el propietario es postgres, pueden saltarse la RLS y exponer datos de otras organizaciones. La migración `20260821091000` corrige este mismo fallo, pero solo en otra vista.
- [!] `rag.search_chunks` es `SECURITY DEFINER` y acepta el `org_id` que le pase quien la llama.
- [!] La dimensión de los embeddings no coincide: 1024 en `rag.chunks` y 1536 en `rag.organization_chunks`. El corpus por tenant no se usa en el código.
- [!] Hay dos modelos de evidencia: `evidences`, usada por las acciones de tratamiento, y `system_evidences`, que usa todo lo demás.
- [!] Tablas sin uso aparente en el código: `gaps`, `evidence_controls`, `causal_graph_instances`, `reevaluation_triggers`, `committee_sessions`, `aisia_ai_generations`, `rag.ingestion_jobs`, `rag.organization_*` y las tablas `*_legacy_20260417`.
- [!] Hay FKs polimórficas o ausentes (`tasks.source_id`, `approval_requests.object_id`, `business_risk_assessments.failure_mode_id`, etc.). Las referencias a usuarios mezclan `auth.users` y `profiles`.
- [!] `webhooks.secret` se guarda en claro, mientras que los canales usan Vault.
- [!] `expire_invitations()` existe pero ningún cron la invoca.
- → **Decisión (44-49):** confirmadas como sin uso o legacy las tablas, columnas, enums y funciones que lista §11.3. No se documentan como parte del modelo de datos vigente.
- → **Decisión (30):** las dos tablas de evidencias se unificarán en una sola «Biblioteca de evidencias».
- [?] Columnas cuyo significado no se puede deducir del código: `fmea_evaluations.cached_zone` (zonas I a IV), `system_failure_modes.quota_dropped` y `activation_signals`, `treatment_plans.pivot_node_ids`, `failure_modes.bloque` y `tipo`, `causal_nodes.domain`, `profiles.copilot_enabled`, `organizations.size`.
- [?] `20260913` habla de un «paso anterior» que sacó del FMEA los modos con `origin='negocio'`, pero no hay ninguna migración `20260912`.

---

## 4. Endpoints

### 4.1 Mecanismos de autenticación
- **Sesión Supabase (cookie):** `getUser()` valida contra Auth; `getSession()` solo lee la cookie.
- **Clave API** `Bearer flx_…` (`apps/web/lib/auth/api-key.ts`): se valida por hash SHA-256 y scope, con un límite de 300 peticiones/min por clave guardado en memoria [!].
- **Secreto de cron:** `Bearer $CRON_SECRET` (`lib/cron/auth.ts`). Falla en cerrado: sin secreto devuelve 503.

### 4.2 API de ingesta (máquina a máquina, clave API) — `apps/web/app/api/ingest/v1/`
| Ruta | Método | Scope | Función |
|---|---|---|---|
| `ping` | GET | `signals:write` | Comprueba la clave |
| `signals` | POST | `signals:write` | Señales de módulos (hasta 100 por lote, idempotentes por `dedupe_key`). Se despachan a historial, aviso o tarea según severidad |
| `discoveries` | POST | `inventory:write` | Activos descubiertos (hasta 100) |
| `shadow-ai/findings` | POST | `inventory:write` | Hallazgos de Shadow AI (hasta 500) |
| `hitl-decisions` | POST | `hitl:write` | Decisiones humanas frente a IA (hasta 100; rechaza PII en `metadata`) |
| `connectors/config` | GET | `connectors:sync` | Configuración y credenciales (desde Vault) de conectores `mlflow`, `github` o `gitlab` |
| `connectors/runs` | POST | `connectors:sync` | Registro de cada ejecución de sincronización |

Diferencias con el contrato `docs/ingesta.md`:
- [!] No documenta `hitl-decisions` ni `shadow-ai/findings`, ni los scopes `hitl:write` y `telemetry:write`.
- [!] Promete un 402 por módulo que no está implementado.
- [!] La taxonomía de `signal_type` no coincide con lo que se emite (`hitl.discordance_spike`, `cost.budget_threshold`).
- [!] `discoveries` no valida que `connection_id` pertenezca a la organización.
- [!] Un `external_id` duplicado en el mismo lote hace fallar el lote entero con un 500.
- [!] Los scopes `signals:read` e `inventory:read` no tienen ningún endpoint.

### 4.3 Proxys al servicio de agentes (sesión; reenvían el JWT a `AGENT_SERVER_URL`)
| Ruta web | Método | Destino en agents |
|---|---|---|
| `/api/agent/classify-system` | POST (SSE) | `/api/agent/classify-system` |
| `/api/agent/classify-system/confirm` | POST | `/api/agent/classify-system/confirm`, y además escribe historial |
| `/api/agent/assistant/chat` | POST (SSE) | `/api/agent/assistant/chat` |
| `/api/agent/assistant/conversations` (+`/[id]`) | GET, DELETE | ídem |
| `/api/v1/systems/[id]/reclassify` | POST | `/api/v1/systems/{id}/reclassify` |
| `/api/v1/systems/[id]/reclassify-ai` | POST | `/api/v1/systems/{id}/reclassify/ai` |
| `/api/v1/systems/[id]/reconcile` | POST | `/api/v1/systems/{id}/reconcile` |
| `/api/v1/systems/[id]/classification-events/[eventId]` | DELETE | ídem |

[!] `classify-system/confirm` no comprueba que `system_id` pertenezca a la organización.
[!] `reclassify` y `reconcile` devuelven 500 si el agente responde algo que no es JSON.

### 4.4 Ficheros (sesión)
| Ruta | Método | Función |
|---|---|---|
| `/api/documents/v1/renders/[id]/download` | GET | Redirige (302) a una URL firmada de MinIO con el PDF |
| `/api/organization/upload-logo` | POST | Sube el logo a Supabase Storage (solo `org_admin`) |
| `/api/user/upload-avatar` | POST | Sube el avatar. [!] No guarda la URL en el perfil |

### 4.5 Cron (`/api/cron/*`, GET, secreto de cron; programados en `infra/schedules/crontab`)
| Ruta | Programación | Función |
|---|---|---|
| `evidence-expiry` | `0 7 * * *` | Alertas de caducidad de evidencias (30 días, 7 días, caducada) |
| `review-reminders` | `0 8 * * 1` | Recordatorio de revisión de acciones aceptadas o diferidas |
| `incident-deadlines` | `17 * * * *` | Plazos del Art. 73: notificación in-app y por canales |
| `cost-budgets` | `40 * * * *` | Umbrales de presupuesto: señal y aviso por canal |
| `hitl-discordance` | `30 6 * * *` | Picos de discordancia HITL: señal y aviso por canal |
| `outbox` | `*/5 * * * *` | Entrega de webhooks salientes |

[!] `infra/schedules/README.md` está desactualizado: habla de 4 trabajos y dice que sin secreto el endpoint queda abierto.
[!] Las señales que generan los crons no pasan por `dispatchSignal`, así que no crean historial, aviso in-app ni tarea.
[?] No sé si el crontab está instalado de verdad en el VPS.

### 4.6 Server actions (resumen por área; el detalle está en cada `actions.ts`)
- **Ajustes** (`ajustes/actions.ts`): sesiones, auditoría y retención, seguridad, claves API, webhooks, conectores, canales, políticas y delegaciones de aprobación.
- **Organización / Usuarios / Perfil / Auth:** perfil de la organización, comités, módulos; invitar, crear, cambiar rol, desactivar y eliminar miembros; contraseña; login, signup, onboarding.
- **Catálogos `/datos/*`:** CRUD de modos de fallo, medidas, obligaciones, tipos de evidencia, relaciones causales y mappings.
- **Inventario:** alta, edición, clasificación, descubrimientos, obligaciones, modos de fallo, riesgos de negocio, AISIA, expediente documental (llama al renderer), guardar informes como evidencia.
- **FMEA / Plan:** evaluar, estimar por familia, segunda revisión, plan de tratamiento, aprobación, evidencias, riesgo residual, acciones masivas.
- **Evidencias / Gaps:** CRUD y revisión de evidencias, subida en 3 pasos a S3, versiones; snapshots, asignaciones y disposiciones de gaps.
- **SoA:** ciclo de vida y sugerencias IA. Llama directamente a OpenAI, no a agents.
- **Incidentes, Observabilidad (tarifas y presupuestos), Tareas** (unas 50 acciones), **Notificaciones**, **Aprobaciones**, **Cuestionario preliminar**.

### 4.7 Eventos
- **Outbox** (`lib/outbox/events.ts`). Eventos con emisor: `approval.pending`, `approval.approved`, `approval.rejected`, `approval.cancelled` y `task.completed`.
- **Eventos declarados sin emisor:** `evaluation.*`, `gap.*`, `system.created` y `member.*`.
- **Entrega:** webhooks firmados con HMAC-SHA256 en la cabecera `X-Fluxion-Signature`, con reintentos a 1 min, 5 min, 15 min, 1 h, 6 h y 24 h.
- [!] **Reintentos:** hay un off-by-one, así que la espera de 1 minuto nunca se aplica.
- [!] **Doble envío:** no hay claim de filas, así que dos ejecuciones solapadas pueden enviar el mismo evento dos veces.
- [!] **`task.completed` incompleto:** no se emite cuando la tarea se completa desde el kanban o con una acción masiva.
- **Canales para personas** (`lib/channels/send.ts`, Slack o Teams): es un sistema de entrega separado del outbox.

### 4.8 Endpoints de los servicios Python
| Servicio | Endpoints |
|---|---|
| agents (:8001) | `GET /health`; `POST /api/agent/classify-system` (SSE), `/confirm`; `GET /api/agent/sessions/{id}`; `GET /api/systems/{id}/classification-history`; `/api/v1/systems/{id}/{classify,reclassify,reclassify/ai,reconcile,classification-events[/{eid}]}`; `/api/agent/assistant/{chat,conversations[/{id}]}` |
| renderer (:8000) | `GET /health`; `POST /render/v1/pdf` (`Bearer RENDERER_SECRET`) |
| telemetry (:8000) | `GET/HEAD /health`; `POST /v1/traces` (OTLP; clave `flx_` con scope `telemetry:write`) |
| connector-mlflow, connector-shadow-ai | Sin HTTP: son workers que llaman a la API de ingesta |

---

## 5. Roles y permisos

### 5.1 Roles
- **Organización** (`fluxion.org_role`), con su etiqueta en la UI:

  | Rol | Etiqueta |
  |---|---|
  | org_admin | Administrador |
  | sgai_manager | SGAI Manager |
  | caio | CAIO |
  | dpo | DPO |
  | system_owner | System Owner |
  | risk_analyst | Analista de Riesgos |
  | compliance_analyst | Analista de Cumplimiento |
  | executive | Directivo |
  | auditor | Auditor |
  | viewer | Lector |

  Se pueden invitar todos menos `org_admin`, que solo tiene quien crea la organización.
- **Plataforma:** `platform_admin` y `partner`. [?] Están definidos pero ningún código los usa. Desconozco su propósito.
- **Comités:** tipos `ai_committee`, `risk_committee` y `director_review`; roles dentro del comité `president`, `secretary`, `member` y `advisor`.
- **Asignación a sistemas:** `profile_systems.is_lead`. Se usa para decidir a quién avisar de las señales.

### 5.2 Matriz declarada vs. aplicada
`apps/web/lib/auth/permissions.ts` declara una matriz de permisos (`ai_systems:*`, `fmea:*`, `treatment_plans:approve_z1_z2/z3_z4`, `evidence:*`, `soa:*`, `committees:*`, `reporting:read`, `users:manage`, `billing:manage`) por rol.
**[!] Ningún fichero la importa.** → **Decisión (37):** es código muerto; la documentación debe describir la autorización real.
La autorización real está escrita a mano en cada sitio:

| Ámbito | Roles que se comprueban de verdad |
|---|---|
| Organización, módulos, usuarios, logo, auditoría, seguridad, claves API, webhooks | `org_admin` |
| Conectores, canales, delegaciones | `org_admin`, `sgai_manager`. [!] La UI solo muestra la pestaña a `org_admin` |
| Políticas de aprobación, comités, lista de aprobadores | `org_admin`, `sgai_manager`, `caio` |
| Gobierno de incidentes | `org_admin`, `sgai_manager`, `caio`, `dpo`, `risk_analyst`, `compliance_analyst` |
| SoA: enviar y aprobar | `ROLES_CAN_SUBMIT` y `ROLES_CAN_APPROVE` (`plantillas/soa-iso42001/actions.ts`) |
| Descubrimientos | `RESOLVER_ROLES` |
| **Editar plan de tratamiento y segunda revisión FMEA** | `['admin','editor','dpo','technical']`. [!] Tres de esos cuatro roles no existen, así que **en la práctica solo `dpo`** |
| AISIA, clasificación, edición de sistema, evidencias, presupuestos, tarifas, tareas, catálogos `/datos` | Sin comprobación de rol en el código. [?] No he verificado si RLS lo cubre en todos los casos |

Otros problemas con los roles:
- [!] **Etiqueta del sidebar:** `getRoleLabel` (`app/(app)/layout.tsx:13`) espera `admin`, `editor` y `viewer`, así que casi todos los roles se muestran como «Miembro».
- [!] **Validación de rol:** `inviteUser`, `inviteUserBulk` y `updateMemberRole` no validan el rol con `isInvitableRole`.
- [!] **Miembros desactivados:** no se comprueba `is_active`, así que no consta que un miembro desactivado pierda el acceso.

### 5.3 MFA y seguridad de cuenta
- El usuario puede activar TOTP en `/perfil > Seguridad`.
- [!] El login no exige AAL2, aunque la UI dice que se pedirá el código en cada inicio de sesión.
- [!] `mfa_required`, `allowed_email_domains` y `session_timeout_minutes` (en `/ajustes > Seguridad`) se guardan pero no se aplican.
- → **Decisión (55):** la aplicación de esta política está planificada.
- → **Decisión (56):** `is_active` debe usarse para bloquear el acceso de los miembros desactivados.
- → **Decisión (39):** `platform_admin` y `partner` son código muerto.

### 5.4 Scopes de clave API (`lib/auth/scopes.ts`)
- Scopes: `signals:write`, `signals:read`, `inventory:write`, `inventory:read`, `connectors:sync`, `telemetry:write` y `hitl:write`.
- Legacy: `admin` concede todo; `write` concede `*:write` y `*:read`; `read` concede `*:read`. `connectors:sync` solo lo concede `admin`.

→ **Decisión (11, 12):** zonas y niveles de aprobación reciben nombre de negocio (§9). Lo que fija el código (`lib/fmea/domain.ts` y `lib/fmea/treatment-plan.ts:274`):

| Zona | Nombre de negocio | Nivel de aprobación | Revisión | Plazo por defecto |
|---|---|---|---|---|
| I (rojo) | Crítico | 3 · Dirección | mensual | 30 días |
| II (naranja) | Alto | 2 · Comité | trimestral | 90 días |
| III (cian) | Moderado | 1 · Responsable | semestral | 180 días |
| IV (verde) | Aceptable | 1 · Responsable | anual | 365 días |

[?] Qué rol concreto aprueba en cada nivel. `getApproverRolePriority` usa roles que no existen (§5.2), así que el código no lo resuelve.

---

## 6. Integraciones externas

| Integración | Para qué | Dónde | Variables (solo nombres) |
|---|---|---|---|
| Supabase Auth (GoTrue) | Login, alta, invitaciones, gestión admin de usuarios | `apps/web/lib/supabase/*`, `usuarios/actions.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Supabase Postgres / PostgREST | Datos (schemas `fluxion`, `compliance`, `rag`, `telemetry`) | Toda la app, agents, telemetry (este último en conexión directa con `DATABASE_URL`) | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `DATABASE_URL` |
| Supabase Vault | Credenciales de conectores y URLs de canales | RPC `connector_secret_*`, `channel_secret_*` | — |
| Supabase Storage | Avatares, logos, adjuntos de tareas y evidencias legacy | `api/*/upload-*`, `tareas/actions.ts` | — |
| MinIO (S3) | Evidencias y PDFs generados. El bucket `fluxion-documents` tiene bloqueo GOVERNANCE de 10 años | `lib/storage/objects.ts`, `lib/evidences/storage.ts` | `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_FORCE_PATH_STYLE`, `S3_BUCKET_EVIDENCES`, `S3_BUCKET_DOCUMENTS` |
| OpenAI | Clasificación y asistente (agents, modelo por defecto `gpt-5.6-terra`). Sugerencias de SoA (web, `gpt-5.4` fijo en código) | `services/agents`, `plantillas/soa-iso42001/actions.ts` | `OPENAI_API_KEY`, `FLUXION_CLASSIFICATION_MODEL`, `FLUXION_ASSISTANT_MODEL` |
| Voyage AI | Embeddings `voyage-law-2` para RAG | `services/agents/fluxion_agents/rag/retriever.py` | `VOYAGE_API_KEY` |
| Resend | Email transaccional | `lib/notifications/email.ts`, `sender.ts` | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| SMTP de GoTrue | Emails de Auth (invitación, confirmación) | `infra/supabase/env.propio.example` | `SMTP_*` |
| Slack / Microsoft Teams | Avisos a personas por webhook entrante (en Teams solo MessageCard) | `lib/channels/send.ts` | URL en Vault |
| Webhooks salientes | Eventos del outbox firmados con HMAC | `lib/outbox/dispatch.ts` | Secreto en `fluxion.webhooks` |
| MLflow | Model Registry | `services/connector-mlflow` | `MLFLOW_TRACKING_URI`, `MLFLOW_USERNAME`, `MLFLOW_PASSWORD` (respaldo; normalmente vienen de Vault) |
| GitHub / GitLab | Escaneo de Shadow AI con un token de solo lectura del cliente | `services/connector-shadow-ai/…/providers.py` | Token en Vault |
| OpenTelemetry (OTLP) | Trazas LLM hacia `services/telemetry` | `packages/py-common/fluxion_common/telemetry.py` | `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`, `FLUXION_ENV`, `FLUXION_SYSTEM_ID` |
| Renderer (interno) | HTML a PDF | `lib/documents/render.ts` | `RENDERER_URL`, `RENDERER_SECRET` |
| Agents (interno) | IA | `app/api/agent/**`, `app/api/v1/**` | `AGENT_SERVER_URL`, `FRONTEND_URL` |
| Cron externo (host) | Dispara `/api/cron/*` | `infra/schedules/` | `CRON_SECRET`, `FLUXION_WEB_URL` |
| Backblaze B2 | Copia de seguridad offsite cifrada (rclone crypt) | `infra/backups/offsite-*.sh` | `SLACK_WEBHOOK_INFRA` y `rclone.conf` |
| Google Fonts | Fuentes de la exportación FMEA imprimible | `…/fmea/[evaluationId]/exportar/route.ts` | — |

### 6.1 RAG
- **Corpus:** 22 documentos y 3.129 chunks: AI Act, MDR, IVDR, DORA, ISO 42001, RGPD, ENS y guías de AESIA (`recursos/baseline/rag_corpus.manifest.json`).
- **Cómo se carga:** se restaura desde un volcado SQL. No existe ningún ingestor.
- [!] **Copia de seguridad:** el volcado está en el MinIO de MLflow, que la copia de seguridad no cubre.
- → **Decisión (65):** el ingestor del corpus será una utilidad independiente, pendiente de implementar.
- → **Decisión (64):** el RAG por organización debe implementarse.

### 6.2 Infraestructura
- **Servidor:** VPS Hostinger con Dokploy, Docker Swarm y Traefik, compartido con otros proyectos.
- **Dominios:** `fluxion-ai.es`, `supabase2.fluxion-ai.es` (stack propio), `otel.`, `minio.`, `mlflow.` y `dokploy.`.
- **Supabase:** autoalojado. La migración a stack propio va por la fase 6 de 7 (`docs/infra/migracion-supabase-propio.md`).
- **Migraciones:** `infra/db/migrate.sh`.
- **Copias de seguridad:** volcado diario de Postgres (el script no está en el repo [?]), espejo de MinIO y B2 offsite con verificación semanal.

[!] Hay dos dominios por defecto mezclados en el código: `app.fluxion.ai` y `notificaciones@fluxion.ai` frente a `fluxion-ai.es`.
[!] No hay `.env.example` para la web.
[?] Qué valores tienen en producción las variables configuradas en Dokploy (modelos activos, URLs internas).
[?] Proveedor SMTP de GoTrue y dominio verificado en Resend.
[?] Región y retención de datos de OpenAI y Voyage, y los planes o SLAs contratados con cada proveedor.

---

## 7. Hallazgos de seguridad detectados durante el análisis

> **v1.2:** por decisión de la revisión, estos hallazgos quedan **fuera de consideración hasta la Fase 2**. No condicionan el mapa ni la documentación por ahora (§13.5).

No forman parte del inventario. Los valores no se reproducen aquí.

1. **Credenciales reales versionadas en git:**
   - Una clave API `flx_…` completa en `services/telemetry/README.md:138`.
   - `account` y `key` de Backblaze B2 en `infra/backups/README.md:~186-187`.
   - Hay que rotarlas y sustituirlas por placeholders. Siguen en el historial de git.
2. **Catálogos globales `/datos/*` sin control de rol** (§2.6).
3. **Vistas base sin `security_invoker`, con escritura concedida a `authenticated`** (§3.5).
4. **`rag.search_chunks` es SECURITY DEFINER y acepta un `org_id` arbitrario** (§3.5).
5. **Rutas fuera del middleware** (§2.8).
6. **Gating de módulos solo en el sidebar** (§1.2).
7. **MFA, dominios permitidos y timeout de sesión no se aplican** (§5.3).
8. **`classify-system/confirm` no comprueba que el sistema pertenezca a la organización** (§4.3).
9. **Renderer sin bloqueo de red en Chromium.** El secreto se compara con `!=` en vez de en tiempo constante (`services/renderer/fluxion_renderer/main.py`).
10. **agents usa la service key**, así que el aislamiento entre organizaciones depende de filtros manuales.

---

## 8. Preguntas abiertas para la Fase 2 (no deducibles del código)

Estado tras la revisión v1.2:
- **Resueltas en v1.2 (§13):** 1 (hay que generar `CLAUDE.md`), 2 (técnicos y comerciales), 3 (catálogo de tablas básicas, lo mantiene el administrador), 4 (planes pendientes de configuración), 7 (todo desplegado) y 8 (GPT de OpenAI; modelo configurable por organización en el futuro).
- **Sigue abierta:** 6. Los niveles de aprobación están pendientes de definir (v1.3, §14.3).

Estado tras la revisión v1.1 (histórico):
- **Resueltas:** 3 (`/datos` sin uso de cliente; corregida en v1.2), 5 (código muerto), 9 (rutas sin uso), 10 (Agente 3 = generador de documentos, según `recursos/agent4_assistant_spec.md`; pendiente de implementar), 11 (sin uso / a implementar) y 12 (se documentan como próximas funcionalidades).
- **Resuelta en parte:** 6. Las zonas y los niveles ya tienen nombre (§5.4), pero falta saber qué rol aprueba en cada nivel.
- **Siguen abiertas:** 1, 2, 4, 7 y 8, más las de §11.5.

1. ¿Dónde está la sección «Documentación» de `CLAUDE.md`? ¿Hay que crear el fichero? ¿Qué formato, audiencia e idioma debe tener la documentación?
2. ¿Para quién es la documentación: usuario final, administrador de organización, desarrollador u operación/infra?
3. ¿`/datos` es un back-office interno de Fluxion o una función para clientes?
4. ¿Qué incluye cada plan (`starter`, `pro`, `enterprise`) y cómo se pasa un módulo a `enabled`?
5. ¿Qué hacen `platform_admin` y `partner`?
6. ¿Qué significan las zonas FMEA I a IV y los niveles de aprobación 1 a 3, y qué rol debe aprobar cada uno? ¿Manda `permissions.ts` o el código actual?
7. ¿Qué servicios están desplegados de verdad: renderer, telemetry, connector-shadow-ai?
8. ¿Qué modelos LLM se usan en producción y qué proveedores de email (SMTP y Resend)?
9. ¿Las rutas huérfanas (`/inventario/[id]/clasificacion`, `…/plan/summary`, `anexo-iv`) se documentan o se eliminan?
10. ¿Qué es «Agente 3» (`organizacion/tabs/operaciones.tsx:210`)? En el código solo aparecen el Agente 1 (clasificación) y el Agente 4 (asistente).
11. ¿Las tablas sin uso (`gaps`, `committee_sessions`, `reevaluation_triggers`, RAG por tenant…) son funcionalidad futura o deuda?
12. Hoja de ruta de `lineage`, `ai-gateway`, `drift-monitor` e `itsm`.

---

# Decisiones de la revisión v1.1 (2026-10-13)

## 9. Glosario: nombres de negocio (decisiones 1-22)

Regla para la Fase 2: la documentación de usuario usa el **nombre de negocio**. El nombre técnico solo aparece en la documentación técnica, o entre paréntesis la primera vez.

| # | Nombre técnico | Nombre de negocio |
|---|---|---|
| 1 | `signals` | Señales de riesgo |
| 2 | `discovered_assets` / Descubrimientos | Sistemas detectados pendientes de alta |
| 3 | `shadow-ai` | Detección de IA no declarada |
| 4 | `hitl` / Supervisión humana / Auditoría de discordancias | Supervisión humana (Art. 14) |
| 5 | `telemetry` / Observabilidad | Coste y uso de IA (FinOps) |
| 6 | `doc-engine` / Expediente | Documentación regulatoria |
| 7 | `connector-mlflow` / Conector MLOps | Conector MLflow |
| 8 | SoA | Declaración de Aplicabilidad ISO 42001 |
| 9 | AISIA | Evaluación de impacto del sistema de IA (ISO 42001) |
| 10 | FMEA | Análisis de modos de fallo (FMEA) |
| 11 | `zona_i` … `zona_iv` | Zona I Crítico · Zona II Alto · Zona III Moderado · Zona IV Aceptable |
| 12 | `approval_level` 1-3 | Nivel 1 Responsable · Nivel 2 Comité · Nivel 3 Dirección |
| 13 | Capas de gap `normativo` / `fmea` / `control` / `caducidad` | Obligación sin cubrir · Riesgo sin tratar · Control sin implantar · Evidencia caducada |
| 14 | `gap_dispositions` `accepted` / `not_applicable` | Brecha asumida · Fuera de alcance |
| 15 | `treatment_option` | Mitigar · Aceptar · Transferir · Evitar · Posponer con revisión (`diferir`) |
| 16 | `priority_status` | Por revisar · Priorizado · En vigilancia · Descartado |
| 17 | `value_chain_role` | Rol en la cadena de valor (AI Act): Proveedor · Responsable del despliegue · Importador · Distribuidor · Representante autorizado |
| 18 | Outbox / webhooks | Integraciones salientes (webhooks) |
| 19 | Notificaciones / Canales de aviso / Webhooks | Avisos en la app · Avisos a Slack/Teams · Integraciones (webhooks) |
| 20 | `/datos` / «Base de datos» | Catálogo metodológico |
| 21 | Agente 1 / Agente 3 / Agente 4 | Asistente de clasificación AI Act · Generador de documentos · Asistente SGAI |
| 22 | `ai_systems.internal_id` / `code` | Código del sistema |

## 10. Estructura objetivo de módulos (decisiones 23-31)

### 10.1 Core objetivo
Inventario, clasificación AI Act, obligaciones, análisis de modos de fallo (FMEA), plan de tratamiento, brechas, Biblioteca de evidencias (unificada), Declaración de Aplicabilidad, tareas, **incidentes (Art. 73)** y **Flujos de aprobación** completo, disponible en todos los planes (v1.3, §14.2). Además, los elementos transversales: organización, usuarios, comités, avisos, auditoría y Asistente SGAI.

Salen del Core: AISIA, Riesgos de negocio y Cuestionario preliminar (pasan a «Evaluación de impacto», decisión 29).

### 10.2 Módulos objetivo

| Módulo objetivo | Origen actual | Decisión | Estado en código |
|---|---|---|---|
| **Descubrimiento de inventario**, con dos fuentes: Conector MLflow y Detección de IA no declarada | `connector-mlflow` + `shadow-ai` | 23 · fusión | Dos módulos separados que comparten cola |
| **Coste y uso de IA (FinOps)** | `telemetry` (parte de coste y latencia) | 24 · separación | Implementado |
| **Evaluación de calidad** | `telemetry` («calidad RAG») | 24 · separación | No existe |
| **Supervisión post-comercialización**: Supervisión humana (Art. 14) y, más adelante, deriva y equidad | `hitl` + `drift-monitor` | 25 · fusión | `hitl` implementado; `drift-monitor` no existe |
| **Integración ITSM** (Jira, ServiceNow) | `itsm` | 26 · los incidentes quedan en el Core | No existe |
| ~~Flujos de aprobación~~ → **pasa al Core** (v1.3). Absorbe la aprobación del plan de tratamiento | `approvals` + aprobación propia del plan | 27 · integración; v1.3 · Core | Dos mecanismos separados; hoy es módulo opcional |
| **Documentación del sistema** (Anexo IV, FRIA, DPIA, Model card) | `doc-engine` | 28 · separación | Implementado (redacción humana + PDF) |
| **Actas y paquetes de auditoría** | `doc-engine` (`approval_minutes`, «paquetes de auditoría») | 28 · separación | Plantilla de actas sí; paquetes no |
| **Evaluación de impacto**: AISIA, Riesgos de negocio, Cuestionario preliminar | Core | 29 · sale del Core | Implementado |
| Linaje de datos y modelos, AI Gateway | `lineage`, `ai-gateway` | Sin cambios | No existen. Se documentan como próximas funcionalidades (52) |

### 10.3 Unificaciones de datos
- **Biblioteca de evidencias única (30):** `fluxion.evidences` y `fluxion.system_evidences` se unifican.
- **Fuente única de módulos (31):** `fluxion.organization_modules`. `organizations.active_modules` desaparece y `normative_modules` pasa a significar «Marcos aplicables» (AI Act, ISO 42001, RGPD, DORA…).

## 11. Clasificación de elementos (decisiones 32-53)

### 11.1 Rutas sin uso: no se documentan (32-36)
`/inventario/[id]/clasificacion`, `/inventario/[id]/fmea/[evaluationId]/plan/summary`, `/inventario/[id]/anexo-iv`, los prefijos `/governance` y `/settings` del middleware. (`/datos/*` salió de esta lista en v1.2: se documenta, §13.2.)

### 11.2 Código muerto: no se documenta (37-43)
`lib/auth/permissions.ts`, `hasModule`/`requireModule` (lib/modules/entitlements.ts), los roles `platform_admin` y `partner`, `profiles.copilot_enabled`, `ComingSoonNotice`, `notifications_email` y `getAppAuthState().membership`.

> **Resuelto en v1.2:** `/datos` se documenta y la mantiene el administrador. El gating por módulo se implementará (§13.2 y §13.3).
>
> Choques originales (histórico):
> - `/datos/*` hoy funciona y es el único sitio donde se mantiene el catálogo metodológico, que además tiene nombre de negocio en la decisión 20. Si es «sin uso», ¿cómo se mantendrá el catálogo?
> - `hasModule`/`requireModule` son código muerto hoy, pero el gating por módulo es necesario para la estructura de §10. Se registran como «muerto hoy, a implementar».

### 11.3 Base de datos sin uso o legacy (44-49)
- **Tablas:** `fluxion.gaps`, `compliance.frameworks`, `compliance.requirements`, `compliance.requirement_control_mappings`, `compliance.failure_mode_causal_relations`, `evidence_controls`, `causal_graph_instances`, `reevaluation_triggers`, `committee_sessions`, `aisia_ai_generations`, `rag.ingestion_jobs`, `rag.organization_*`, `treatment_plans_legacy_20260417` y `treatment_actions_legacy_20260417`.
- **Columnas:** `ai_systems.iso_42001_score` / `iso_42001_checks` (y la pestaña «ISO 42001» de la ficha) y `ai_systems.aiact_obligations`.
- **Tipos y funciones:** el enum `treatment_action_type` y `fluxion.current_organization_id()`.

> **Nota:** varias de estas tablas son la base de funcionalidades que la decisión 58-64 manda implementar: `committee_sessions` (62), `reevaluation_triggers` (63), `aisia_ai_generations` (61) y `rag.organization_*` (64). Hoy no tienen uso, pero se podrían reutilizar.

### 11.4 Herramientas internas, próximas funcionalidades y docs a actualizar
- **Herramientas internas, se documentan como tales (50):** `apps/web/scripts/*` (`apply-metadata`, `check-evidences`, `check-soa-db`, `inspect-profiles`, `seed_causal_relations`, `seed_failure_modes`, `test-soa-insert`).
- **Próximas funcionalidades, se documentan (51, 52):**
  - Refinar mediante IA.
  - Más idiomas.
  - Clasificación automática («Fase 2 Automática»).
  - Recuperación de contraseña (ver 54).
  - Módulos Linaje, AI Gateway, Deriva y equidad, Integración ITSM y Evaluación de calidad.
  - [!] «Modos de fallo · Próximamente» no es una funcionalidad futura: es un placeholder erróneo, porque la página ya existe.
- **Se actualizan en la Fase 2 (53):** `README.md` raíz, `docs/modulos/b2-telemetria-finops.md`, `infra/schedules/README.md` y `recursos/docs/db_inventory_2026-04-28.md`.

### 11.5 Preguntas que siguen abiertas
> **v1.2:** se resolvieron todas salvo la 4. Las respuestas están en §13.

1. Puntos 72 (envío al registro UE: ¿manual o automático?) y 73 (persistencia del avatar): sin respuesta.
2. Los dos choques de §11.2: el mantenimiento del catálogo con `/datos` sin uso, y el gating por módulo.
3. Decisión 27: si la aprobación del plan pasa a Flujos de aprobación, ¿qué pasa en las organizaciones sin ese módulo? ¿El módulo pasa al Core, o hay un flujo mínimo por defecto?
4. Qué rol aprueba en cada nivel (§5.4).
5. Hallazgos de seguridad de §7: sin decisión, incluida la rotación de credenciales.
6. Preguntas de §8 que siguen abiertas: 1 (CLAUDE.md y formato de la documentación), 2 (audiencias), 4 (planes y facturación), 7 (servicios desplegados) y 8 (modelos y proveedores).

## 12. Funcionalidades a implementar (decisiones 54-71)

Se documentan como «pendiente de implementar». No se describen como existentes.

| # | Funcionalidad | Base que ya existe |
|---|---|---|
| 54 | Recuperación de contraseña | Supabase Auth |
| 55 | Política de seguridad de la organización: MFA obligatorio, dominios permitidos, timeout de sesión (planificado) | Campos en `/ajustes > Seguridad` |
| 56 | Bloqueo de acceso a miembros desactivados (`is_active`) | Columna `profiles.is_active` |
| 57 | Selector de organización (usuario en varias organizaciones) | `profiles` UNIQUE(user_id, organization_id) |
| 58 | Facturación y paso de módulos a `enabled` | `billing:manage`, `organizations.plan` |
| 59 | Agente 2: revisión IA de la priorización de modos de fallo | `priority_source = 'agent'` |
| 60 | Agente 3 · Generador de documentos | Plantillas, renderer, idioma y pie de página en Organización |
| 61 | Generación IA en AISIA | `aisia_ai_generations` |
| 62 | Sesiones de comité y actas | `committee_sessions`, plantilla `approval_minutes` |
| 63 | Disparadores de reevaluación del FMEA | `reevaluation_triggers` |
| 64 | RAG por organización (documentos propios del cliente) | `rag.organization_*` (vector 1536, a alinear con 1024) |
| 65 | Ingestor del corpus normativo (utilidad independiente) | Requisitos en `recursos/baseline/rag_corpus.manifest.json` |
| 66 | Emisión de los eventos `evaluation.*`, `gap.*`, `system.created`, `member.*` | Catálogo en `lib/outbox/events.ts` |
| 67 | API pública de lectura (`signals:read`, `inventory:read`) | Scopes definidos |
| 68 | Exportación del inventario y paquetes de auditoría | Snapshots y renders |
| 69 | Notificaciones por email por tipo de evento | Resend integrado |
| 70 | Aviso al aprobador al escalar una revisión de aceptación | TODO `plan/actions.ts:1914` |
| 71 | Aviso de caducidad de evidencias a responsables | `evidence_expiry_alerts` |
| — | Gating real por módulo en páginas, acciones y API (consecuencia de §10; confirmado en v1.2) | `lib/modules/entitlements.ts` |
| 73 | Persistir la imagen del avatar en el perfil (v1.2) | `api/user/upload-avatar/route.ts` (sube pero no guarda la URL) |
| — | Restringir el mantenimiento de `/datos` al administrador (v1.2) | `requireAdmin()` en `(app)/datos/**/actions.ts`, que solo comprueba la sesión |
| — | Flujos de aprobación en el Core: quitar `approvals` de los módulos contratables, mostrarlo siempre en el sidebar e integrar en él la aprobación del plan (v1.3) | `lib/modules/registry.ts`, `app/(app)/layout.tsx` (`showApprovals`), `lib/approvals/*`, aprobación propia del plan |
| — | Catálogo de tablas básicas por organización: cada `org_admin` mantiene el suyo sin afectar a otros clientes (v1.3, §14.1) | Hoy el esquema `compliance` es global, sin `organization_id` |
| — | Copia del catálogo estándar al crear una organización (v1.4, §14.1) | Trigger de alta de organización (`grant_trial_modules` como precedente) |
| — | Oferta de actualizaciones del catálogo estándar al `org_admin`, que las acepta o rechaza (v1.4, §14.1) | Ninguna |
| — | Modelo LLM configurable por organización (v1.2) | Hoy fijo por entorno: `FLUXION_*_MODEL` en agents y `gpt-5.4` en código en SoA |
| — | Configuración de los planes `starter`/`pro`/`enterprise` (v1.2: pendiente de configuración) | `organizations.plan` |

## 13. Respuestas de la revisión v1.2 (2026-10-13)

### 13.1 Puntos 72 y 73
- **72, registro UE (Art. 71):** el envío es **manual**. Fluxion genera la ficha (`/inventario/[id]/eu-registry`) y la organización la presenta. Se documenta así; no hay integración que implementar.
- **73, avatar:** la imagen **debe persistirse**. Hoy no se guarda (§4.4). Pasa a §12.

### 13.2 Catálogo de tablas básicas (`/datos`)
- `/datos` es el **catálogo de tablas básicas** (Catálogo metodológico, decisión 20) y lo **mantiene el administrador**. Se documenta.
- Hoy cualquier usuario autenticado puede modificarlo (§2.6). La restricción al administrador se añade a §12.
- [?] **«Administrador»: ¿`org_admin` o administrador de plataforma Fluxion?** El catálogo está en el esquema `compliance` y lo **comparten todas las organizaciones**: si lo edita el `org_admin` de un cliente, el cambio afecta a todos. Los roles de plataforma (`platform_admin`) son código muerto (decisión 39). Hay que decidir esto antes de documentar quién puede editarlo. → **Resuelto en v1.3 (§14.1):** el `org_admin` de cada cliente.

### 13.3 Gating por módulo
`hasModule`/`requireModule` se implementarán (§12). Hoy son código muerto.

### 13.4 Flujo de aprobación
> ~~Versión light / completa~~: **corregido en v1.3 (§14.2)**.

Flujos de aprobación tendrá una **versión light**, así que **siempre habrá un flujo de aprobación**: el plan de tratamiento y los demás objetos aprobables se aprueban con él aunque la organización no haya contratado el módulo. La versión completa (multinivel, comités, delegaciones, políticas por tipo de objeto) es el módulo. Ver §10.1 y §10.2.
[?] Qué incluye exactamente la versión light frente a la completa. Sigue abierto qué rol aprueba en cada nivel (§5.4).

### 13.5 Seguridad
Los hallazgos de §7 quedan **fuera de consideración** hasta la Fase 2.

### 13.6 Preguntas de §8
| # | Respuesta | Consecuencia |
|---|---|---|
| 1 | No hay `CLAUDE.md`; **hay que generarlo** | Entrada `GEN-00` en `docs/_mapa.md`. Debe incluir la sección «Documentación» con las convenciones de la Fase 2 |
| 2 | Audiencia: **técnicos y comerciales** | `docs/_mapa.md` pasa a dos audiencias (TEC, COM) |
| 4 | Planes **pendientes de configuración** | La documentación de planes queda condicionada; se describen los módulos, no los planes |
| 7 | Desplegados: **renderer, telemetry y shadow-ai** (además de web, agents y connector-mlflow) | §0 actualizado. El README raíz («tres servicios») y la topología de `docs/infra/README.md` deben reflejar los seis |
| 8 | Modelos: los que **configure la organización**; en esta versión, **GPT de OpenAI** | Documentar OpenAI como proveedor actual y la configuración por organización como funcionalidad futura (§12) |

## 14. Respuestas de la revisión v1.3 (2026-10-13)

### 14.1 Catálogo de tablas básicas: lo mantiene el `org_admin`
- Lo mantiene el **`org_admin` de cada cliente**.
- [!] **Consecuencia de modelo de datos:** el catálogo vive hoy en el esquema `compliance`, que es **global**. No tiene `organization_id` y lo comparten todas las organizaciones. Para que cada `org_admin` lo mantenga sin afectar a otros clientes, hace falta un catálogo por organización: copia por tenant, o catálogo base de Fluxion más personalizaciones por organización. Se añade a §12.
- → **Decisión v1.4, modelo del catálogo:**
  1. **Catálogo estándar de Fluxion:** lo mantiene el equipo de Fluxion. Hoy es la semilla `supabase/migrations/00000000000005_seed_compliance.sql` y las migraciones que la amplían.
  2. **Copia por organización:** cada organización nueva parte de una copia del catálogo estándar vigente, y su `org_admin` la adapta sin afectar a otros clientes.
  3. **Actualizaciones:** cuando Fluxion actualiza el catálogo estándar (por ejemplo, nuevos modos de fallo por una guía de la AESIA), las organizaciones existentes **no las reciben automáticamente**. Se les **ofrecen** y el `org_admin` decide si las acepta, para no pisar sus cambios.
- Mientras no se implemente, la documentación (ADM-07) describe el estado objetivo y avisa de que hoy los cambios son globales.

### 14.2 Flujos de aprobación: Core, en todos los planes
- **Corrige la v1.2:** no hay versión light ni completa. Flujos de aprobación es **una sola funcionalidad, siempre disponible en todos los planes**.
- Deja de ser módulo contratable y pasa al **Core** (§10.1). Sigue absorbiendo la aprobación del plan de tratamiento (decisión 27).
- Consecuencias en el código (§12): `approvals` sale de `lib/modules/registry.ts` y la entrada del sidebar deja de ser condicional.

### 14.3 Niveles de aprobación: pendientes de definir
Los niveles (Responsable, Comité, Dirección) y el rol que aprueba en cada uno están **pendientes de definir**. La documentación describe cómo el código asigna el nivel según la zona (§5.4) y marca la asignación de aprobadores como pendiente.
