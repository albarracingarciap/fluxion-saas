-- recursos/db/015_organization_soa.sql

-- Tabla que almacena el SoA a nivel de organización (un documento único con 38 controles)
CREATE TABLE fluxion.organization_soa_controls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
    control_code TEXT NOT NULL,
    is_applicable BOOLEAN DEFAULT false,
    justification TEXT,
    status TEXT DEFAULT 'not_started',
    owner_user_id UUID REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
    validation_evidence_id UUID REFERENCES fluxion.system_evidences(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Cada organización solo puede tener 1 versión de un control específico (ej. 1 solo 'A.2.2')
    UNIQUE (organization_id, control_code)
);

-- Tabla puente que detalla la aplicabilidad específica de un control global a Sistemas de IA individuales
CREATE TABLE fluxion.organization_soa_system_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    soa_control_id UUID NOT NULL REFERENCES fluxion.organization_soa_controls(id) ON DELETE CASCADE,
    ai_system_id UUID NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE (soa_control_id, ai_system_id)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) & GRANTS
-- ==========================================
ALTER TABLE fluxion.organization_soa_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.organization_soa_system_links ENABLE ROW LEVEL SECURITY;

GRANT ALL ON fluxion.organization_soa_controls TO authenticated;
GRANT ALL ON fluxion.organization_soa_controls TO service_role;
GRANT ALL ON fluxion.organization_soa_system_links TO authenticated;
GRANT ALL ON fluxion.organization_soa_system_links TO service_role;

-- Políticas para fluxion.organization_soa_controls
CREATE POLICY "Users can view controls in their organization"
    ON fluxion.organization_soa_controls FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM fluxion.organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins and Editors can update controls"
    ON fluxion.organization_soa_controls FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM fluxion.organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'editor', 'dpo')
        )
    );

CREATE POLICY "Admins and Editors can insert controls"
    ON fluxion.organization_soa_controls FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM fluxion.organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'editor', 'dpo')
        )
    );

CREATE POLICY "Admins and Editors can delete controls"
    ON fluxion.organization_soa_controls FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM fluxion.organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'editor', 'dpo')
        )
    );

-- Políticas para fluxion.organization_soa_system_links
CREATE POLICY "Users can view system links in their organization"
    ON fluxion.organization_soa_system_links FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM fluxion.organization_soa_controls c
            WHERE c.id = soa_control_id
            AND c.organization_id IN (
                SELECT organization_id FROM fluxion.organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins and Editors can manage system links"
    ON fluxion.organization_soa_system_links FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM fluxion.organization_soa_controls c
            WHERE c.id = soa_control_id
            AND c.organization_id IN (
                SELECT organization_id FROM fluxion.organization_members
                WHERE user_id = auth.uid() AND role IN ('admin', 'editor', 'dpo')
            )
        )
    );

CREATE TRIGGER set_organization_soa_controls_updated_at
BEFORE UPDATE ON fluxion.organization_soa_controls
FOR EACH ROW
EXECUTE FUNCTION fluxion.set_updated_at();
