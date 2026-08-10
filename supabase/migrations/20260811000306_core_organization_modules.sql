CREATE TABLE fluxion.organization_modules (
  organization_id uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  module_key      text NOT NULL,
  status          text NOT NULL DEFAULT 'disabled'
                       CHECK (status IN ('enabled','disabled','trial')),
  config          jsonb NOT NULL DEFAULT '{}',
  licensed_until  date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, module_key)
);

ALTER TABLE fluxion.organization_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read modules" ON fluxion.organization_modules
  FOR SELECT USING (organization_id = fluxion.auth_user_org_id());

GRANT SELECT ON fluxion.organization_modules TO authenticated;
GRANT ALL    ON fluxion.organization_modules TO service_role;