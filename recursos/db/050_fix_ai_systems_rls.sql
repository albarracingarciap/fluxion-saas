-- 050_fix_ai_systems_rls.sql
-- Las políticas RLS de ai_systems referenciaban fluxion.organization_members
-- (tabla eliminada en 039). Se reemplazan usando fluxion.profiles.

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "org_members_select"  ON fluxion.ai_systems;
DROP POLICY IF EXISTS "org_members_insert"  ON fluxion.ai_systems;
DROP POLICY IF EXISTS "org_editors_update"  ON fluxion.ai_systems;
DROP POLICY IF EXISTS "org_admin_delete"    ON fluxion.ai_systems;

-- SELECT: cualquier miembro de la organización puede leer
CREATE POLICY "org_members_select"
  ON fluxion.ai_systems FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

-- INSERT: cualquier miembro autenticado puede registrar sistemas
CREATE POLICY "org_members_insert"
  ON fluxion.ai_systems FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

-- UPDATE: roles con capacidad de edición
CREATE POLICY "org_editors_update"
  ON fluxion.ai_systems FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.ai_systems.organization_id
        AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner', 'risk_analyst', 'compliance_analyst')
    )
  );

-- DELETE: solo org_admin puede eliminar
CREATE POLICY "org_admin_delete"
  ON fluxion.ai_systems FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.ai_systems.organization_id
        AND role = 'org_admin'
    )
  );
