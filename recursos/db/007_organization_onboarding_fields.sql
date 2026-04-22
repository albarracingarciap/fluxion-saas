-- =========================================================================
-- FLUXION — Campos adicionales para onboarding de organización
-- =========================================================================
-- Ejecuta este script en Supabase SQL Editor para extender fluxion.organizations
-- con módulos normativos, país principal y apetito al riesgo.

ALTER TABLE fluxion.organizations
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Espana',
  ADD COLUMN IF NOT EXISTS normative_modules TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS apetito_riesgo TEXT DEFAULT 'moderado';

UPDATE fluxion.organizations
SET
  country = COALESCE(country, 'Espana'),
  normative_modules = COALESCE(normative_modules, '{}'),
  apetito_riesgo = COALESCE(apetito_riesgo, 'moderado');

ALTER TABLE fluxion.organizations
  ALTER COLUMN country SET DEFAULT 'Espana',
  ALTER COLUMN normative_modules SET DEFAULT '{}',
  ALTER COLUMN apetito_riesgo SET DEFAULT 'moderado';
