-- 084 · Auditoría de cambios de rol y gestión de miembros
-- Registra cada cambio de rol, activación y desactivación de miembros.

CREATE TABLE IF NOT EXISTS fluxion.member_role_changes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  actor_id     uuid NOT NULL REFERENCES fluxion.profiles(id) ON DELETE CASCADE,
  member_id    uuid NOT NULL REFERENCES fluxion.profiles(id) ON DELETE CASCADE,
  change_type  text NOT NULL CHECK (change_type IN ('role_change', 'deactivated', 'reactivated', 'removed')),
  prev_role    text,
  new_role     text,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_role_changes_org      ON fluxion.member_role_changes (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_role_changes_member   ON fluxion.member_role_changes (member_id, created_at DESC);

-- RLS: solo miembros de la organización pueden leer; solo org_admin puede insertar
ALTER TABLE fluxion.member_role_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read role changes"
  ON fluxion.member_role_changes FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org admins can insert role changes"
  ON fluxion.member_role_changes FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid() AND role = 'org_admin'
    )
  );

COMMENT ON TABLE fluxion.member_role_changes IS 'Auditoría de cambios de rol, desactivaciones y reactivaciones de miembros';
COMMENT ON COLUMN fluxion.member_role_changes.change_type IS 'role_change | deactivated | reactivated | removed';
