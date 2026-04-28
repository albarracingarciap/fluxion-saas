-- Migration 061: SoA document lifecycle audit log
-- Records every state transition of the SoA document for audit trail

CREATE TABLE IF NOT EXISTS fluxion.soa_lifecycle_log (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID       NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  actor_user_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  from_status    TEXT,                          -- NULL on first transition from implicit draft
  to_status      TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soa_lifecycle_log_org
  ON fluxion.soa_lifecycle_log (organization_id, created_at DESC);

ALTER TABLE fluxion.soa_lifecycle_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their org SoA lifecycle log"
  ON fluxion.soa_lifecycle_log FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON TABLE fluxion.soa_lifecycle_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fluxion.soa_lifecycle_log TO service_role;
