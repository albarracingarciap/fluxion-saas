-- =========================================================================
-- FLUXION SAAS — SCRIPT DE INICIALIZACIÓN (TABLAS + RLS)
-- =========================================================================
-- Instrucciones: Ejecuta este código completo en la sección "SQL Editor" de Supabase

-- 1. CREACIÓN DEL ESQUEMA AISLADO
CREATE SCHEMA IF NOT EXISTS fluxion;

-- 2. TABLAS FRONTALES
-- Organizaciones (tenants)
CREATE TABLE fluxion.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sector TEXT,
  size TEXT,
  geography TEXT[] DEFAULT '{}',
  active_modules TEXT[] DEFAULT '{}',
  plan TEXT DEFAULT 'starter',
  plan_started_at TIMESTAMPTZ,
  plan_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Perfiles de usuario (conectado al auth.users nativo)
CREATE TABLE fluxion.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Miembros de la organización (El Context Switcher / Partner bridge)
CREATE TABLE fluxion.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES fluxion.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Invitaciones pendientes (Sistema anti-spam autoexpirable)
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
  UNIQUE(organization_id, email)
);

-- =========================================================================
-- 3. HABILITACIÓN DE RLS (Row Level Security Obligatoria)
-- =========================================================================
ALTER TABLE fluxion.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.invitations ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 4. POLÍTICAS DE LECTURA SEGURA PARA EL FRONTEND (Next.js con ANON_KEY)
--    (Las escrituras/borrados se delegan a la API FastAPI con SERVICE_KEY)
-- =========================================================================

-- PERFILES: Un usuario logueado solo puede LEER y ACTUALIZAR su propio perfil
CREATE POLICY "Un usuario puede ver su propio perfil" 
  ON fluxion.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Un usuario puede actualizar su perfil" 
  ON fluxion.profiles FOR UPDATE USING (auth.uid() = id);

-- ORGANIZACIONES: Solo puedes ver la empresa si estás en la tabla de miembros
CREATE POLICY "Un miembro puede ver su organizacion" 
  ON fluxion.organizations FOR SELECT USING (
    id IN (SELECT organization_id FROM fluxion.organization_members WHERE user_id = auth.uid())
);

-- MIEMBROS: Puedes ver los IDs y roles de tus compañeros en la misma organización
CREATE POLICY "Un miembro puede ver a los demas" 
  ON fluxion.organization_members FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM fluxion.organization_members WHERE user_id = auth.uid())
);

-- INVITACIONES: Puedes ver si hay invitaciones pendientes exclusivas de tu empresa
CREATE POLICY "Un miembro puede ver el estado de sus invitaciones" 
  ON fluxion.invitations FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM fluxion.organization_members WHERE user_id = auth.uid())
);
