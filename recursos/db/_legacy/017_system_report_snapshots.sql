-- ============================================================================
-- FLUXION — Snapshots de informes generados por sistema
-- ============================================================================

CREATE TABLE IF NOT EXISTS fluxion.system_report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_system_id UUID NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  report_type TEXT NOT NULL,
  title TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_report_snapshots_system
  ON fluxion.system_report_snapshots(ai_system_id, report_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_report_snapshots_org
  ON fluxion.system_report_snapshots(organization_id, report_type, created_at DESC);

ALTER TABLE fluxion.system_report_snapshots ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA fluxion TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fluxion.system_report_snapshots TO authenticated, service_role;

DROP POLICY IF EXISTS "system_report_snapshots_select" ON fluxion.system_report_snapshots;
CREATE POLICY "system_report_snapshots_select"
  ON fluxion.system_report_snapshots FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "system_report_snapshots_insert" ON fluxion.system_report_snapshots;
CREATE POLICY "system_report_snapshots_insert"
  ON fluxion.system_report_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_report_snapshots.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "system_report_snapshots_update" ON fluxion.system_report_snapshots;
CREATE POLICY "system_report_snapshots_update"
  ON fluxion.system_report_snapshots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_report_snapshots.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "system_report_snapshots_delete" ON fluxion.system_report_snapshots;
CREATE POLICY "system_report_snapshots_delete"
  ON fluxion.system_report_snapshots FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_report_snapshots.organization_id
        AND role IN ('admin', 'editor')
    )
  );

COMMENT ON TABLE fluxion.system_report_snapshots IS 'Snapshots persistidos de informes generados para un sistema de IA.';
COMMENT ON COLUMN fluxion.system_report_snapshots.report_type IS 'Tipo de informe generado, por ejemplo gap_report o technical_dossier.';
