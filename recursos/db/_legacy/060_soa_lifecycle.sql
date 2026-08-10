-- Migration 060: SoA document lifecycle status
-- Adds a lifecycle status to organization_soa_metadata to support draft → under_review → approved workflow

ALTER TABLE fluxion.organization_soa_metadata
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_status IN ('draft', 'under_review', 'approved'));

-- Index for fast lookups by status
CREATE INDEX IF NOT EXISTS idx_soa_metadata_lifecycle_status
  ON fluxion.organization_soa_metadata (organization_id, lifecycle_status);

COMMENT ON COLUMN fluxion.organization_soa_metadata.lifecycle_status IS
  'Workflow state of the SoA document: draft (editable) → under_review (locked) → approved (immutable). Can be reset to draft via "Iniciar nueva revisión".';
