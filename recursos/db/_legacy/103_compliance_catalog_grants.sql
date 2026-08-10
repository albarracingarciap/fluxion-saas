-- 103: grants para tablas del catálogo compliance (nuevas y preexistentes sin permisos)

GRANT ALL ON compliance.evidence_types             TO anon, authenticated, service_role;
GRANT ALL ON compliance.obligations                TO anon, authenticated, service_role;
GRANT ALL ON compliance.obligation_evidence_types  TO anon, authenticated, service_role;
GRANT ALL ON compliance.control_templates          TO anon, authenticated, service_role;
GRANT ALL ON compliance.failure_mode_control_refs  TO anon, authenticated, service_role;
GRANT ALL ON compliance.failure_modes              TO anon, authenticated, service_role;
GRANT ALL ON compliance.failure_mode_causal_relations TO anon, authenticated, service_role;
GRANT ALL ON compliance.risk_dimensions            TO anon, authenticated, service_role;

-- Evita repetir GRANTs en futuras tablas del schema compliance
ALTER DEFAULT PRIVILEGES IN SCHEMA compliance
  GRANT ALL ON TABLES    TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA compliance
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
