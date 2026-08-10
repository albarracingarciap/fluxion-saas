-- ============================================================================
-- FLUXION — 041: Tablas de comités (committees, members, sessions)
-- ============================================================================
-- Implementa el modelo de gobernanza institucional de la spec:
--   - committees: máximo 1 de cada tipo por organización
--   - committee_members: miembros internos (con perfil) y externos (sin cuenta)
--   - committee_sessions: sesiones y actas con bloqueo inmutable para auditoría
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- committees
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE fluxion.committees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  type            fluxion.committee_type NOT NULL,
  name            TEXT NOT NULL,   -- personalizable: "Comité de IA de Banco Iberia"
  description     TEXT,

  -- Cadencia de sesiones: 1=mensual, 3=trimestral, 12=anual
  cadence_months  INT NOT NULL DEFAULT 1,

  is_active       BOOLEAN NOT NULL DEFAULT true,
  established_at  DATE,            -- fecha de constitución formal (evidencia ISO 42001)
  regulatory_basis TEXT[],         -- ['ISO 42001 §5.1', 'AI Act Art. 26', 'DORA Art. 5']

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Máximo 1 comité de cada tipo por organización
  UNIQUE (organization_id, type)
);

ALTER TABLE fluxion.committees ENABLE ROW LEVEL SECURITY;

-- Todos los miembros de la org pueden consultar comités
CREATE POLICY "committees_select_org"
  ON fluxion.committees FOR SELECT
  USING (organization_id = fluxion.auth_user_org_id());

-- Solo org_admin, sgai_manager y caio pueden crear/modificar/eliminar
CREATE POLICY "committees_manage_admin"
  ON fluxion.committees FOR ALL
  USING (
    organization_id = fluxion.auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE user_id = auth.uid()
      AND role IN ('org_admin', 'sgai_manager', 'caio')
    )
  );

CREATE INDEX idx_committees_org ON fluxion.committees(organization_id);

CREATE TRIGGER trg_committees_updated_at
  BEFORE UPDATE ON fluxion.committees
  FOR EACH ROW EXECUTE FUNCTION fluxion.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- committee_members
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE fluxion.committee_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id    UUID NOT NULL REFERENCES fluxion.committees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  -- Miembro interno (tiene cuenta Fluxion) o externo (sin cuenta)
  profile_id      UUID REFERENCES fluxion.profiles(id) ON DELETE SET NULL,

  -- Datos para miembros externos (auditor, director jurídico, CRO externo...)
  external_name      TEXT,
  external_email     TEXT,
  external_org       TEXT,          -- "Deloitte", "KPMG"
  external_role_desc TEXT,          -- descripción libre del cargo

  -- Exactamente una de las dos identidades debe estar presente
  CONSTRAINT member_identity_check CHECK (
    (profile_id IS NOT NULL AND external_email IS NULL) OR
    (profile_id IS NULL     AND external_email IS NOT NULL)
  ),

  -- Rol dentro del comité (independiente del org_role del perfil)
  committee_role  fluxion.committee_member_role NOT NULL DEFAULT 'member',

  -- Historial de membresía (is_active=false conserva el registro para trazabilidad)
  is_active       BOOLEAN NOT NULL DEFAULT true,
  joined_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  left_at         DATE,

  added_by        UUID REFERENCES fluxion.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un perfil interno solo puede estar una vez (activo o histórico) en el mismo comité
  UNIQUE (committee_id, profile_id)
);

ALTER TABLE fluxion.committee_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "committee_members_select_org"
  ON fluxion.committee_members FOR SELECT
  USING (organization_id = fluxion.auth_user_org_id());

CREATE POLICY "committee_members_manage"
  ON fluxion.committee_members FOR ALL
  USING (
    organization_id = fluxion.auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE user_id = auth.uid()
      AND role IN ('org_admin', 'sgai_manager', 'caio')
    )
  );

CREATE INDEX idx_committee_members_committee ON fluxion.committee_members(committee_id);
CREATE INDEX idx_committee_members_profile   ON fluxion.committee_members(profile_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- committee_sessions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE fluxion.committee_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id    UUID NOT NULL REFERENCES fluxion.committees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  -- Numeración auto-incremental por comité (ver trigger trg_session_number)
  session_number  INT NOT NULL,
  session_type    TEXT NOT NULL DEFAULT 'ordinary',  -- 'ordinary' | 'extraordinary'

  -- Programación
  scheduled_at    TIMESTAMPTZ NOT NULL,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  status          fluxion.committee_session_status NOT NULL DEFAULT 'scheduled',

  -- Lugar / modalidad
  location        TEXT,   -- "Sala B2, Sede Madrid" | "Teams"

  -- Orden del día: [{order, title, description, duration_min}]
  agenda          JSONB DEFAULT '[]',

  -- Acta
  minutes_text      TEXT,
  minutes_locked    BOOLEAN NOT NULL DEFAULT false,
  minutes_locked_at TIMESTAMPTZ,
  minutes_locked_by UUID REFERENCES fluxion.profiles(id),
  -- Una vez locked=true el acta es inmutable (evidencia auditable ISO 42001)
  -- Solo platform_admin puede revertir via SERVICE_ROLE

  -- Decisiones adoptadas: [{id, description, responsible_profile_id, due_date, status}]
  decisions       JSONB DEFAULT '[]',

  -- Asistencia: [{member_id, profile_id|external_email, attended, apology}]
  attendees       JSONB DEFAULT '[]',

  created_by      UUID REFERENCES fluxion.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (committee_id, session_number)
);

ALTER TABLE fluxion.committee_sessions ENABLE ROW LEVEL SECURITY;

-- Todos los miembros de la org pueden consultar sesiones
CREATE POLICY "sessions_select_org"
  ON fluxion.committee_sessions FOR SELECT
  USING (organization_id = fluxion.auth_user_org_id());

-- Solo roles de gobernanza pueden crear y modificar sesiones
CREATE POLICY "sessions_manage"
  ON fluxion.committee_sessions FOR ALL
  USING (
    organization_id = fluxion.auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE user_id = auth.uid()
      AND role IN ('org_admin', 'sgai_manager', 'caio')
    )
  );

CREATE INDEX idx_sessions_committee  ON fluxion.committee_sessions(committee_id);
CREATE INDEX idx_sessions_scheduled  ON fluxion.committee_sessions(scheduled_at);

-- Auto-incrementar session_number dentro de cada comité
CREATE OR REPLACE FUNCTION fluxion.set_session_number()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(session_number), 0) + 1
  INTO NEW.session_number
  FROM fluxion.committee_sessions
  WHERE committee_id = NEW.committee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_session_number
  BEFORE INSERT ON fluxion.committee_sessions
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_session_number();

CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON fluxion.committee_sessions
  FOR EACH ROW EXECUTE FUNCTION fluxion.update_updated_at();
