-- ============================================================================
-- FLUXION — 047: Contexto de cumplimiento inicial de la organización
-- ============================================================================
-- Campos capturados en el paso 2 del wizard de onboarding.
-- Se almacenan como columnas propias (no JSONB) por ser datos tipados,
-- consultables y con valor analítico.
-- ============================================================================

ALTER TABLE fluxion.organizations
  -- Estado de certificación ISO 42001
  ADD COLUMN IF NOT EXISTS iso_42001_status    TEXT
    CHECK (iso_42001_status IN ('certified', 'in_progress', 'none')),

  -- Fecha y entidad certificadora (solo relevantes si iso_42001_status = 'certified')
  ADD COLUMN IF NOT EXISTS iso_42001_cert_date DATE,
  ADD COLUMN IF NOT EXISTS iso_42001_cert_body TEXT,

  CONSTRAINT chk_iso_42001_cert_date
    CHECK (
      iso_42001_cert_date IS NULL OR iso_42001_status = 'certified'
    ),

  -- Estado del inventario de sistemas IA previo al alta en Fluxion
  ADD COLUMN IF NOT EXISTS ai_inventory_status TEXT
    CHECK (ai_inventory_status IN ('complete', 'partial', 'none')),

  -- Madurez de cumplimiento autoevaluada (0, 25, 50, 75)
  ADD COLUMN IF NOT EXISTS compliance_maturity INT
    CHECK (compliance_maturity IN (0, 25, 50, 75));
