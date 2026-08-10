-- ============================================================================
-- FLUXION — 073: GRANTs para la tabla tasks
-- ============================================================================
-- La migración 072 creó fluxion.tasks con RLS habilitado pero sin GRANT a los
-- roles de Supabase. Sin GRANT, el rol authenticated no puede hacer DML aunque
-- las políticas RLS lo permitan.
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.tasks TO authenticated;
GRANT SELECT                          ON fluxion.tasks TO anon;
