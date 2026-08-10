-- ============================================================================
-- FLUXION — 040: Tabla profile_systems (scope acotado de system_owner)
-- ============================================================================
-- Vincula perfiles con rol system_owner a los sistemas IA que gestionan.
-- Los campos de texto libre (ai_owner, tech_lead) en ai_systems quedan
-- deprecados como legacy; profile_systems es la fuente de verdad normalizada.
-- ============================================================================

CREATE TABLE fluxion.profile_systems (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES fluxion.profiles(id) ON DELETE CASCADE,
  ai_system_id    UUID NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  -- Un system_owner puede ser responsable principal o colaborador
  is_lead         BOOLEAN NOT NULL DEFAULT true,

  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by     UUID REFERENCES fluxion.profiles(id),

  UNIQUE (profile_id, ai_system_id)
);

ALTER TABLE fluxion.profile_systems ENABLE ROW LEVEL SECURITY;

-- system_owner ve únicamente sus propios assignments
CREATE POLICY "profile_systems_own"
  ON fluxion.profile_systems FOR SELECT
  USING (profile_id = (
    SELECT id FROM fluxion.profiles WHERE user_id = auth.uid() LIMIT 1
  ));

-- org_admin, sgai_manager y caio ven todos los assignments de su org
CREATE POLICY "profile_systems_managers"
  ON fluxion.profile_systems FOR SELECT
  USING (
    organization_id = fluxion.auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE user_id = auth.uid()
      AND role IN ('org_admin', 'sgai_manager', 'caio')
    )
  );

-- Solo org_admin y sgai_manager pueden asignar/desasignar sistemas
CREATE POLICY "profile_systems_manage"
  ON fluxion.profile_systems FOR ALL
  USING (
    organization_id = fluxion.auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE user_id = auth.uid()
      AND role IN ('org_admin', 'sgai_manager')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Índices
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_profile_systems_profile ON fluxion.profile_systems(profile_id);
CREATE INDEX idx_profile_systems_system  ON fluxion.profile_systems(ai_system_id);
CREATE INDEX idx_profile_systems_org     ON fluxion.profile_systems(organization_id);
