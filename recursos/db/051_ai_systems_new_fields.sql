-- 051_ai_systems_new_fields.sql
-- Columnas nuevas requeridas por el wizard de alta de sistemas (v2)

ALTER TABLE fluxion.ai_systems
  -- Step 4: bases legales Art. 9.2 RGPD para categorías especiales
  ADD COLUMN IF NOT EXISTS legal_bases_art9      TEXT[]  NOT NULL DEFAULT '{}',
  -- Step 4: transferencias internacionales de datos (Cap. V RGPD)
  ADD COLUMN IF NOT EXISTS intl_data_transfers   BOOLEAN NOT NULL DEFAULT FALSE,
  -- Step 5: nombre del modelo OSS usado (cuando origin = 'oss')
  ADD COLUMN IF NOT EXISTS oss_model_name        TEXT,
  -- Step 5: licencia del modelo OSS (ej. MIT, Apache-2.0, Llama 3)
  ADD COLUMN IF NOT EXISTS oss_license           TEXT,
  -- Step 5: ¿el sistema tiene mecanismo de explicabilidad? (Art. 13 AI Act) — si/parcial/no
  ADD COLUMN IF NOT EXISTS has_explainability    fluxion.doc_status,
  -- Step 6: fecha de la última revisión formal del sistema
  ADD COLUMN IF NOT EXISTS last_review_date      DATE;

COMMENT ON COLUMN fluxion.ai_systems.legal_bases_art9    IS 'Bases legales Art. 9.2 RGPD aplicables cuando se tratan categorías especiales';
COMMENT ON COLUMN fluxion.ai_systems.intl_data_transfers IS 'El sistema transfiere datos personales a terceros países (Cap. V RGPD)';
COMMENT ON COLUMN fluxion.ai_systems.oss_model_name      IS 'Nombre del modelo open-source base (ej. Llama 3.1, Mistral 7B)';
COMMENT ON COLUMN fluxion.ai_systems.oss_license         IS 'Licencia del modelo OSS (ej. MIT, Apache-2.0, Llama 3 Community)';
COMMENT ON COLUMN fluxion.ai_systems.has_explainability  IS 'El sistema incorpora mecanismo de explicabilidad de decisiones (Art. 13 AI Act)';
COMMENT ON COLUMN fluxion.ai_systems.last_review_date    IS 'Fecha de la última revisión formal del sistema';
