-- recursos/db/058_fix_soa_rls.sql
--
-- Corrige las políticas RLS de las tablas SoA que referenciaban
-- fluxion.organization_members (eliminada en migración 039).
-- Patrón correcto: fluxion.profiles WHERE user_id = auth.uid()
--
-- Tablas afectadas:
--   fluxion.organization_soa_controls
--   fluxion.organization_soa_system_links

-- ============================================================
-- 1. organization_soa_controls
-- ============================================================

DROP POLICY IF EXISTS "Users can view controls in their organization"    ON fluxion.organization_soa_controls;
DROP POLICY IF EXISTS "Admins and Editors can update controls"           ON fluxion.organization_soa_controls;
DROP POLICY IF EXISTS "Admins and Editors can insert controls"           ON fluxion.organization_soa_controls;
DROP POLICY IF EXISTS "Admins and Editors can delete controls"           ON fluxion.organization_soa_controls;

-- SELECT: cualquier miembro de la organización
CREATE POLICY "soa_controls_select"
    ON fluxion.organization_soa_controls FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM fluxion.profiles
            WHERE user_id = auth.uid()
        )
    );

-- INSERT: solo roles con capacidad de gestión
CREATE POLICY "soa_controls_insert"
    ON fluxion.organization_soa_controls FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM fluxion.profiles
            WHERE user_id = auth.uid()
              AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'compliance_analyst')
        )
    );

-- UPDATE: mismos roles que INSERT
CREATE POLICY "soa_controls_update"
    ON fluxion.organization_soa_controls FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM fluxion.profiles
            WHERE user_id = auth.uid()
              AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'compliance_analyst')
        )
    );

-- DELETE: solo admins
CREATE POLICY "soa_controls_delete"
    ON fluxion.organization_soa_controls FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM fluxion.profiles
            WHERE user_id = auth.uid()
              AND role IN ('org_admin', 'sgai_manager', 'caio')
        )
    );

-- ============================================================
-- 2. organization_soa_system_links
-- ============================================================

DROP POLICY IF EXISTS "Users can view system links in their organization" ON fluxion.organization_soa_system_links;
DROP POLICY IF EXISTS "Admins and Editors can manage system links"        ON fluxion.organization_soa_system_links;

-- SELECT: cualquier miembro de la organización
CREATE POLICY "soa_system_links_select"
    ON fluxion.organization_soa_system_links FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM fluxion.organization_soa_controls c
            WHERE c.id = soa_control_id
              AND c.organization_id IN (
                  SELECT organization_id FROM fluxion.profiles
                  WHERE user_id = auth.uid()
              )
        )
    );

-- ALL (insert/update/delete): roles de gestión
CREATE POLICY "soa_system_links_manage"
    ON fluxion.organization_soa_system_links FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM fluxion.organization_soa_controls c
            WHERE c.id = soa_control_id
              AND c.organization_id IN (
                  SELECT organization_id FROM fluxion.profiles
                  WHERE user_id = auth.uid()
                    AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'compliance_analyst')
              )
        )
    );
