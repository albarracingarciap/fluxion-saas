-- ============================================================================
-- FLUXION — Historial auditable de sistemas de IA
-- ============================================================================

CREATE TABLE IF NOT EXISTS fluxion.ai_system_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_system_id UUID NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_summary TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_system_history_system
  ON fluxion.ai_system_history(ai_system_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_system_history_org
  ON fluxion.ai_system_history(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_system_history_event_type
  ON fluxion.ai_system_history(event_type);

ALTER TABLE fluxion.ai_system_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_system_history_select" ON fluxion.ai_system_history;
CREATE POLICY "ai_system_history_select"
  ON fluxion.ai_system_history FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ai_system_history_insert" ON fluxion.ai_system_history;
CREATE POLICY "ai_system_history_insert"
  ON fluxion.ai_system_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.ai_system_history.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "ai_system_history_update" ON fluxion.ai_system_history;
CREATE POLICY "ai_system_history_update"
  ON fluxion.ai_system_history FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.ai_system_history.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "ai_system_history_delete" ON fluxion.ai_system_history;
CREATE POLICY "ai_system_history_delete"
  ON fluxion.ai_system_history FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.ai_system_history.organization_id
        AND role = 'admin'
    )
  );

COMMENT ON TABLE fluxion.ai_system_history IS 'Timeline auditable de eventos funcionales y de gobierno sobre un sistema de IA.';
COMMENT ON COLUMN fluxion.ai_system_history.payload IS 'Datos estructurados del evento para reconstruir cambios, diffs o metadatos operativos.';

-- Permisos
GRANT ALL ON fluxion.ai_system_history TO authenticated;
GRANT ALL ON fluxion.ai_system_history TO service_role;
