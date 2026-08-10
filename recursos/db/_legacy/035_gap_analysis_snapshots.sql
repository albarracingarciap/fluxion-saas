-- ============================================================================
-- FLUXION — Snapshots organizacionales para análisis transversal de gaps
-- ============================================================================

ALTER TABLE fluxion.system_report_snapshots
  ALTER COLUMN ai_system_id DROP NOT NULL;

COMMENT ON TABLE fluxion.system_report_snapshots IS 'Snapshots persistidos de informes generados por sistema o a nivel organizacional.';
COMMENT ON COLUMN fluxion.system_report_snapshots.ai_system_id IS 'Sistema asociado cuando el informe es por sistema; null cuando el snapshot es transversal a la organización.';
COMMENT ON COLUMN fluxion.system_report_snapshots.report_type IS 'Tipo de informe generado, por ejemplo gap_report, technical_dossier o gap_analysis.';
