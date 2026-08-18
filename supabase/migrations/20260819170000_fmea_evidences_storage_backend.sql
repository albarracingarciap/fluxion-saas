-- ─────────────────────────────────────────────────────────────────────────────
-- El segundo modelo de evidencia también pasa a MinIO
--
-- Hay dos tablas de evidencia en la aplicación:
--   · fluxion.system_evidences — biblioteca de evidencias (ya en MinIO)
--   · fluxion.evidences        — adjuntos de las acciones del plan de
--                                tratamiento de FMEA, esta
--
-- Que existan dos es deuda anterior a este trabajo. Mientras no se unifiquen,
-- al menos que los ficheros vivan en el mismo sitio y con las mismas reglas:
-- tener la mitad de las evidencias en un almacén y la mitad en otro es cómo se
-- pierde la mitad en una restauración.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.evidences
  ADD COLUMN IF NOT EXISTS storage_backend text NOT NULL DEFAULT 'supabase',
  ADD COLUMN IF NOT EXISTS storage_bucket  text,
  ADD COLUMN IF NOT EXISTS checksum_sha256 text;

ALTER TABLE fluxion.evidences
  DROP CONSTRAINT IF EXISTS chk_fluxion_evidences_storage_backend;

ALTER TABLE fluxion.evidences
  ADD CONSTRAINT chk_fluxion_evidences_storage_backend
  CHECK (storage_backend IN ('supabase', 's3'));

ALTER TABLE fluxion.evidences
  DROP CONSTRAINT IF EXISTS chk_fluxion_evidences_bucket_required;

ALTER TABLE fluxion.evidences
  ADD CONSTRAINT chk_fluxion_evidences_bucket_required
  CHECK (storage_backend <> 's3' OR storage_bucket IS NOT NULL);

COMMENT ON COLUMN fluxion.evidences.storage_backend IS
  'Dónde vive el fichero: supabase (Storage, histórico) o s3 (MinIO).';

-- La vista de reparto cubre ahora las dos tablas, para que la comprobación de
-- "¿queda algo en Supabase Storage?" tenga una sola respuesta.
DROP VIEW IF EXISTS fluxion.v_evidence_storage_split;

CREATE VIEW fluxion.v_evidence_storage_split AS
SELECT 'system_evidences' AS origen, organization_id, storage_backend,
       count(*) AS evidencias,
       count(*) FILTER (WHERE checksum_sha256 IS NULL) AS sin_huella,
       sum(coalesce(file_size_bytes, 0)) AS bytes
  FROM fluxion.system_evidences
 WHERE storage_path IS NOT NULL
 GROUP BY organization_id, storage_backend
UNION ALL
SELECT 'evidences', organization_id, storage_backend,
       count(*),
       count(*) FILTER (WHERE checksum_sha256 IS NULL),
       sum(coalesce(file_size, 0))
  FROM fluxion.evidences
 WHERE storage_path IS NOT NULL
 GROUP BY organization_id, storage_backend;

COMMENT ON VIEW fluxion.v_evidence_storage_split IS
  'Reparto de ficheros de evidencia entre backends, en los dos modelos. Mientras haya filas en supabase, el bucket evidence-files no se puede retirar.';
