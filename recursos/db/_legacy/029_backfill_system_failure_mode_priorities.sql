-- ============================================================================
-- FLUXION — Backfill de priorización para modos de fallo ya activados
-- ============================================================================
--
-- Objetivo:
--   Recalcular priority_score, priority_level y priority_status para todos los
--   registros existentes en fluxion.system_failure_modes usando la función
--   fluxion.calculate_failure_mode_priority introducida en 028.
--
-- Resultado esperado:
--   - Los modos activados históricamente dejan de quedarse en pending_review
--   - priority_source pasa a rules
--   - priority_notes deja trazado que el valor vino del backfill
--   - FMEA podrá sembrarse desde prioritized también en sistemas antiguos

WITH priority_recalculation AS (
  SELECT
    sfm.id,
    calculated.score,
    calculated.level,
    calculated.status
  FROM fluxion.system_failure_modes sfm
  JOIN fluxion.ai_systems sys
    ON sys.id = sfm.ai_system_id
   AND sys.organization_id = sfm.organization_id
  JOIN compliance.failure_modes fm
    ON fm.id = sfm.failure_mode_id
  CROSS JOIN LATERAL fluxion.calculate_failure_mode_priority(
    fm.s_default::smallint,
    fm.dimension_id::text,
    fm.w_calculated,
    sys.aiact_risk_level::text,
    sys.affects_persons,
    sys.involves_minors,
    sys.vulnerable_groups,
    sys.uses_biometric_data,
    sys.domain::text,
    sys.manages_critical_infra,
    sys.is_gpai,
    sys.output_type::text,
    sys.ai_system_type::text,
    sys.has_external_tools
  ) AS calculated
)
UPDATE fluxion.system_failure_modes sfm
SET
  priority_status = priority_recalculation.status,
  priority_source = 'rules',
  priority_score = priority_recalculation.score,
  priority_level = priority_recalculation.level,
  priority_notes = 'Prioridad recalculada por backfill a partir del motor determinista v1.',
  priority_changed_at = now()
FROM priority_recalculation
WHERE sfm.id = priority_recalculation.id;

COMMENT ON TABLE fluxion.system_failure_modes IS
  'Subset persistido de modos de fallo del catálogo compliance activados para un sistema concreto, con capa adicional de priorización operativa.';
