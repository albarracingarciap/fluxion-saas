-- 081 · Campos legales en organizations
-- Razón social, identificadores fiscales, web, descripción y domicilio fiscal.
-- El domicilio se almacena en un jsonb para no fragmentar en 4 columnas planas.

ALTER TABLE fluxion.organizations
  ADD COLUMN IF NOT EXISTS legal_name          text,
  ADD COLUMN IF NOT EXISTS tax_id              text,
  ADD COLUMN IF NOT EXISTS vat_number          text,
  ADD COLUMN IF NOT EXISTS lei_code            text,
  ADD COLUMN IF NOT EXISTS website             text,
  ADD COLUMN IF NOT EXISTS description         text,
  ADD COLUMN IF NOT EXISTS registered_address  jsonb;

-- Índice para búsquedas por tax_id (útil en contexto multitenancy)
CREATE INDEX IF NOT EXISTS idx_organizations_tax_id
  ON fluxion.organizations (tax_id)
  WHERE tax_id IS NOT NULL;

COMMENT ON COLUMN fluxion.organizations.legal_name         IS 'Razón social oficial (denominación registral)';
COMMENT ON COLUMN fluxion.organizations.tax_id             IS 'CIF / NIF / número de identificación fiscal';
COMMENT ON COLUMN fluxion.organizations.vat_number         IS 'Número de IVA intracomunitario (ej. ES-B12345678)';
COMMENT ON COLUMN fluxion.organizations.lei_code           IS 'Legal Entity Identifier (20 caracteres ISO 17442)';
COMMENT ON COLUMN fluxion.organizations.website            IS 'URL del sitio web corporativo';
COMMENT ON COLUMN fluxion.organizations.description        IS 'Descripción pública de la entidad';
COMMENT ON COLUMN fluxion.organizations.registered_address IS 'Domicilio fiscal: {street, city, postal_code, country}';
