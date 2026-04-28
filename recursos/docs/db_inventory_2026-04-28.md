# Inventario de Base de Datos — Feature ISO 42001 / AISIA
**Fecha:** 2026-04-28  
**Rama:** `feat/ai-system-iso42001`  
**Propósito:** Fase 0 — estado real de la BD antes de escribir ninguna migración

---

## 1. Schemas activos

| Schema | Uso |
|--------|-----|
| `fluxion` | Core: sistemas, perfiles, historial, SoA, FMEA, tratamiento |
| `compliance` | Frameworks, plantillas de control (mayoría vacío) |
| `rag` | Búsqueda semántica — **no tocar** |

---

## 2. Patrón RLS — CRÍTICO

`fluxion.profiles` tiene dos UUIDs:
- `profiles.id` → UUID interno del perfil
- `profiles.user_id` → UUID de Supabase Auth (`auth.uid()`)

**Todas las políticas RLS nuevas (tablas AISIA) deben usar:**

```sql
-- Lectura / escritura: cualquier miembro de la org
organization_id IN (
  SELECT organization_id FROM fluxion.profiles
  WHERE user_id = auth.uid()
)

-- Operaciones admin (DELETE): filtrar por role
EXISTS (
  SELECT 1 FROM fluxion.profiles
  WHERE user_id = auth.uid()
    AND organization_id = <tabla>.organization_id
    AND role IN ('org_admin', 'sgai_manager', 'caio')
)
```

> ⚠️ `fluxion.organization_members` NO existe (eliminada en migración 039). Nunca referenciarla.
> ⚠️ Error habitual: usar `WHERE id = auth.uid()` — falla silenciosamente.

---

## 3. Campos ISO legacy en `fluxion.ai_systems` (deprecar en Fase 1)

| Campo | Tipo | Nota |
|-------|------|------|
| `iso_42001_score` | `smallint` | Score 0-10 calculado |
| `iso_42001_updated_at` | `timestamptz` | Última recalculación |
| `iso_42001_checks` | `jsonb NOT NULL DEFAULT '[]'` | Array de checks individuales |

Escritos por `calcISO()` / `buildIsoChecksSnapshot()` en `lib/ai-systems/scoring.ts`.

**Plan:** Mantener columnas (compatibilidad hacia atrás), dejar de escribirlas. El nuevo UI leerá de `aisia_assessments`.

---

## 4. Campos disponibles para pre-fill AISIA (desde `fluxion.ai_systems`)

### Sección S1 — Descripción del sistema
- `name`, `description`, `technical_description`
- `intended_use`, `prohibited_uses`
- `ai_system_type`, `base_model`, `external_model`, `external_provider`
- `output_type`, `fully_automated`, `interacts_persons`
- `target_users[]`, `geo_scope[]`, `usage_scale`
- `deployed_at`, `version`

### Sección S2 — Datos
- `processes_personal_data`, `data_categories[]`, `special_categories[]`
- `legal_bases[]`, `data_sources[]`, `dpia_completed`
- `training_data_doc`, `data_volume`, `data_retention`

### Gobernanza
- `ai_owner`, `responsible_team`, `tech_lead`, `executive_sponsor`
- `dpo_involved`, `has_sla`, `review_frequency`

---

## 5. Módulo SoA existente (NO recrear)

### Tablas
| Tabla | Descripción |
|-------|-------------|
| `organization_soa_controls` | Un registro por control por org. `control_code` TEXT (ej. `"A.5.2"`), `is_applicable` BOOLEAN, `status` TEXT |
| `organization_soa_system_links` | M:N entre controls y sistemas. Campos: `organization_id`, `control_code`, `ai_system_id`, `linked_by`, `linked_at` |
| `organization_soa_metadata` | 1 fila por org: título SoA, versión, aprobador |
| `soa_controls_log` | Audit trail de cambios en controles |

### Status values en `organization_soa_controls.status`
| Valor | Label UI | Tono |
|-------|----------|------|
| `not_started` | "No iniciado" | neutral (default) |
| `in_progress` | "En progreso" | amber |
| `implemented` | "Implantado" | green |

Campo separado `is_applicable` (boolean) indica si el control aplica a la org.

### Catálogo estático
`lib/templates/iso42001-catalog.ts` — 38 controles Annex A (A.2.2 → A.10.4) en 9 grupos.  
`lib/templates/data.ts` — `buildSoAData(organizationId)` lee y fusiona con catálogo.

---

## 6. `fluxion.ai_system_history` — Tipos de evento

**Estructura:** `id`, `ai_system_id`, `organization_id`, `event_type TEXT`, `event_title`, `event_summary`, `payload JSONB`, `actor_user_id`, `created_at`

### Eventos existentes (no colisionar)
| event_type | n |
|-----------|---|
| `obligation_excluded` | 9 |
| `obligations_accepted` | 7 |
| `classification_reviewed` | 3 |
| `iso_recalculated` | 2 | ← deprecated con AISIA |
| `classification_recalculated` | 2 |
| `system_updated` | 1 |
| `system_created` | 1 |

### Nuevos eventos AISIA (a registrar)
- `aisia_created`
- `aisia_submitted`
- `aisia_approved`
- `aisia_rejected`
- `aisia_section_updated` *(opcional, granular)*

---

## 7. Tablas FMEA/Tratamiento (links para AISIA S3/S4)

### `fluxion.system_failure_modes`
Campos clave: `id`, `ai_system_id`, `organization_id`, `failure_mode_id`, `dimension_id`, `activation_source`, `priority_status`, `priority_level`  
→ **AISIA S3** almacena array de `system_failure_modes.id` en JSONB

### `fluxion.fmea_items`
Campos clave: `id`, `evaluation_id`, `failure_mode_id`, `s_default_frozen`, `o_value`, `d_real_value`, `s_actual`, `s_residual`, `narrative_justification`, `status`  
→ Detalle de scoring por item; referenciado por treatment_actions

### `fluxion.treatment_actions`
Campos clave: `id`, `plan_id`, `fmea_item_id`, `option`, `status`, `control_id`, `owner_id`, `due_date`, `evidence_id`  
→ Acciones individuales de tratamiento

### `fluxion.treatment_plans`
Campos clave: `id`, `system_id`, `evaluation_id`, `code`, `status`, `zone_at_creation`, `approval_level`, `approver_id`, `created_by`  
→ **AISIA S4** almacena array de `treatment_plans.id` en JSONB  
⚠️ FK a `ai_systems` con `NO ACTION` (no cascadea — precaución al borrar sistemas)

---

## 8. Triggers existentes

Todos los triggers son `updated_at` BEFORE UPDATE, salvo:
- `trg_session_number` — auto-numera sesiones de comité
- `trg_action_updates_plan` — AFTER INSERT/UPDATE en `treatment_actions`, actualiza contadores en el plan
- `trg_complete_action` — BEFORE UPDATE en `treatment_actions`, lógica de negocio

**No hay triggers ISO/AISIA existentes.** Las nuevas tablas necesitan:
```sql
trg_aisia_assessments_updated_at   -- BEFORE UPDATE
trg_aisia_sections_updated_at      -- BEFORE UPDATE
trg_aisia_ai_generations_updated_at -- BEFORE UPDATE
```

---

## 9. FKs sobre `fluxion.ai_systems` (17 tablas)

| Tabla | Columna | Delete rule |
|-------|---------|-------------|
| `ai_system_history` | `ai_system_id` | CASCADE |
| `classification_events` | `ai_system_id` | CASCADE |
| `classification_diffs` | `ai_system_id` | CASCADE |
| `system_failure_modes` | `ai_system_id` | CASCADE |
| `fmea_evaluations` | `system_id` | CASCADE |
| `organization_soa_system_links` | `ai_system_id` | CASCADE |
| `system_evidences` | `ai_system_id` | CASCADE |
| `controls` | `system_id` | CASCADE |
| `gaps` | `system_id` | CASCADE |
| `system_obligations` | `ai_system_id` | CASCADE |
| `profile_systems` | `ai_system_id` | CASCADE |
| `reevaluation_triggers` | `system_id` | CASCADE |
| `system_report_snapshots` | `ai_system_id` | CASCADE |
| `ai_system_classification_reviews` | `ai_system_id` | CASCADE |
| `agent_sessions` | `system_id` | SET NULL |
| `treatment_plans` | `system_id` | **NO ACTION** ⚠️ |
| `assistant_conversations` | `context_system` | **NO ACTION** ⚠️ |

→ **`aisia_assessments`** usará `CASCADE DELETE` en `ai_system_id`.

---

## 10. Compliance schema — Estado real

| Tabla | Filas | Notas |
|-------|-------|-------|
| `compliance.frameworks` | **0** | Vacío — arquitectura no usada |
| `compliance.requirements` | 0 | — |
| `compliance.control_templates` | **59** | CTL-001..CTL-059, controles genéricos multi-framework |
| `compliance.requirement_control_mappings` | 0 | — |

Las 59 `control_templates` no son controles Annex A (usan código `CTL-xxx`). No se usarán para AISIA.  
Las nuevas tablas AISIA irán en schema `fluxion` (mismo patrón que el resto del módulo).

---

## 11. Decisiones arquitectónicas confirmadas

| # | Decisión | Elección |
|---|----------|----------|
| 1 | Tabla de controles por sistema | **No crear** — usar SoA existente + `organization_soa_system_links` |
| 2 | Tablas nuevas | **3 únicamente**: `aisia_assessments`, `aisia_sections`, `aisia_ai_generations` |
| 3 | Tab ISO 42001 en sistema | **Opción A** — vista filtrada del SoA org, edición modifica SoA org |
| 4 | Edición desde pestaña de sistema | **Opción 2a** — modifica el registro org-level directamente |
| 5 | Satisfacción controles A.5.x | **Todos** los sistemas vinculados deben tener AISIA aprobada |
| 6 | Schema para tablas AISIA | **fluxion** (no compliance) |
| 7 | RLS | `organization_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())` |

---

## 12. Próximos pasos (plan de fases)

| Fase | Contenido | Migraciones |
|------|-----------|-------------|
| **1** | Archivar datos legacy ISO, crear función `updated_at` reutilizable | `056_archive_legacy_iso.sql` |
| **2** | Empty state + botón init AISIA en pestaña ISO | Solo código UI |
| **3** | Wizard de inicio AISIA (6 secciones, pre-fill) | `057_aisia_tables.sql` |
| **4** | Crear tablas AISIA con RLS y triggers | incluido en `057` |
| **5** | Flujo de aprobación AISIA + eventos historial | Solo código |
| **6** | Vista controles Annex A en pestaña sistema + link SoA | Solo código |
| **7** | Automatismos: A.5.x → state de SoA org | Solo código |
