-- ============================================================================
-- FLUXION — Modos de fallo activados por sistema
-- ============================================================================

CREATE TABLE IF NOT EXISTS fluxion.system_failure_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_system_id UUID NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  failure_mode_id UUID NOT NULL REFERENCES compliance.failure_modes(id) ON DELETE CASCADE,

  dimension_id TEXT NOT NULL,
  activation_source TEXT NOT NULL DEFAULT 'rule',
  activation_reason TEXT,
  activation_family_ids TEXT[] NOT NULL DEFAULT '{}',
  activation_family_labels TEXT[] NOT NULL DEFAULT '{}',
  confidence NUMERIC(4,2),

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_system_failure_modes_source
    CHECK (activation_source IN ('rule', 'ai', 'manual')),
  CONSTRAINT uq_system_failure_modes_unique
    UNIQUE (ai_system_id, failure_mode_id)
);

CREATE INDEX IF NOT EXISTS idx_system_failure_modes_system
  ON fluxion.system_failure_modes(ai_system_id, dimension_id);

CREATE INDEX IF NOT EXISTS idx_system_failure_modes_org
  ON fluxion.system_failure_modes(organization_id, activation_source);

DROP TRIGGER IF EXISTS trg_system_failure_modes_updated_at ON fluxion.system_failure_modes;
CREATE TRIGGER trg_system_failure_modes_updated_at
  BEFORE UPDATE ON fluxion.system_failure_modes
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();

ALTER TABLE fluxion.system_failure_modes ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA fluxion TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fluxion.system_failure_modes TO authenticated;

DROP POLICY IF EXISTS "system_failure_modes_select" ON fluxion.system_failure_modes;
CREATE POLICY "system_failure_modes_select"
  ON fluxion.system_failure_modes FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "system_failure_modes_insert" ON fluxion.system_failure_modes;
CREATE POLICY "system_failure_modes_insert"
  ON fluxion.system_failure_modes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_failure_modes.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "system_failure_modes_update" ON fluxion.system_failure_modes;
CREATE POLICY "system_failure_modes_update"
  ON fluxion.system_failure_modes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_failure_modes.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "system_failure_modes_delete" ON fluxion.system_failure_modes;
CREATE POLICY "system_failure_modes_delete"
  ON fluxion.system_failure_modes FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_failure_modes.organization_id
        AND role IN ('admin', 'editor')
    )
  );

COMMENT ON TABLE fluxion.system_failure_modes IS 'Subset persistido de modos de fallo del catálogo compliance activados para un sistema concreto.';
COMMENT ON COLUMN fluxion.system_failure_modes.activation_source IS 'Origen de activación: rule para motor determinista, ai para refinado por agente y manual para intervención humana.';
COMMENT ON COLUMN fluxion.system_failure_modes.activation_reason IS 'Justificación legible de por qué el modo quedó activado para el sistema.';
