-- ============================================================================
-- FLUXION — Metadatos de la cabecera SoA
-- ============================================================================

CREATE TABLE IF NOT EXISTS fluxion.organization_soa_metadata (
    organization_id UUID PRIMARY KEY REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
    version TEXT DEFAULT '1.0',
    owner_name TEXT,
    approved_by TEXT,
    scope TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fluxion.organization_soa_metadata ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fluxion.organization_soa_metadata TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fluxion.organization_soa_metadata TO service_role;

DROP POLICY IF EXISTS "Users can read their org SoA metadata" ON fluxion.organization_soa_metadata;
CREATE POLICY "Users can read their org SoA metadata"
    ON fluxion.organization_soa_metadata FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM fluxion.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can insert their org SoA metadata" ON fluxion.organization_soa_metadata;
CREATE POLICY "Admins can insert their org SoA metadata"
    ON fluxion.organization_soa_metadata FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM fluxion.organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'editor', 'dpo')
        )
    );

DROP POLICY IF EXISTS "Admins can update their org SoA metadata" ON fluxion.organization_soa_metadata;
CREATE POLICY "Admins can update their org SoA metadata"
    ON fluxion.organization_soa_metadata FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM fluxion.organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'editor', 'dpo')
        )
    );
