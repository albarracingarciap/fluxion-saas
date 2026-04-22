ALTER TABLE fluxion.ai_systems
  ADD COLUMN IF NOT EXISTS iso_42001_checks JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN fluxion.ai_systems.iso_42001_checks IS 'Snapshot JSON de checks ISO 42001, pesos y puntos obtenidos en el momento de guardado.';
