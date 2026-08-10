-- ============================================================================
-- FLUXION — Repriorización v3 de modos de fallo activados
-- ============================================================================
--
-- Ajustes v3:
--   - critical sube de >=70 a >=75
--   - S_default <= 6 no entra por la vía high+sensible
--   - high+sensible se restringe:
--       * seguridad / tecnica: sí
--       * etica / legal_b: solo con señal humana fuerte
--       * gobernanza: no entra por high salvo casos estructuralmente severos
--   - se mantiene:
--       * overrides duros
--       * cuota blanda min(80, ceil(activados * 0.25))
--       * cuota no expulsa overrides ni critical

CREATE OR REPLACE FUNCTION fluxion.calculate_failure_mode_priority(
  p_s_default smallint,
  p_dimension text,
  p_w numeric,
  p_aiact_risk_level text,
  p_affects_persons boolean,
  p_has_minors boolean,
  p_vulnerable_groups boolean,
  p_biometric boolean,
  p_domain text,
  p_critical_infra boolean,
  p_is_gpai boolean,
  p_output_type text,
  p_ai_system_type text,
  p_has_external_tools boolean
)
RETURNS TABLE (
  score smallint,
  level text,
  status fluxion.priority_status
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_dimension text := lower(coalesce(p_dimension, ''));
  v_domain text := lower(coalesce(p_domain, ''));
  v_output_type text := lower(coalesce(p_output_type, ''));
  v_ai_system_type text := lower(coalesce(p_ai_system_type, ''));
  v_aiact_level text := lower(coalesce(p_aiact_risk_level, ''));
  v_severity_score int := 0;
  v_dimension_score int := 0;
  v_signal_sum int := 0;
  v_signal_score int := 0;
  v_base numeric := 0;
  v_final numeric := 0;
  v_level text;
  v_status fluxion.priority_status;
  v_hard_override boolean := false;
  v_has_sensitive_signal boolean := false;
  v_has_strong_human_signal boolean := false;
  v_is_generative boolean := false;
  v_is_high_candidate boolean := false;
BEGIN
  v_severity_score := CASE p_s_default
    WHEN 9 THEN 40
    WHEN 8 THEN 32
    WHEN 7 THEN 24
    WHEN 6 THEN 16
    WHEN 5 THEN 10
    WHEN 4 THEN 6
    ELSE 2
  END;

  v_dimension_score := CASE v_dimension
    WHEN 'seguridad' THEN 15
    WHEN 'legal_b' THEN 14
    WHEN 'etica' THEN 13
    WHEN 'tecnica' THEN 12
    WHEN 'gobernanza' THEN 10
    WHEN 'roi' THEN 4
    ELSE 8
  END;

  v_signal_sum := v_signal_sum + CASE v_aiact_level
    WHEN 'prohibited' THEN 15
    WHEN 'high' THEN 12
    WHEN 'limited' THEN 6
    ELSE 0
  END;

  IF coalesce(p_affects_persons, false) THEN v_signal_sum := v_signal_sum + 5; END IF;
  IF coalesce(p_has_minors, false) THEN v_signal_sum := v_signal_sum + 6; END IF;
  IF coalesce(p_vulnerable_groups, false) THEN v_signal_sum := v_signal_sum + 5; END IF;
  IF coalesce(p_biometric, false) THEN v_signal_sum := v_signal_sum + 6; END IF;

  IF v_domain IN ('salud', 'medicina', 'salud y medicina', 'finanzas', 'banca', 'banca y finanzas', 'seguros', 'credito') THEN
    v_signal_sum := v_signal_sum + 6;
  ELSIF v_domain IN ('sector_publico', 'sector publico', 'sector público', 'gobierno', 'gobierno y sector publico', 'gobierno y sector público', 'seguridad', 'justicia', 'migracion') THEN
    v_signal_sum := v_signal_sum + 5;
  END IF;

  IF coalesce(p_critical_infra, false) THEN v_signal_sum := v_signal_sum + 6; END IF;

  v_is_generative := coalesce(p_is_gpai, false) OR v_output_type = 'generacion';
  IF v_is_generative THEN v_signal_sum := v_signal_sum + 4; END IF;

  IF v_ai_system_type = 'agentico' OR coalesce(p_has_external_tools, false) THEN
    v_signal_sum := v_signal_sum + 4;
  END IF;

  v_signal_score := least(25, v_signal_sum);
  v_base := v_severity_score + v_dimension_score + v_signal_score;
  v_final := least(100, round(v_base * (0.75 + coalesce(p_w, 1.0) / 4.0)));

  v_level := CASE
    WHEN v_final >= 75 THEN 'critical'
    WHEN v_final >= 50 THEN 'high'
    WHEN v_final >= 30 THEN 'medium'
    ELSE 'low'
  END;

  v_has_sensitive_signal := (
    coalesce(p_affects_persons, false)
    OR coalesce(p_has_minors, false)
    OR coalesce(p_vulnerable_groups, false)
    OR coalesce(p_biometric, false)
    OR v_aiact_level IN ('high', 'prohibited')
  );

  v_has_strong_human_signal := (
    coalesce(p_affects_persons, false)
    OR coalesce(p_has_minors, false)
    OR coalesce(p_vulnerable_groups, false)
    OR coalesce(p_biometric, false)
  );

  v_hard_override := (
    p_s_default >= 8
    OR (coalesce(p_biometric, false) AND coalesce(p_affects_persons, false))
    OR (coalesce(p_has_minors, false) AND v_dimension IN ('etica', 'legal_b', 'seguridad'))
    OR (coalesce(p_vulnerable_groups, false) AND v_dimension IN ('etica', 'legal_b', 'seguridad'))
    OR (v_aiact_level IN ('high', 'prohibited') AND v_dimension IN ('legal_b', 'seguridad', 'etica'))
  );

  v_is_high_candidate := (
    p_s_default >= 7
    AND v_level = 'high'
    AND (
      v_dimension IN ('seguridad', 'tecnica')
      OR (v_dimension IN ('legal_b', 'etica') AND v_has_strong_human_signal)
    )
    AND v_dimension <> 'roi'
  );

  IF v_hard_override OR v_level = 'critical' OR v_is_high_candidate THEN
    v_status := 'prioritized';
  ELSE
    v_status := 'monitoring';
  END IF;

  RETURN QUERY
  SELECT v_final::smallint, v_level, v_status;
END;
$$;

WITH scored AS (
  SELECT
    sfm.id,
    sfm.ai_system_id,
    fm.code,
    fm.s_default,
    fm.dimension_id::text AS dimension_id,
    sys.aiact_risk_level::text AS aiact_risk_level,
    sys.affects_persons,
    sys.involves_minors,
    sys.vulnerable_groups,
    sys.uses_biometric_data,
    calculated.score,
    calculated.level,
    calculated.status AS preliminary_status,
    (
      fm.s_default >= 8
      OR (coalesce(sys.uses_biometric_data, false) AND coalesce(sys.affects_persons, false))
      OR (coalesce(sys.involves_minors, false) AND fm.dimension_id::text IN ('etica', 'legal_b', 'seguridad'))
      OR (coalesce(sys.vulnerable_groups, false) AND fm.dimension_id::text IN ('etica', 'legal_b', 'seguridad'))
      OR (sys.aiact_risk_level::text IN ('high', 'prohibited') AND fm.dimension_id::text IN ('legal_b', 'seguridad', 'etica'))
    ) AS always_in
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
),
quotas AS (
  SELECT
    ai_system_id,
    count(*)::int AS activated_count,
    least(80, ceil(count(*)::numeric * 0.25)::int) AS soft_quota
  FROM scored
  GROUP BY ai_system_id
),
always_in_counts AS (
  SELECT
    ai_system_id,
    count(*)::int AS always_in_count
  FROM scored
  WHERE always_in = true OR level = 'critical'
  GROUP BY ai_system_id
),
ranked_high AS (
  SELECT
    scored.*,
    row_number() OVER (
      PARTITION BY scored.ai_system_id
      ORDER BY scored.score DESC, scored.code ASC
    ) AS high_rank
  FROM scored
  WHERE scored.preliminary_status = 'prioritized'
    AND scored.always_in = false
    AND scored.level = 'high'
),
final_statuses AS (
  SELECT
    scored.id,
    scored.score,
    scored.level,
    CASE
      WHEN scored.always_in OR scored.level = 'critical' THEN 'prioritized'::fluxion.priority_status
      WHEN scored.preliminary_status = 'prioritized'
        AND ranked_high.high_rank IS NOT NULL
        AND ranked_high.high_rank <= greatest(0, quotas.soft_quota - coalesce(always_in_counts.always_in_count, 0))
      THEN 'prioritized'::fluxion.priority_status
      ELSE 'monitoring'::fluxion.priority_status
    END AS final_status
  FROM scored
  JOIN quotas
    ON quotas.ai_system_id = scored.ai_system_id
  LEFT JOIN always_in_counts
    ON always_in_counts.ai_system_id = scored.ai_system_id
  LEFT JOIN ranked_high
    ON ranked_high.id = scored.id
)
UPDATE fluxion.system_failure_modes sfm
SET
  priority_status = final_statuses.final_status,
  priority_source = 'rules',
  priority_score = final_statuses.score,
  priority_level = final_statuses.level,
  priority_notes = CASE
    WHEN final_statuses.final_status = 'prioritized'
      THEN 'Prioridad recalculada por reglas v3: entra en la cola prioritaria de revisión.'
    ELSE 'Prioridad recalculada por reglas v3: queda en observación para este ciclo.'
  END,
  priority_changed_at = now()
FROM final_statuses
WHERE sfm.id = final_statuses.id;
