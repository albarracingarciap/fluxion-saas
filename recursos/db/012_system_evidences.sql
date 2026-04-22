-- ============================================================================
-- FLUXION — Evidencias de sistemas de IA
-- ============================================================================

CREATE TABLE IF NOT EXISTS fluxion.system_evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_system_id UUID NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  evidence_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',

  storage_path TEXT,
  external_url TEXT,

  version TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,

  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  issued_at DATE,
  expires_at DATE,
  reviewed_at TIMESTAMPTZ,

  validation_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_system_evidences_status
    CHECK (status IN ('draft', 'valid', 'expired', 'pending_review', 'rejected')),
  CONSTRAINT chk_system_evidences_location
    CHECK (storage_path IS NOT NULL OR external_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_system_evidences_system
  ON fluxion.system_evidences(ai_system_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_evidences_org_status
  ON fluxion.system_evidences(organization_id, status);

DROP TRIGGER IF EXISTS trg_system_evidences_updated_at ON fluxion.system_evidences;
CREATE TRIGGER trg_system_evidences_updated_at
  BEFORE UPDATE ON fluxion.system_evidences
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();

ALTER TABLE fluxion.system_evidences ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA fluxion TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fluxion.system_evidences TO authenticated;

DROP POLICY IF EXISTS "system_evidences_select" ON fluxion.system_evidences;
CREATE POLICY "system_evidences_select"
  ON fluxion.system_evidences FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "system_evidences_insert" ON fluxion.system_evidences;
CREATE POLICY "system_evidences_insert"
  ON fluxion.system_evidences FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_evidences.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "system_evidences_update" ON fluxion.system_evidences;
CREATE POLICY "system_evidences_update"
  ON fluxion.system_evidences FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_evidences.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "system_evidences_delete" ON fluxion.system_evidences;
CREATE POLICY "system_evidences_delete"
  ON fluxion.system_evidences FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.system_evidences.organization_id
        AND role IN ('admin', 'editor')
    )
  );

COMMENT ON TABLE fluxion.system_evidences IS 'Metadatos de evidencias documentales y operativas vinculadas a un sistema de IA.';
COMMENT ON COLUMN fluxion.system_evidences.storage_path IS 'Ruta del archivo en Supabase Storage cuando la evidencia se sube a la plataforma.';
COMMENT ON COLUMN fluxion.system_evidences.external_url IS 'Enlace externo alternativo cuando la evidencia se referencia fuera de la plataforma.';
