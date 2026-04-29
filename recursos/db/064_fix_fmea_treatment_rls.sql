-- recursos/db/064_fix_fmea_treatment_rls.sql
--
-- Corrige las políticas RLS de las tablas FMEA y treatment plan que
-- referenciaban fluxion.organization_members (eliminada en 039) y los
-- nombres antiguos de roles ('admin', 'editor', 'technical').
--
-- Patrón correcto: fluxion.profiles WHERE user_id = auth.uid()
-- Roles nuevos (fluxion.org_role, ver 038):
--   org_admin, sgai_manager, caio, dpo,
--   system_owner, risk_analyst, compliance_analyst,
--   executive, auditor, viewer
--
-- Mapeo de capacidades acordado:
--   SELECT  → cualquier miembro de la organización
--   INSERT/UPDATE → org_admin, sgai_manager, caio, dpo,
--                   risk_analyst, compliance_analyst, system_owner
--   DELETE  → org_admin, sgai_manager, caio
--
-- Tablas afectadas:
--   fluxion.fmea_evaluations
--   fluxion.fmea_items
--   fluxion.treatment_plans
--   fluxion.treatment_actions

-- ============================================================
-- 1. fmea_evaluations
-- ============================================================

DROP POLICY IF EXISTS "Miembros pueden ver headers de riesgos" ON fluxion.fmea_evaluations;
DROP POLICY IF EXISTS "fmea_evaluations_select" ON fluxion.fmea_evaluations;
DROP POLICY IF EXISTS "fmea_evaluations_insert" ON fluxion.fmea_evaluations;
DROP POLICY IF EXISTS "fmea_evaluations_update" ON fluxion.fmea_evaluations;
DROP POLICY IF EXISTS "fmea_evaluations_delete" ON fluxion.fmea_evaluations;

CREATE POLICY "fmea_evaluations_select"
  ON fluxion.fmea_evaluations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "fmea_evaluations_insert"
  ON fluxion.fmea_evaluations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo',
                     'risk_analyst', 'compliance_analyst', 'system_owner')
    )
  );

CREATE POLICY "fmea_evaluations_update"
  ON fluxion.fmea_evaluations FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo',
                     'risk_analyst', 'compliance_analyst', 'system_owner')
    )
  );

CREATE POLICY "fmea_evaluations_delete"
  ON fluxion.fmea_evaluations FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND role IN ('org_admin', 'sgai_manager', 'caio')
    )
  );

-- ============================================================
-- 2. fmea_items
-- ============================================================

DROP POLICY IF EXISTS "fmea_items_select" ON fluxion.fmea_items;
DROP POLICY IF EXISTS "fmea_items_insert" ON fluxion.fmea_items;
DROP POLICY IF EXISTS "fmea_items_update" ON fluxion.fmea_items;
DROP POLICY IF EXISTS "fmea_items_delete" ON fluxion.fmea_items;

CREATE POLICY "fmea_items_select"
  ON fluxion.fmea_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.fmea_evaluations e
      WHERE e.id = fluxion.fmea_items.evaluation_id
        AND e.organization_id IN (
          SELECT organization_id FROM fluxion.profiles
          WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "fmea_items_insert"
  ON fluxion.fmea_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fluxion.fmea_evaluations e
      WHERE e.id = fluxion.fmea_items.evaluation_id
        AND e.organization_id IN (
          SELECT organization_id FROM fluxion.profiles
          WHERE user_id = auth.uid()
            AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo',
                         'risk_analyst', 'compliance_analyst', 'system_owner')
        )
    )
  );

CREATE POLICY "fmea_items_update"
  ON fluxion.fmea_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.fmea_evaluations e
      WHERE e.id = fluxion.fmea_items.evaluation_id
        AND e.organization_id IN (
          SELECT organization_id FROM fluxion.profiles
          WHERE user_id = auth.uid()
            AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo',
                         'risk_analyst', 'compliance_analyst', 'system_owner')
        )
    )
  );

CREATE POLICY "fmea_items_delete"
  ON fluxion.fmea_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.fmea_evaluations e
      WHERE e.id = fluxion.fmea_items.evaluation_id
        AND e.organization_id IN (
          SELECT organization_id FROM fluxion.profiles
          WHERE user_id = auth.uid()
            AND role IN ('org_admin', 'sgai_manager', 'caio')
        )
    )
  );

-- ============================================================
-- 3. treatment_plans
-- ============================================================

DROP POLICY IF EXISTS "treatment_plans_select" ON fluxion.treatment_plans;
DROP POLICY IF EXISTS "treatment_plans_insert" ON fluxion.treatment_plans;
DROP POLICY IF EXISTS "treatment_plans_update" ON fluxion.treatment_plans;
DROP POLICY IF EXISTS "treatment_plans_delete" ON fluxion.treatment_plans;

CREATE POLICY "treatment_plans_select"
  ON fluxion.treatment_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.fmea_evaluations e
      WHERE e.id = fluxion.treatment_plans.evaluation_id
        AND e.organization_id IN (
          SELECT organization_id FROM fluxion.profiles
          WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "treatment_plans_insert"
  ON fluxion.treatment_plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fluxion.fmea_evaluations e
      WHERE e.id = fluxion.treatment_plans.evaluation_id
        AND e.organization_id IN (
          SELECT organization_id FROM fluxion.profiles
          WHERE user_id = auth.uid()
            AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo',
                         'risk_analyst', 'compliance_analyst', 'system_owner')
        )
    )
  );

CREATE POLICY "treatment_plans_update"
  ON fluxion.treatment_plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.fmea_evaluations e
      WHERE e.id = fluxion.treatment_plans.evaluation_id
        AND e.organization_id IN (
          SELECT organization_id FROM fluxion.profiles
          WHERE user_id = auth.uid()
            AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo',
                         'risk_analyst', 'compliance_analyst', 'system_owner')
        )
    )
  );

CREATE POLICY "treatment_plans_delete"
  ON fluxion.treatment_plans FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.fmea_evaluations e
      WHERE e.id = fluxion.treatment_plans.evaluation_id
        AND e.organization_id IN (
          SELECT organization_id FROM fluxion.profiles
          WHERE user_id = auth.uid()
            AND role IN ('org_admin', 'sgai_manager', 'caio')
        )
    )
  );

-- ============================================================
-- 4. treatment_actions
-- ============================================================

DROP POLICY IF EXISTS "treatment_actions_select" ON fluxion.treatment_actions;
DROP POLICY IF EXISTS "treatment_actions_insert" ON fluxion.treatment_actions;
DROP POLICY IF EXISTS "treatment_actions_update" ON fluxion.treatment_actions;
DROP POLICY IF EXISTS "treatment_actions_delete" ON fluxion.treatment_actions;

CREATE POLICY "treatment_actions_select"
  ON fluxion.treatment_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.treatment_plans tp
      JOIN fluxion.fmea_evaluations e ON e.id = tp.evaluation_id
      WHERE tp.id = fluxion.treatment_actions.plan_id
        AND e.organization_id IN (
          SELECT organization_id FROM fluxion.profiles
          WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "treatment_actions_insert"
  ON fluxion.treatment_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM fluxion.treatment_plans tp
      JOIN fluxion.fmea_evaluations e ON e.id = tp.evaluation_id
      WHERE tp.id = fluxion.treatment_actions.plan_id
        AND e.organization_id IN (
          SELECT organization_id FROM fluxion.profiles
          WHERE user_id = auth.uid()
            AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo',
                         'risk_analyst', 'compliance_analyst', 'system_owner')
        )
    )
  );

CREATE POLICY "treatment_actions_update"
  ON fluxion.treatment_actions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.treatment_plans tp
      JOIN fluxion.fmea_evaluations e ON e.id = tp.evaluation_id
      WHERE tp.id = fluxion.treatment_actions.plan_id
        AND e.organization_id IN (
          SELECT organization_id FROM fluxion.profiles
          WHERE user_id = auth.uid()
            AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo',
                         'risk_analyst', 'compliance_analyst', 'system_owner')
        )
    )
  );

CREATE POLICY "treatment_actions_delete"
  ON fluxion.treatment_actions FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.treatment_plans tp
      JOIN fluxion.fmea_evaluations e ON e.id = tp.evaluation_id
      WHERE tp.id = fluxion.treatment_actions.plan_id
        AND e.organization_id IN (
          SELECT organization_id FROM fluxion.profiles
          WHERE user_id = auth.uid()
            AND role IN ('org_admin', 'sgai_manager', 'caio')
        )
    )
  );
