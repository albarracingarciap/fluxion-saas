-- ============================================================================
-- FLUXION — Evidences: storage + verification status
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'evidence_verification_status'
      AND n.nspname = 'fluxion'
  ) THEN
    CREATE TYPE fluxion.evidence_verification_status AS ENUM (
      'pending',
      'validated',
      'rejected'
    );
  END IF;
END $$;

ALTER TABLE fluxion.evidences
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS external_url TEXT,
  ADD COLUMN IF NOT EXISTS verification_status fluxion.evidence_verification_status NOT NULL DEFAULT 'pending';

ALTER TABLE fluxion.evidences
  ALTER COLUMN url DROP NOT NULL;

ALTER TABLE fluxion.evidences
  DROP CONSTRAINT IF EXISTS chk_fluxion_evidences_location;

ALTER TABLE fluxion.evidences
  ADD CONSTRAINT chk_fluxion_evidences_location
  CHECK (
    COALESCE(NULLIF(BTRIM(storage_path), ''), NULLIF(BTRIM(external_url), ''), NULLIF(BTRIM(url), '')) IS NOT NULL
  );

DROP TRIGGER IF EXISTS trg_evidences_updated_at ON fluxion.evidences;
CREATE TRIGGER trg_evidences_updated_at
  BEFORE UPDATE ON fluxion.evidences
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_fluxion_evidences_verification_status
  ON fluxion.evidences(organization_id, verification_status, created_at DESC);

COMMENT ON COLUMN fluxion.evidences.storage_path IS
  'Ruta del archivo en Supabase Storage cuando la evidencia se sube a la plataforma.';

COMMENT ON COLUMN fluxion.evidences.external_url IS
  'Enlace externo opcional a la evidencia cuando vive fuera de la plataforma.';

COMMENT ON COLUMN fluxion.evidences.verification_status IS
  'Estado de validación de la evidencia dentro del flujo de treatment plans: pending, validated o rejected.';
