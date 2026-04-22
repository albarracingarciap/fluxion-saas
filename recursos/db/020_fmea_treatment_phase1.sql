-- ============================================================================
-- FLUXION — FMEA treatment plan phase 1
-- ============================================================================

DROP TRIGGER IF EXISTS trg_treatment_actions_updated_at ON fluxion.treatment_actions;
CREATE TRIGGER trg_treatment_actions_updated_at
  BEFORE UPDATE ON fluxion.treatment_actions
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();

GRANT USAGE ON SCHEMA fluxion TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fluxion.treatment_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fluxion.treatment_actions TO authenticated;

DROP POLICY IF EXISTS "treatment_plans_select" ON fluxion.treatment_plans;
CREATE POLICY "treatment_plans_select"
  ON fluxion.treatment_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.fmea_evaluations
      WHERE id = fluxion.treatment_plans.evaluation_id
        AND organization_id IN (
          SELECT organization_id
          FROM fluxion.organization_members
          WHERE user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "treatment_plans_insert" ON fluxion.treatment_plans;
CREATE POLICY "treatment_plans_insert"
  ON fluxion.treatment_plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM fluxion.fmea_evaluations
      WHERE id = fluxion.treatment_plans.evaluation_id
        AND organization_id IN (
          SELECT organization_id
          FROM fluxion.organization_members
          WHERE user_id = auth.uid()
            AND role IN ('admin', 'editor', 'dpo', 'technical')
        )
    )
  );

DROP POLICY IF EXISTS "treatment_plans_update" ON fluxion.treatment_plans;
CREATE POLICY "treatment_plans_update"
  ON fluxion.treatment_plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.fmea_evaluations
      WHERE id = fluxion.treatment_plans.evaluation_id
        AND organization_id IN (
          SELECT organization_id
          FROM fluxion.organization_members
          WHERE user_id = auth.uid()
            AND role IN ('admin', 'editor', 'dpo', 'technical')
        )
    )
  );

DROP POLICY IF EXISTS "treatment_plans_delete" ON fluxion.treatment_plans;
CREATE POLICY "treatment_plans_delete"
  ON fluxion.treatment_plans FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.fmea_evaluations
      WHERE id = fluxion.treatment_plans.evaluation_id
        AND organization_id IN (
          SELECT organization_id
          FROM fluxion.organization_members
          WHERE user_id = auth.uid()
            AND role IN ('admin', 'editor')
        )
    )
  );

DROP POLICY IF EXISTS "treatment_actions_select" ON fluxion.treatment_actions;
CREATE POLICY "treatment_actions_select"
  ON fluxion.treatment_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.treatment_plans tp
      JOIN fluxion.fmea_evaluations fe ON fe.id = tp.evaluation_id
      WHERE tp.id = fluxion.treatment_actions.treatment_plan_id
        AND fe.organization_id IN (
          SELECT organization_id
          FROM fluxion.organization_members
          WHERE user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "treatment_actions_insert" ON fluxion.treatment_actions;
CREATE POLICY "treatment_actions_insert"
  ON fluxion.treatment_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM fluxion.treatment_plans tp
      JOIN fluxion.fmea_evaluations fe ON fe.id = tp.evaluation_id
      WHERE tp.id = fluxion.treatment_actions.treatment_plan_id
        AND fe.organization_id IN (
          SELECT organization_id
          FROM fluxion.organization_members
          WHERE user_id = auth.uid()
            AND role IN ('admin', 'editor', 'dpo', 'technical')
        )
    )
  );

DROP POLICY IF EXISTS "treatment_actions_update" ON fluxion.treatment_actions;
CREATE POLICY "treatment_actions_update"
  ON fluxion.treatment_actions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.treatment_plans tp
      JOIN fluxion.fmea_evaluations fe ON fe.id = tp.evaluation_id
      WHERE tp.id = fluxion.treatment_actions.treatment_plan_id
        AND fe.organization_id IN (
          SELECT organization_id
          FROM fluxion.organization_members
          WHERE user_id = auth.uid()
            AND role IN ('admin', 'editor', 'dpo', 'technical')
        )
    )
  );

DROP POLICY IF EXISTS "treatment_actions_delete" ON fluxion.treatment_actions;
CREATE POLICY "treatment_actions_delete"
  ON fluxion.treatment_actions FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.treatment_plans tp
      JOIN fluxion.fmea_evaluations fe ON fe.id = tp.evaluation_id
      WHERE tp.id = fluxion.treatment_actions.treatment_plan_id
        AND fe.organization_id IN (
          SELECT organization_id
          FROM fluxion.organization_members
          WHERE user_id = auth.uid()
            AND role IN ('admin', 'editor')
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_treatment_actions_plan_item
  ON fluxion.treatment_actions(treatment_plan_id, fmea_item_id);
