-- ============================================================================
-- FLUXION — Obligaciones aplicables a sistemas de IA
-- ============================================================================

CREATE TABLE IF NOT EXISTS fluxion.system_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_system_id UUID NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  source_framework TEXT NOT NULL,
  obligation_code TEXT,
  title TEXT NOT NULL,
  description TEXT,

  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',

  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,

  notes TEXT,
  resolution_notes TEXT,

  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_system_obligations_status
    CHECK (status IN ('pending', 'in_progress', 'resolved', 'blocked', 'excluded')),
  CONSTRAINT chk_system_obligations_priority
    CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_system_obligations_system
  ON fluxion.system_obligations(ai_system_id);

CREATE INDEX IF NOT EXISTS idx_system_obligations_org_status
  ON fluxion.system_obligations(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_system_obligations_framework
  ON fluxion.system_obligations(ai_system_id, source_framework);

DROP TRIGGER IF EXISTS trg_system_obligations_updated_at ON fluxion.system_obligations;
CREATE TRIGGER trg_system_obligations_updated_at
  BEFORE UPDATE ON fluxion.system_obligations
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();

ALTER TABLE fluxion.system_obligations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_obligations_select" ON fluxion.system_obligations;
CREATE POLICY "system_obligations_select"
  ON fluxion.system_obligations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "system_obligations_insert" ON fluxion.system_obligations;
CREATE POLICY "system_obligations_insert"
  ON fluxion.system_obligations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_obligations.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "system_obligations_update" ON fluxion.system_obligations;
CREATE POLICY "system_obligations_update"
  ON fluxion.system_obligations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_obligations.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "system_obligations_delete" ON fluxion.system_obligations;
CREATE POLICY "system_obligations_delete"
  ON fluxion.system_obligations FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_obligations.organization_id
        AND role IN ('admin', 'editor')
    )
  );

COMMENT ON TABLE fluxion.system_obligations IS 'Obligaciones concretas aplicables a un sistema de IA y su estado operativo de cumplimiento.';
COMMENT ON COLUMN fluxion.system_obligations.source_framework IS 'Marco normativo de origen: AI Act, ISO 42001, RGPD, DORA, ENS, MDR/IVDR, etc.';
COMMENT ON COLUMN fluxion.system_obligations.obligation_code IS 'Código del artículo, cláusula o control que identifica la obligación.';

-- Permisos
GRANT ALL ON fluxion.system_obligations TO authenticated;
GRANT ALL ON fluxion.system_obligations TO service_role;
