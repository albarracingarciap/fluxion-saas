═══════════════════════════════════════════════════════════════════════
PARTE 1 — MODELO DE DATOS PRINCIPAL INICIAL
═══════════════════════════════════════════════════════════════════════

SCHEMA: fluxion

-- Organizaciones (tenants)
CREATE TABLE fluxion.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- para URLs amigables
  sector TEXT, -- 'banking'|'healthcare'|'public'|'other'
  country TEXT DEFAULT 'Espana', -- país principal del tenant (UE por ahora)
  size TEXT, -- 'small'|'medium'|'large'
  geography TEXT[] DEFAULT '{}',
  active_modules TEXT[] DEFAULT '{}', -- módulos contratados
  normative_modules TEXT[] DEFAULT '{}', -- AI Act, ISO 42001, DORA, RGPD, ENS, MDR/IVDR
  apetito_riesgo TEXT DEFAULT 'moderado', -- 'conservador'|'moderado'|'amplio'
  plan TEXT DEFAULT 'starter', -- 'starter'|'professional'|'enterprise'|'partner'
  plan_started_at TIMESTAMPTZ,
  plan_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  logo_url TEXT, -- Añadido para gestionar el almacenamiento en org-logos
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Perfiles de usuario (extiende auth.users de Supabase puramente)
CREATE TABLE fluxion.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}', -- idioma, notificaciones, etc.
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Miembros de la organización (El puente Multi-Tenant para "Partners")
CREATE TABLE fluxion.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES fluxion.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  -- roles: 'admin'|'dpo'|'technical'|'executive'|'auditor'|'viewer'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id) -- Un mismo usuario no puede tener dos roles diferentes en la misma empresa simultáneamente
);

-- Invitaciones pendientes
CREATE TABLE fluxion.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, email) -- Evita spam de tokens duplicados a la misma persona en la misma empresa
);
