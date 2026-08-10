-- recursos/db/059_soa_metadata_fields.sql
--
-- Amplía organization_soa_metadata con campos requeridos ISO 42001:
--   - approved_at DATE              (fecha de aprobación)
--   - approved_by_role TEXT         (cargo/rol del aprobador)
--   - next_review_date DATE         (fecha de próxima revisión)
--   - scope_system_tags TEXT[]      (tags de sistemas incluidos en el alcance)
--
-- Además corrige las políticas RLS que aún referencian
-- fluxion.organization_members (eliminada en migración 039).

-- ============================================================
-- 1. Nuevas columnas
-- ============================================================

ALTER TABLE fluxion.organization_soa_metadata
    ADD COLUMN IF NOT EXISTS approved_at DATE,
    ADD COLUMN IF NOT EXISTS approved_by_role TEXT,
    ADD COLUMN IF NOT EXISTS next_review_date DATE,
    ADD COLUMN IF NOT EXISTS scope_system_tags TEXT[] DEFAULT '{}';

-- ============================================================
-- 2. Corrección de políticas RLS
-- ============================================================

DROP POLICY IF EXISTS "Users can read their org SoA metadata"   ON fluxion.organization_soa_metadata;
DROP POLICY IF EXISTS "Admins can insert their org SoA metadata" ON fluxion.organization_soa_metadata;
DROP POLICY IF EXISTS "Admins can update their org SoA metadata" ON fluxion.organization_soa_metadata;

-- SELECT: cualquier miembro de la organización
CREATE POLICY "soa_metadata_select"
    ON fluxion.organization_soa_metadata FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM fluxion.profiles
            WHERE user_id = auth.uid()
        )
    );

-- INSERT: roles de gestión
CREATE POLICY "soa_metadata_insert"
    ON fluxion.organization_soa_metadata FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM fluxion.profiles
            WHERE user_id = auth.uid()
              AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'compliance_analyst')
        )
    );

-- UPDATE: roles de gestión
CREATE POLICY "soa_metadata_update"
    ON fluxion.organization_soa_metadata FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM fluxion.profiles
            WHERE user_id = auth.uid()
              AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo', 'compliance_analyst')
        )
    );
