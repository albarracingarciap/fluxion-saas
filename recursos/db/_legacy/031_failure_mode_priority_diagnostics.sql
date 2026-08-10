-- ============================================================================
-- FLUXION — Vistas de diagnóstico para priorización de modos de fallo
-- ============================================================================
--
-- Objetivo:
--   Entender de dónde salen los modos `prioritized` tras la v2:
--   - por override duro
--   - por critical
--   - por high + señal sensible / dimensión operativa
--   - por dimensión
--   - por familia de activación
--   - por rango de S_default
--
-- Uso recomendado:
--   1. Consultar `fluxion.failure_mode_priority_diagnostic_detail`
--   2. Agregar después por dimensión, familia o motivo de entrada
--
-- Ejemplos:
--   SELECT priority_entry_reason, count(*)
--   FROM fluxion.failure_mode_priority_diagnostic_detail
--   WHERE ai_system_id = '...'
--     AND priority_status = 'prioritized'
--   GROUP BY 1
--   ORDER BY 2 DESC;
--
--   SELECT dimension_id, count(*)
--   FROM fluxion.failure_mode_priority_diagnostic_detail
--   WHERE ai_system_id = '...'
--     AND priority_status = 'prioritized'
--   GROUP BY 1
--   ORDER BY 2 DESC;
--
--   SELECT family_label, count(*)
--   FROM fluxion.failure_mode_priority_diagnostic_families
--   WHERE ai_system_id = '...'
--     AND priority_status = 'prioritized'
--   GROUP BY 1
--   ORDER BY 2 DESC;

DROP VIEW IF EXISTS fluxion.failure_mode_priority_diagnostic_families;
DROP VIEW IF EXISTS fluxion.failure_mode_priority_diagnostic_summary;
DROP VIEW IF EXISTS fluxion.failure_mode_priority_diagnostic_detail;

CREATE VIEW fluxion.failure_mode_priority_diagnostic_detail AS
WITH base AS (
  SELECT
    sfm.id,
    sfm.organization_id,
    sfm.ai_system_id,
    sys.name AS system_name,
    fm.id AS failure_mode_id,
    fm.code,
    fm.name,
    fm.dimension_id::text AS dimension_id,
    fm.bloque,
    fm.subcategoria,
    fm.s_default,
    fm.w_calculated,
    sfm.priority_status,
    sfm.priority_source,
    sfm.priority_score,
    sfm.priority_level,
    sfm.priority_notes,
    sfm.activation_family_ids,
    sfm.activation_family_labels,
    sys.aiact_risk_level::text AS aiact_risk_level,
    sys.domain::text AS domain,
    sys.output_type::text AS output_type,
    sys.ai_system_type::text AS ai_system_type,
    sys.affects_persons,
    sys.involves_minors,
    sys.vulnerable_groups,
    sys.uses_biometric_data,
    sys.manages_critical_infra,
    sys.is_gpai,
    sys.has_external_tools,
    (
      coalesce(sys.affects_persons, false)
      OR coalesce(sys.involves_minors, false)
      OR coalesce(sys.vulnerable_groups, false)
      OR coalesce(sys.uses_biometric_data, false)
      OR sys.aiact_risk_level::text IN ('high', 'prohibited')
    ) AS has_sensitive_signal,
    (
      fm.s_default >= 8
      OR (coalesce(sys.uses_biometric_data, false) AND coalesce(sys.affects_persons, false))
      OR (coalesce(sys.involves_minors, false) AND fm.dimension_id::text IN ('etica', 'legal_b', 'seguridad'))
      OR (coalesce(sys.vulnerable_groups, false) AND fm.dimension_id::text IN ('etica', 'legal_b', 'seguridad'))
      OR (sys.aiact_risk_level::text IN ('high', 'prohibited') AND fm.dimension_id::text IN ('legal_b', 'seguridad', 'etica'))
    ) AS hard_override
  FROM fluxion.system_failure_modes sfm
  JOIN fluxion.ai_systems sys
    ON sys.id = sfm.ai_system_id
   AND sys.organization_id = sfm.organization_id
  JOIN compliance.failure_modes fm
    ON fm.id = sfm.failure_mode_id
)
SELECT
  base.*,
  CASE
    WHEN s_default >= 8 THEN 'override_s_default_gte_8'
    WHEN uses_biometric_data = true AND affects_persons = true THEN 'override_biometric_plus_people'
    WHEN involves_minors = true AND dimension_id IN ('etica', 'legal_b', 'seguridad') THEN 'override_minors_sensitive_dimension'
    WHEN vulnerable_groups = true AND dimension_id IN ('etica', 'legal_b', 'seguridad') THEN 'override_vulnerable_sensitive_dimension'
    WHEN aiact_risk_level IN ('high', 'prohibited') AND dimension_id IN ('legal_b', 'seguridad', 'etica') THEN 'override_aiact_sensitive_dimension'
    WHEN priority_level = 'critical' THEN 'critical'
    WHEN priority_level = 'high' AND priority_status = 'prioritized' THEN 'high_promoted'
    WHEN priority_status = 'monitoring' AND priority_level = 'high' THEN 'high_demoted_by_quota_or_rules'
    ELSE 'monitoring_non_priority'
  END AS priority_entry_reason,
  CASE
    WHEN s_default >= 8 THEN 's_ge_8'
    WHEN s_default = 7 THEN 's_7'
    WHEN s_default = 6 THEN 's_6'
    WHEN s_default = 5 THEN 's_5'
    ELSE 's_le_4'
  END AS s_default_bucket
FROM base;

CREATE VIEW fluxion.failure_mode_priority_diagnostic_summary AS
SELECT
  organization_id,
  ai_system_id,
  system_name,
  count(*) AS activated_count,
  count(*) FILTER (WHERE priority_status = 'prioritized') AS prioritized_count,
  count(*) FILTER (WHERE priority_status = 'monitoring') AS monitoring_count,
  count(*) FILTER (WHERE priority_status = 'dismissed') AS dismissed_count,
  count(*) FILTER (WHERE hard_override) AS hard_override_count,
  count(*) FILTER (WHERE priority_level = 'critical') AS critical_count,
  count(*) FILTER (WHERE priority_level = 'high') AS high_count,
  count(*) FILTER (WHERE priority_status = 'prioritized' AND priority_level = 'high') AS prioritized_high_count,
  count(*) FILTER (WHERE priority_status = 'prioritized' AND dimension_id = 'seguridad') AS prioritized_security_count,
  count(*) FILTER (WHERE priority_status = 'prioritized' AND dimension_id = 'tecnica') AS prioritized_technical_count,
  count(*) FILTER (WHERE priority_status = 'prioritized' AND dimension_id = 'legal_b') AS prioritized_legal_count,
  count(*) FILTER (WHERE priority_status = 'prioritized' AND dimension_id = 'etica') AS prioritized_ethical_count,
  count(*) FILTER (WHERE priority_status = 'prioritized' AND dimension_id = 'gobernanza') AS prioritized_governance_count,
  count(*) FILTER (WHERE priority_status = 'prioritized' AND dimension_id = 'roi') AS prioritized_roi_count
FROM fluxion.failure_mode_priority_diagnostic_detail
GROUP BY 1, 2, 3;

CREATE VIEW fluxion.failure_mode_priority_diagnostic_families AS
SELECT
  detail.organization_id,
  detail.ai_system_id,
  detail.system_name,
  detail.id AS system_failure_mode_id,
  detail.failure_mode_id,
  detail.code,
  detail.name,
  detail.dimension_id,
  detail.s_default,
  detail.priority_status,
  detail.priority_level,
  detail.priority_score,
  family.family_id,
  family.family_label
FROM fluxion.failure_mode_priority_diagnostic_detail detail
CROSS JOIN LATERAL unnest(
  detail.activation_family_ids,
  detail.activation_family_labels
) AS family(family_id, family_label);
