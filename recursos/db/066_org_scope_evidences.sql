-- recursos/db/066_org_scope_evidences.sql
--
-- Habilita evidencias de ámbito organizacional (políticas corporativas,
-- certificaciones ISO 42001, planes de formación, etc.) que no pertenecen
-- a un sistema concreto sino a toda la organización.
--
-- Cambios:
--   1. Nueva columna `scope` ('system' | 'organization') con default 'system'.
--   2. ai_system_id pasa a ser nullable.
--   3. CHECK de integridad: scope='system' ↔ ai_system_id NOT NULL.
--      Todas las filas existentes (scope='system') siguen siendo válidas.

-- 1. Columna scope
ALTER TABLE fluxion.system_evidences
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'system';

ALTER TABLE fluxion.system_evidences
  ADD CONSTRAINT chk_system_evidences_scope_enum
  CHECK (scope IN ('system', 'organization'));

-- 2. ai_system_id nullable
ALTER TABLE fluxion.system_evidences
  ALTER COLUMN ai_system_id DROP NOT NULL;

-- 3. Integridad scope ↔ ai_system_id
ALTER TABLE fluxion.system_evidences
  ADD CONSTRAINT chk_system_evidences_scope_system_id
  CHECK (
    (scope = 'system'       AND ai_system_id IS NOT NULL) OR
    (scope = 'organization' AND ai_system_id IS NULL)
  );
