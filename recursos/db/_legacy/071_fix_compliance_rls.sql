-- ============================================================================
-- FLUXION — Fix RLS: controls, evidences, gaps
-- Reemplaza políticas de 005_fluxion_compliance_fmea.sql que aún referencian
-- la tabla eliminada fluxion.organization_members por fluxion.profiles.
-- ============================================================================

-- ── fluxion.controls ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Miembros pueden ver los controles" ON fluxion.controls;
DROP POLICY IF EXISTS "controls_select" ON fluxion.controls;
DROP POLICY IF EXISTS "controls_insert" ON fluxion.controls;
DROP POLICY IF EXISTS "controls_update" ON fluxion.controls;
DROP POLICY IF EXISTS "controls_delete" ON fluxion.controls;

CREATE POLICY "controls_select"
  ON fluxion.controls FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "controls_insert"
  ON fluxion.controls FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner', 'risk_analyst', 'compliance_analyst')
    )
  );

CREATE POLICY "controls_update"
  ON fluxion.controls FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner', 'risk_analyst', 'compliance_analyst')
    )
  );

CREATE POLICY "controls_delete"
  ON fluxion.controls FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND role IN ('org_admin', 'sgai_manager', 'caio')
    )
  );

-- ── fluxion.evidences ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Miembros pueden ver evidencias" ON fluxion.evidences;
DROP POLICY IF EXISTS "evidences_select" ON fluxion.evidences;
DROP POLICY IF EXISTS "evidences_insert" ON fluxion.evidences;
DROP POLICY IF EXISTS "evidences_update" ON fluxion.evidences;
DROP POLICY IF EXISTS "evidences_delete" ON fluxion.evidences;

CREATE POLICY "evidences_select"
  ON fluxion.evidences FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "evidences_insert"
  ON fluxion.evidences FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner', 'risk_analyst', 'compliance_analyst')
    )
  );

CREATE POLICY "evidences_update"
  ON fluxion.evidences FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner', 'risk_analyst', 'compliance_analyst')
    )
  );

CREATE POLICY "evidences_delete"
  ON fluxion.evidences FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND role IN ('org_admin', 'sgai_manager', 'caio')
    )
  );

-- ── fluxion.gaps ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Miembros pueden ver gaps" ON fluxion.gaps;
DROP POLICY IF EXISTS "gaps_select" ON fluxion.gaps;
DROP POLICY IF EXISTS "gaps_insert" ON fluxion.gaps;
DROP POLICY IF EXISTS "gaps_update" ON fluxion.gaps;
DROP POLICY IF EXISTS "gaps_delete" ON fluxion.gaps;

CREATE POLICY "gaps_select"
  ON fluxion.gaps FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "gaps_insert"
  ON fluxion.gaps FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner', 'risk_analyst', 'compliance_analyst')
    )
  );

CREATE POLICY "gaps_update"
  ON fluxion.gaps FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner', 'risk_analyst', 'compliance_analyst')
    )
  );

CREATE POLICY "gaps_delete"
  ON fluxion.gaps FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND role IN ('org_admin', 'sgai_manager', 'caio')
    )
  );
