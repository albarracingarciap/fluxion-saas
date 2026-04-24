-- ============================================================================
-- FLUXION — 048: Restaurar GRANTs en tablas nuevas y recreadas
-- ============================================================================
-- Las migraciones 039-046 hicieron DROP+CREATE de varias tablas (profiles,
-- invitations) y crearon otras nuevas (committees, organization_chunks, etc.).
-- Al recrear una tabla en PostgreSQL se pierden los GRANTs anteriores.
-- Esta migración los restaura todos de una vez.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SCHEMA USAGE (imprescindible para que los roles puedan ver las tablas)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA fluxion TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA rag      TO authenticated, anon, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABLAS RECREADAS EN 039 (profiles, invitations)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.profiles     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.invitations  TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TABLAS NUEVAS EN 040 (profile_systems)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.profile_systems TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TABLAS NUEVAS EN 041 (committees)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.committees         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.committee_members  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.committee_sessions TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TABLAS NUEVAS EN 043-044 (RAG split)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON rag.organization_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rag.organization_chunks    TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TABLA NUEVA EN 046 (org_ingestion_jobs)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON rag.org_ingestion_jobs TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. FUNCIONES SECURITY DEFINER: acceso desde authenticated y anon
-- ─────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION fluxion.auth_user_org_id()      TO authenticated, anon;
GRANT EXECUTE ON FUNCTION fluxion.current_organization_id() TO authenticated, anon;
