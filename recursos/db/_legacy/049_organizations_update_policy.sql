-- ============================================================================
-- FLUXION — 049: Política UPDATE en organizations para org_admin
-- ============================================================================
-- La tabla organizations solo tenía política SELECT. saveOnboarding (y cualquier
-- otra acción que actualice la organización) necesita una política UPDATE para
-- que el rol authenticated pueda escribir en su propia organización.
-- Sin esta política, el UPDATE de RLS filtra las filas silenciosamente (0 rows
-- afectadas, sin error), por lo que los datos del wizard no se persistían.
--
-- Validación de impacto:
--   - Solo afecta fluxion.organizations. Sin FKs desde compliance.* ni rag.*
--     apuntando a esta tabla, no hay riesgo de cascade.
-- ============================================================================

-- GRANT UPDATE para el rol authenticated (no estaba incluido en 048)
GRANT SELECT, INSERT, UPDATE ON fluxion.organizations TO authenticated;

-- Política UPDATE: solo el org_admin de la organización puede modificarla
DROP POLICY IF EXISTS "organizations_update_admin" ON fluxion.organizations;

CREATE POLICY "organizations_update_admin"
  ON fluxion.organizations FOR UPDATE
  USING (
    id = fluxion.auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND role = 'org_admin'
    )
  );
