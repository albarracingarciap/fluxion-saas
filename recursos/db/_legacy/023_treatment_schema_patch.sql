-- ============================================================================
-- FLUXION — Patch sobre 021_treatment_schema
-- Ajustes para alinear el schema de treatment plans con el modelo real del repo
-- ============================================================================

-- --------------------------------------------------------------------------
-- Permisos base
-- --------------------------------------------------------------------------

GRANT USAGE ON SCHEMA fluxion TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fluxion.treatment_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fluxion.treatment_actions TO authenticated;

-- --------------------------------------------------------------------------
-- Policies
-- 021 usa fluxion.current_organization_id(), que no forma parte del patrón
-- actual del proyecto. Sustituimos por organization_members.
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "org_isolation" ON fluxion.treatment_plans;
DROP POLICY IF EXISTS "org_isolation" ON fluxion.treatment_actions;

DROP POLICY IF EXISTS "treatment_plans_select" ON fluxion.treatment_plans;
CREATE POLICY "treatment_plans_select"
  ON fluxion.treatment_plans FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "treatment_plans_insert" ON fluxion.treatment_plans;
CREATE POLICY "treatment_plans_insert"
  ON fluxion.treatment_plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.treatment_plans.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "treatment_plans_update" ON fluxion.treatment_plans;
CREATE POLICY "treatment_plans_update"
  ON fluxion.treatment_plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.treatment_plans.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "treatment_plans_delete" ON fluxion.treatment_plans;
CREATE POLICY "treatment_plans_delete"
  ON fluxion.treatment_plans FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.treatment_plans.organization_id
        AND role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "treatment_actions_select" ON fluxion.treatment_actions;
CREATE POLICY "treatment_actions_select"
  ON fluxion.treatment_actions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "treatment_actions_insert" ON fluxion.treatment_actions;
CREATE POLICY "treatment_actions_insert"
  ON fluxion.treatment_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.treatment_actions.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "treatment_actions_update" ON fluxion.treatment_actions;
CREATE POLICY "treatment_actions_update"
  ON fluxion.treatment_actions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.treatment_actions.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "treatment_actions_delete" ON fluxion.treatment_actions;
CREATE POLICY "treatment_actions_delete"
  ON fluxion.treatment_actions FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.treatment_actions.organization_id
        AND role IN ('admin', 'editor')
    )
  );

-- --------------------------------------------------------------------------
-- treatment_actions: permitir creación automática antes de decidir opción
-- --------------------------------------------------------------------------

ALTER TABLE fluxion.treatment_actions
  ALTER COLUMN option DROP NOT NULL;

ALTER TABLE fluxion.treatment_actions
  DROP CONSTRAINT IF EXISTS chk_s_residual_valid,
  DROP CONSTRAINT IF EXISTS chk_aceptar_not_zona_i,
  DROP CONSTRAINT IF EXISTS chk_aceptar_requires_justification,
  DROP CONSTRAINT IF EXISTS chk_control_coherence;

ALTER TABLE fluxion.treatment_actions
  ADD CONSTRAINT chk_ta_option_required_outside_pending
  CHECK (
    status = 'pending'
    OR option IS NOT NULL
  ),
  ADD CONSTRAINT chk_s_residual_valid
  CHECK (
    option IS NULL
    OR option != 'mitigar'
    OR (
      s_residual_target IS NOT NULL
      AND s_residual_target >= 1
      AND s_residual_target < s_actual_at_creation
    )
  ),
  ADD CONSTRAINT chk_aceptar_not_zona_i
  CHECK (
    option IS NULL
    OR NOT (option = 'aceptar' AND s_actual_at_creation = 9)
  ),
  ADD CONSTRAINT chk_aceptar_requires_justification
  CHECK (
    option IS NULL
    OR option != 'aceptar'
    OR (justification IS NOT NULL AND length(justification) >= 100)
  ),
  ADD CONSTRAINT chk_control_coherence
  CHECK (
    option = 'mitigar'
    OR control_id IS NULL
  );

COMMENT ON COLUMN fluxion.treatment_actions.option IS
  'Puede ser NULL mientras la acción está pendiente de decisión. Una vez definida, toma una de las cinco opciones de tratamiento.';

-- --------------------------------------------------------------------------
-- Función de zona proyectada: corregir joins y dimensiones reales
-- 021 referenciaba fi.dimension, pero la dimensión vive en compliance.failure_modes.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fluxion.recalculate_plan_zone_target(p_plan_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ai_act_floor  text;
  v_zone_fmea     text := 'zona_iv';
  v_s_max         smallint := 0;
  v_ge8_count     int := 0;
  v_ge8_dims      int := 0;
  v_ge7_count     int := 0;
  v_ge7_dims      int := 0;
  v_ge6_count     int := 0;
  v_ge6_dims      int := 0;
BEGIN
  SELECT ai_act_floor
  INTO v_ai_act_floor
  FROM fluxion.treatment_plans
  WHERE id = p_plan_id;

  SELECT COALESCE(MAX(projected.s_proj), 0)
  INTO v_s_max
  FROM (
    SELECT COALESCE(
      CASE WHEN ta.option = 'mitigar' THEN ta.s_residual_target END,
      ta.s_actual_at_creation
    ) AS s_proj
    FROM fluxion.treatment_actions ta
    WHERE ta.plan_id = p_plan_id
  ) projected;

  SELECT COUNT(*), COUNT(DISTINCT fm.dimension_id)
  INTO v_ge8_count, v_ge8_dims
  FROM fluxion.treatment_actions ta
  JOIN fluxion.fmea_items fi ON fi.id = ta.fmea_item_id
  JOIN compliance.failure_modes fm ON fm.id = fi.failure_mode_id
  WHERE ta.plan_id = p_plan_id
    AND COALESCE(CASE WHEN ta.option = 'mitigar' THEN ta.s_residual_target END, ta.s_actual_at_creation) >= 8;

  SELECT COUNT(*), COUNT(DISTINCT fm.dimension_id)
  INTO v_ge7_count, v_ge7_dims
  FROM fluxion.treatment_actions ta
  JOIN fluxion.fmea_items fi ON fi.id = ta.fmea_item_id
  JOIN compliance.failure_modes fm ON fm.id = fi.failure_mode_id
  WHERE ta.plan_id = p_plan_id
    AND COALESCE(CASE WHEN ta.option = 'mitigar' THEN ta.s_residual_target END, ta.s_actual_at_creation) >= 7;

  SELECT COUNT(*), COUNT(DISTINCT fm.dimension_id)
  INTO v_ge6_count, v_ge6_dims
  FROM fluxion.treatment_actions ta
  JOIN fluxion.fmea_items fi ON fi.id = ta.fmea_item_id
  JOIN compliance.failure_modes fm ON fm.id = fi.failure_mode_id
  WHERE ta.plan_id = p_plan_id
    AND COALESCE(CASE WHEN ta.option = 'mitigar' THEN ta.s_residual_target END, ta.s_actual_at_creation) >= 6;

  IF    v_s_max >= 9 THEN v_zone_fmea := 'zona_i';
  ELSIF v_s_max >= 8 THEN v_zone_fmea := 'zona_ii';
  ELSIF v_s_max >= 7 THEN v_zone_fmea := 'zona_iii';
  ELSE                    v_zone_fmea := 'zona_iv';
  END IF;

  IF v_ge8_count >= 3 AND v_ge8_dims >= 2 AND v_zone_fmea = 'zona_iv' THEN
    v_zone_fmea := 'zona_i';
  ELSIF v_ge7_count >= 5 AND v_ge7_dims >= 3 AND v_zone_fmea IN ('zona_iv','zona_iii') THEN
    v_zone_fmea := 'zona_ii';
  ELSIF v_ge6_count >= 8 AND v_ge6_dims >= 2 AND v_zone_fmea = 'zona_iv' THEN
    v_zone_fmea := 'zona_iii';
  END IF;

  RETURN CASE
    WHEN v_ai_act_floor = 'zona_i' THEN 'zona_i'
    WHEN v_ai_act_floor = 'zona_ii' AND v_zone_fmea IN ('zona_iv', 'zona_iii') THEN 'zona_ii'
    WHEN v_ai_act_floor = 'zona_iii' AND v_zone_fmea = 'zona_iv' THEN 'zona_iii'
    ELSE v_zone_fmea
  END;
END;
$$;

-- --------------------------------------------------------------------------
-- Vista de resumen: ai_systems usa internal_id, no code
-- --------------------------------------------------------------------------

CREATE OR REPLACE VIEW fluxion.plan_summary AS
SELECT
  tp.id,
  tp.organization_id,
  tp.system_id,
  sys.name                    AS system_name,
  sys.internal_id             AS system_code,
  tp.code                     AS plan_code,
  tp.status,
  tp.zone_at_creation,
  tp.zone_target,
  tp.ai_act_floor,
  tp.approval_level,
  tp.deadline,
  tp.deadline < CURRENT_DATE  AS is_overdue,
  tp.actions_total,
  tp.actions_completed,
  CASE
    WHEN tp.actions_total = 0 THEN 0
    ELSE ROUND(tp.actions_completed::numeric / tp.actions_total * 100)
  END                         AS completion_pct,
  tp.created_at,
  tp.updated_at
FROM fluxion.treatment_plans tp
JOIN fluxion.ai_systems sys ON sys.id = tp.system_id;

COMMENT ON VIEW fluxion.plan_summary IS
  'Vista de resumen de planes de tratamiento para el dashboard. Usa internal_id del sistema cuando existe.';
