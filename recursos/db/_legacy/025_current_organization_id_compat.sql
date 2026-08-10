-- ============================================================================
-- FLUXION — Compat shim for 021_treatment_schema.sql
-- ============================================================================
-- 021_treatment_schema.sql referencia fluxion.current_organization_id()
-- en sus policies. El proyecto actual no usa esa función como patrón base
-- de aislamiento, pero la definimos aquí para permitir aplicar 021 y luego
-- sustituir esas policies con 023_treatment_schema_patch.sql.

CREATE OR REPLACE FUNCTION fluxion.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT organization_id
  FROM fluxion.organization_members
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1
$$;

COMMENT ON FUNCTION fluxion.current_organization_id() IS
  'Shim de compatibilidad para migraciones legacy de treatment schema. 023 reemplaza las policies que la usan por el patrón real basado en organization_members.';
