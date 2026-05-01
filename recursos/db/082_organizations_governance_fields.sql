-- 082 · Campos de gobernanza en organizations
-- Organización matriz, DPO y auditor externo designado.

ALTER TABLE fluxion.organizations
  ADD COLUMN IF NOT EXISTS parent_org_id            uuid REFERENCES fluxion.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dpo_name                 text,
  ADD COLUMN IF NOT EXISTS dpo_email                text,
  ADD COLUMN IF NOT EXISTS dpo_phone                text,
  ADD COLUMN IF NOT EXISTS external_auditor_name    text,
  ADD COLUMN IF NOT EXISTS external_auditor_contact text,
  ADD COLUMN IF NOT EXISTS external_auditor_cert    text;

CREATE INDEX IF NOT EXISTS idx_organizations_parent_org_id
  ON fluxion.organizations (parent_org_id)
  WHERE parent_org_id IS NOT NULL;

COMMENT ON COLUMN fluxion.organizations.parent_org_id            IS 'Organización matriz o holding (autorreferencia)';
COMMENT ON COLUMN fluxion.organizations.dpo_name                 IS 'Nombre del Delegado de Protección de Datos (DPO)';
COMMENT ON COLUMN fluxion.organizations.dpo_email                IS 'Email de contacto del DPO';
COMMENT ON COLUMN fluxion.organizations.dpo_phone                IS 'Teléfono del DPO';
COMMENT ON COLUMN fluxion.organizations.external_auditor_name    IS 'Nombre del auditor externo designado';
COMMENT ON COLUMN fluxion.organizations.external_auditor_contact IS 'Email o teléfono de contacto del auditor externo';
COMMENT ON COLUMN fluxion.organizations.external_auditor_cert    IS 'Certificación o acreditación del auditor (ej. ISO 27001 Lead Auditor)';
