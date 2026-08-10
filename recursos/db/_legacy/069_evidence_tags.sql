-- recursos/db/069_evidence_tags.sql
--
-- Añade tags libres (text[]) a system_evidences para clasificación
-- transversal: "pre-mercado", "post-despliegue", "auditoría 2026", etc.
--
-- Sin enum: los tags son strings libres normalizados en la capa de app
-- (trim + lowercase) para evitar duplicados semánticos.
-- El índice GIN permite búsquedas eficientes con el operador @>.

ALTER TABLE fluxion.system_evidences
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_system_evidences_tags
  ON fluxion.system_evidences USING GIN (tags);
