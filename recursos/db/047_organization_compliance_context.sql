-- ============================================================================
-- FLUXION — 047: Contexto de cumplimiento inicial de la organización
-- ============================================================================
-- Campos capturados en el paso 2 del wizard de onboarding.
-- Se almacenan como columnas propias (no JSONB) por ser datos tipados,
-- consultables y con valor analítico.
-- ============================================================================

ALTER TABLE fluxion.organizations
  ADD COLUMN IF NOT EXISTS iso_42001_status    TEXT
    CHECK (iso_42001_status IN ('certified', 'in_progress', 'none')),
  ADD COLUMN IF NOT EXISTS iso_42001_cert_date DATE,
  ADD COLUMN IF NOT EXISTS iso_42001_cert_body TEXT,
  ADD COLUMN IF NOT EXISTS ai_inventory_status TEXT
    CHECK (ai_inventory_status IN ('complete', 'partial', 'none')),
  ADD COLUMN IF NOT EXISTS compliance_maturity INT
    CHECK (compliance_maturity IN (0, 25, 50, 75));

-- Constraint entre columnas: la fecha solo es válida si está certificado
ALTER TABLE fluxion.organizations
  ADD CONSTRAINT chk_iso_42001_cert_date
    CHECK (iso_42001_cert_date IS NULL OR iso_42001_status = 'certified');
