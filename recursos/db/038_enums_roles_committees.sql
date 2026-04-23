-- ============================================================================
-- FLUXION — 038: ENUMs para sistema de roles y comités
-- ============================================================================

-- Roles de plataforma (cross-tenant, Nivel 0)
CREATE TYPE fluxion.platform_role AS ENUM (
  'platform_admin',
  'partner'
);

-- Roles de organización (Niveles 1-3)
CREATE TYPE fluxion.org_role AS ENUM (
  -- Nivel 1: Gobernanza y dirección
  'org_admin',
  'sgai_manager',
  'caio',
  'dpo',
  -- Nivel 2: Operacional
  'system_owner',
  'risk_analyst',
  'compliance_analyst',
  -- Nivel 3: Consulta y supervisión
  'executive',
  'auditor',
  'viewer'
);

-- Estado del ciclo de vida de una invitación
CREATE TYPE fluxion.invitation_status AS ENUM (
  'pending',
  'accepted',
  'expired',
  'revoked'
);

-- Tipos de comité (fijos por normativa ISO 42001 / AI Act)
CREATE TYPE fluxion.committee_type AS ENUM (
  'ai_committee',      -- Comité de IA (operacional, gestionado en Fluxion)
  'risk_committee',    -- Integración con comité de riesgos corporativo
  'director_review'    -- Revisión por la dirección §9.3 ISO 42001
);

-- Rol dentro del comité (ortogonal al org_role del perfil)
CREATE TYPE fluxion.committee_member_role AS ENUM (
  'president',   -- preside y convoca
  'secretary',   -- levanta acta, gestiona convocatorias
  'member',      -- miembro ordinario con voz y voto
  'advisor'      -- función consultiva, sin voto
);

-- Estado de una sesión de comité
CREATE TYPE fluxion.committee_session_status AS ENUM (
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);
