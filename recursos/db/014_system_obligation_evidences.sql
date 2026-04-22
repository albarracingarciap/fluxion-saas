-- ============================================================================
-- FLUXION — Relación entre obligaciones y evidencias
-- ============================================================================

CREATE TABLE IF NOT EXISTS fluxion.system_obligation_evidences (
  obligation_id UUID NOT NULL REFERENCES fluxion.system_obligations(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES fluxion.system_evidences(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  linked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (obligation_id, evidence_id)
);

CREATE INDEX IF NOT EXISTS idx_system_obligation_evidences_evidence
  ON fluxion.system_obligation_evidences(evidence_id);

ALTER TABLE fluxion.system_obligation_evidences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_obligation_evidences_select" ON fluxion.system_obligation_evidences;
CREATE POLICY "system_obligation_evidences_select"
  ON fluxion.system_obligation_evidences FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.system_obligations so
      JOIN fluxion.organization_members om
        ON om.organization_id = so.organization_id
      WHERE so.id = fluxion.system_obligation_evidences.obligation_id
        AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "system_obligation_evidences_insert" ON fluxion.system_obligation_evidences;
CREATE POLICY "system_obligation_evidences_insert"
  ON fluxion.system_obligation_evidences FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM fluxion.system_obligations so
      JOIN fluxion.organization_members om
        ON om.organization_id = so.organization_id
      WHERE so.id = fluxion.system_obligation_evidences.obligation_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "system_obligation_evidences_delete" ON fluxion.system_obligation_evidences;
CREATE POLICY "system_obligation_evidences_delete"
  ON fluxion.system_obligation_evidences FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.system_obligations so
      JOIN fluxion.organization_members om
        ON om.organization_id = so.organization_id
      WHERE so.id = fluxion.system_obligation_evidences.obligation_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

COMMENT ON TABLE fluxion.system_obligation_evidences IS 'Tabla puente para vincular una o varias evidencias a una obligación concreta del sistema.';

-- Permisos
GRANT ALL ON fluxion.system_obligation_evidences TO authenticated;
GRANT ALL ON fluxion.system_obligation_evidences TO service_role;
