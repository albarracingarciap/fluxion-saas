-- 083 · Políticas de retención de datos en organizations
-- Plazos de retención por categoría, expresados en meses.
-- Valores por defecto alineados con RGPD + AI Act (art. 12 y 72).

ALTER TABLE fluxion.organizations
  ADD COLUMN IF NOT EXISTS evidence_retention_months      integer NOT NULL DEFAULT 84,
  ADD COLUMN IF NOT EXISTS audit_log_retention_months     integer NOT NULL DEFAULT 36,
  ADD COLUMN IF NOT EXISTS personal_data_retention_months integer NOT NULL DEFAULT 60;

COMMENT ON COLUMN fluxion.organizations.evidence_retention_months      IS 'Meses de retención de documentos de evidencia (defecto: 84 = 7 años)';
COMMENT ON COLUMN fluxion.organizations.audit_log_retention_months     IS 'Meses de retención de logs de auditoría (defecto: 36 = 3 años)';
COMMENT ON COLUMN fluxion.organizations.personal_data_retention_months IS 'Meses de retención de datos personales procesados por sistemas IA (defecto: 60 = 5 años)';
