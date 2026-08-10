-- 052_fix_inventory_rls.sql
-- Las políticas RLS de las tablas del inventario referenciaban fluxion.organization_members
-- (tabla eliminada en 039). Se reemplazan usando fluxion.profiles.
-- Tablas afectadas: ai_system_history, system_evidences, system_obligations,
--                   system_obligation_evidences, system_failure_modes,
--                   ai_system_classification_reviews

-- ============================================================================
-- ai_system_history
-- ============================================================================

DROP POLICY IF EXISTS "ai_system_history_select" ON fluxion.ai_system_history;
CREATE POLICY "ai_system_history_select"
  ON fluxion.ai_system_history FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ai_system_history_insert" ON fluxion.ai_system_history;
CREATE POLICY "ai_system_history_insert"
  ON fluxion.ai_system_history FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ai_system_history_update" ON fluxion.ai_system_history;
CREATE POLICY "ai_system_history_update"
  ON fluxion.ai_system_history FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.ai_system_history.organization_id
        AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner', 'risk_analyst', 'compliance_analyst')
    )
  );

DROP POLICY IF EXISTS "ai_system_history_delete" ON fluxion.ai_system_history;
CREATE POLICY "ai_system_history_delete"
  ON fluxion.ai_system_history FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.ai_system_history.organization_id
        AND role IN ('org_admin', 'sgai_manager', 'caio')
    )
  );

-- ============================================================================
-- system_evidences
-- ============================================================================

DROP POLICY IF EXISTS "system_evidences_select" ON fluxion.system_evidences;
CREATE POLICY "system_evidences_select"
  ON fluxion.system_evidences FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "system_evidences_insert" ON fluxion.system_evidences;
CREATE POLICY "system_evidences_insert"
  ON fluxion.system_evidences FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "system_evidences_update" ON fluxion.system_evidences;
CREATE POLICY "system_evidences_update"
  ON fluxion.system_evidences FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_evidences.organization_id
        AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner', 'risk_analyst', 'compliance_analyst')
    )
  );

DROP POLICY IF EXISTS "system_evidences_delete" ON fluxion.system_evidences;
CREATE POLICY "system_evidences_delete"
  ON fluxion.system_evidences FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_evidences.organization_id
        AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner', 'risk_analyst', 'compliance_analyst')
    )
  );

-- ============================================================================
-- system_obligations
-- ============================================================================

DROP POLICY IF EXISTS "system_obligations_select" ON fluxion.system_obligations;
CREATE POLICY "system_obligations_select"
  ON fluxion.system_obligations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "system_obligations_insert" ON fluxion.system_obligations;
CREATE POLICY "system_obligations_insert"
  ON fluxion.system_obligations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "system_obligations_update" ON fluxion.system_obligations;
CREATE POLICY "system_obligations_update"
  ON fluxion.system_obligations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_obligations.organization_id
        AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner', 'risk_analyst', 'compliance_analyst')
    )
  );

DROP POLICY IF EXISTS "system_obligations_delete" ON fluxion.system_obligations;
CREATE POLICY "system_obligations_delete"
  ON fluxion.system_obligations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_obligations.organization_id
        AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner', 'risk_analyst', 'compliance_analyst')
    )
  );

-- ============================================================================
-- system_obligation_evidences
-- ============================================================================

DROP POLICY IF EXISTS "system_obligation_evidences_select" ON fluxion.system_obligation_evidences;
CREATE POLICY "system_obligation_evidences_select"
  ON fluxion.system_obligation_evidences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.system_obligations so
      JOIN fluxion.profiles p ON p.organization_id = so.organization_id
      WHERE so.id = fluxion.system_obligation_evidences.obligation_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "system_obligation_evidences_insert" ON fluxion.system_obligation_evidences;
CREATE POLICY "system_obligation_evidences_insert"
  ON fluxion.system_obligation_evidences FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fluxion.system_obligations so
      JOIN fluxion.profiles p ON p.organization_id = so.organization_id
      WHERE so.id = fluxion.system_obligation_evidences.obligation_id
        AND p.user_id = auth.uid()
        AND p.role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner', 'risk_analyst', 'compliance_analyst')
    )
  );

DROP POLICY IF EXISTS "system_obligation_evidences_delete" ON fluxion.system_obligation_evidences;
CREATE POLICY "system_obligation_evidences_delete"
  ON fluxion.system_obligation_evidences FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.system_obligations so
      JOIN fluxion.profiles p ON p.organization_id = so.organization_id
      WHERE so.id = fluxion.system_obligation_evidences.obligation_id
        AND p.user_id = auth.uid()
        AND p.role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner', 'risk_analyst', 'compliance_analyst')
    )
  );

-- ============================================================================
-- system_failure_modes
-- ============================================================================

DROP POLICY IF EXISTS "system_failure_modes_select" ON fluxion.system_failure_modes;
CREATE POLICY "system_failure_modes_select"
  ON fluxion.system_failure_modes FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "system_failure_modes_insert" ON fluxion.system_failure_modes;
CREATE POLICY "system_failure_modes_insert"
  ON fluxion.system_failure_modes FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "system_failure_modes_update" ON fluxion.system_failure_modes;
CREATE POLICY "system_failure_modes_update"
  ON fluxion.system_failure_modes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_failure_modes.organization_id
        AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner', 'risk_analyst', 'compliance_analyst')
    )
  );

DROP POLICY IF EXISTS "system_failure_modes_delete" ON fluxion.system_failure_modes;
CREATE POLICY "system_failure_modes_delete"
  ON fluxion.system_failure_modes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_failure_modes.organization_id
        AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner', 'risk_analyst', 'compliance_analyst')
    )
  );

-- ============================================================================
-- ai_system_classification_reviews
-- ============================================================================

DROP POLICY IF EXISTS "classification_reviews_select" ON fluxion.ai_system_classification_reviews;
CREATE POLICY "classification_reviews_select"
  ON fluxion.ai_system_classification_reviews FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "classification_reviews_insert" ON fluxion.ai_system_classification_reviews;
CREATE POLICY "classification_reviews_insert"
  ON fluxion.ai_system_classification_reviews FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "classification_reviews_update" ON fluxion.ai_system_classification_reviews;
CREATE POLICY "classification_reviews_update"
  ON fluxion.ai_system_classification_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.ai_system_classification_reviews.organization_id
        AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner', 'risk_analyst', 'compliance_analyst')
    )
  );
