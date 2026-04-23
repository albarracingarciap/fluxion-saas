-- ============================================================================
-- FLUXION — 039: Reestructuración tablas core (profiles, invitations)
-- ============================================================================
-- ADVERTENCIA: Esta migración elimina todos los datos de prueba en fluxion.*
-- Las tablas maestras (compliance.*, rag.*) no se ven afectadas.
--
-- Cambios estructurales:
--   - profiles: nuevo modelo con PK propia, user_id separado, org + role embebidos
--   - organization_members: eliminada (rol y org migran a profiles)
--   - invitations: nuevo modelo con invitation_status ENUM y org_role
--   - current_organization_id(): actualizada al nuevo modelo
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PLACEHOLDERS DE FUNCIONES AUXILIARES
-- ─────────────────────────────────────────────────────────────────────────────
-- Se crean ANTES de cualquier DROP para que las políticas RLS existentes que
-- las referencian no fallen durante el proceso. Usan LANGUAGE plpgsql para
-- evitar validación de referencias a tablas en tiempo de creación.
-- Se reemplazarán con la implementación real en el paso 6, tras crear profiles.

CREATE OR REPLACE FUNCTION fluxion.auth_user_org_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = fluxion, public
AS $$
BEGIN
  RETURN NULL; -- placeholder: se reemplaza en paso 6
END;
$$;

CREATE OR REPLACE FUNCTION fluxion.current_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = fluxion, public
AS $$
BEGIN
  RETURN NULL; -- placeholder: se reemplaza en paso 6
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. LIMPIEZA DE DATOS DE PRUEBA
-- ─────────────────────────────────────────────────────────────────────────────
-- Trunca todas las tablas del schema fluxion en cascada.
-- compliance.* y rag.* no se tocan.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename FROM pg_tables WHERE schemaname = 'fluxion' ORDER BY tablename
  ) LOOP
    EXECUTE format('TRUNCATE TABLE fluxion.%I CASCADE', r.tablename);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. DROP TABLAS OBSOLETAS
-- ─────────────────────────────────────────────────────────────────────────────

-- organization_members desaparece: rol y org_id se mueven directamente a profiles
DROP TABLE IF EXISTS fluxion.organization_members CASCADE;

-- profiles se recrea con modelo multi-tenant (PK propia + user_id + organization_id)
DROP TABLE IF EXISTS fluxion.profiles CASCADE;
-- CASCADE elimina automáticamente las FK constraints en tablas dependientes
-- (fmea_evaluations, treatment_actions, etc.). Las columnas persisten pero sin FK.
-- Esas constraints se restaurarán en la Fase 7 cuando se toquen esos módulos.

-- invitations se recrea con nuevo modelo (invitation_status ENUM, org_role)
DROP TABLE IF EXISTS fluxion.invitations CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. FUNCIÓN Y TRIGGER: updated_at automático
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fluxion.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. NUEVA TABLA: profiles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE fluxion.profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id      UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  -- Identidad
  full_name            TEXT NOT NULL,
  display_name         TEXT,
  avatar_url           TEXT,
  job_title            TEXT,
  department           TEXT,

  -- Rol en la plataforma
  role                 fluxion.org_role NOT NULL DEFAULT 'viewer',
  platform_role        fluxion.platform_role,

  -- Estado
  is_active            BOOLEAN NOT NULL DEFAULT true,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,

  -- Copilot: activación gestionada por lógica de negocio (plan + rol)
  copilot_enabled      BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at       TIMESTAMPTZ,

  UNIQUE (user_id, organization_id)
);

ALTER TABLE fluxion.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON fluxion.profiles
  FOR EACH ROW EXECUTE FUNCTION fluxion.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. IMPLEMENTACIÓN REAL DE FUNCIONES AUXILIARES
-- ─────────────────────────────────────────────────────────────────────────────
-- Ahora que profiles existe, se reemplazan los placeholders del paso 1.

CREATE OR REPLACE FUNCTION fluxion.auth_user_org_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = fluxion, public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM fluxion.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN v_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION fluxion.current_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = fluxion, public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM fluxion.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN v_org_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. POLÍTICAS RLS: profiles
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_own_org" ON fluxion.profiles;
DROP POLICY IF EXISTS "profiles_update_own"     ON fluxion.profiles;
DROP POLICY IF EXISTS "profiles_admin_update"   ON fluxion.profiles;

CREATE POLICY "profiles_select_own_org"
  ON fluxion.profiles FOR SELECT
  USING (organization_id = fluxion.auth_user_org_id());

CREATE POLICY "profiles_update_own"
  ON fluxion.profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "profiles_admin_update"
  ON fluxion.profiles FOR UPDATE
  USING (organization_id = fluxion.auth_user_org_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. NUEVA TABLA: invitations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE fluxion.invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  email           TEXT NOT NULL,
  role            fluxion.org_role NOT NULL,
  system_ids      UUID[] DEFAULT '{}',

  token           TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status          fluxion.invitation_status NOT NULL DEFAULT 'pending',

  invited_by      UUID NOT NULL REFERENCES fluxion.profiles(id),

  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  accepted_at     TIMESTAMPTZ,
  message         TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Permite reinvitar al mismo email tras expiración o revocación
  UNIQUE (organization_id, email, status)
);

ALTER TABLE fluxion.invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invitations_org_admin" ON fluxion.invitations;

CREATE POLICY "invitations_org_admin"
  ON fluxion.invitations FOR ALL
  USING (organization_id = fluxion.auth_user_org_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. ACTUALIZAR RLS EN organizations
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Un miembro puede ver su organizacion"  ON fluxion.organizations;
DROP POLICY IF EXISTS "organizations_select_member"           ON fluxion.organizations;

CREATE POLICY "organizations_select_member"
  ON fluxion.organizations FOR SELECT
  USING (id = fluxion.auth_user_org_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ÍNDICES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_profiles_organization ON fluxion.profiles(organization_id);
CREATE INDEX idx_profiles_user         ON fluxion.profiles(user_id);
CREATE INDEX idx_profiles_role         ON fluxion.profiles(role);

CREATE INDEX idx_invitations_token     ON fluxion.invitations(token);
CREATE INDEX idx_invitations_email_org ON fluxion.invitations(email, organization_id);
CREATE INDEX idx_invitations_status    ON fluxion.invitations(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. FUNCIÓN: expiración de invitaciones
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fluxion.expire_invitations()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE fluxion.invitations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();
$$;
