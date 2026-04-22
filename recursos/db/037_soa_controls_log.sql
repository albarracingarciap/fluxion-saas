-- ============================================================================
-- FLUXION — Historial de cambios de controles del SoA
-- ============================================================================

CREATE TABLE IF NOT EXISTS fluxion.soa_controls_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    soa_control_id UUID NOT NULL REFERENCES fluxion.organization_soa_controls(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
    
    actor_user_id UUID REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
    
    control_code TEXT NOT NULL,
    is_applicable BOOLEAN,
    justification TEXT,
    status TEXT,
    notes TEXT,
    validation_evidence_id UUID,
    
    -- Almacenamos los IDs de los sistemas vinculados en el momento del cambio
    linked_system_ids JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para mejorar el rendimiento de consultas de historial
CREATE INDEX IF NOT EXISTS idx_soa_controls_log_control ON fluxion.soa_controls_log(soa_control_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_soa_controls_log_org ON fluxion.soa_controls_log(organization_id, created_at DESC);

ALTER TABLE fluxion.soa_controls_log ENABLE ROW LEVEL SECURITY;

GRANT ALL ON fluxion.soa_controls_log TO authenticated;
GRANT ALL ON fluxion.soa_controls_log TO service_role;

-- Políticas RLS
DROP POLICY IF EXISTS "Users can read log of their org" ON fluxion.soa_controls_log;
CREATE POLICY "Users can read log of their org"
    ON fluxion.soa_controls_log FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM fluxion.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins/Editors can insert log" ON fluxion.soa_controls_log;
CREATE POLICY "Admins/Editors can insert log"
    ON fluxion.soa_controls_log FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM fluxion.organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'editor', 'dpo')
        )
    );

COMMENT ON TABLE fluxion.soa_controls_log IS 'Log de auditoría que registra cada cambio realizado en los controles del SoA.';
