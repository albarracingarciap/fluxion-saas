-- ─────────────────────────────────────────────────────────────────────────────
-- Almacenamiento de objetos: convivencia Supabase Storage / MinIO (S3)
--
-- Los ficheros pesados (evidencias y, a partir de C1, documentos regulatorios)
-- pasan a MinIO. Los metadatos siguen aquí.
--
-- IMPORTANTE — lo que cambia y no da error:
-- Supabase Storage aplicaba RLS sobre storage.objects. MinIO no sabe quién es
-- el usuario. A partir de esta migración, el control de acceso a los ficheros
-- vive SOLO en el servidor de la aplicación: toda URL, de lectura o de
-- escritura, se firma después de comprobar organization_id. No hay red debajo.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.system_evidences
  ADD COLUMN IF NOT EXISTS storage_backend text NOT NULL DEFAULT 'supabase',
  ADD COLUMN IF NOT EXISTS storage_bucket  text,
  ADD COLUMN IF NOT EXISTS checksum_sha256 text;

ALTER TABLE fluxion.system_evidences
  DROP CONSTRAINT IF EXISTS chk_system_evidences_storage_backend;

ALTER TABLE fluxion.system_evidences
  ADD CONSTRAINT chk_system_evidences_storage_backend
  CHECK (storage_backend IN ('supabase', 's3'));

-- Un objeto en S3 necesita saber en qué bucket está; en Supabase el bucket era
-- implícito ('evidence-files'), así que las filas antiguas lo dejan a NULL.
ALTER TABLE fluxion.system_evidences
  DROP CONSTRAINT IF EXISTS chk_system_evidences_bucket_required;

ALTER TABLE fluxion.system_evidences
  ADD CONSTRAINT chk_system_evidences_bucket_required
  CHECK (storage_backend <> 's3' OR storage_bucket IS NOT NULL);

COMMENT ON COLUMN fluxion.system_evidences.storage_backend IS
  'Dónde vive el fichero: supabase (Storage, histórico) o s3 (MinIO). Las filas anteriores no se migran a la fuerza; el traslado es un script posterior e independiente.';

COMMENT ON COLUMN fluxion.system_evidences.checksum_sha256 IS
  'Huella del contenido subido. Permite demostrar que la evidencia entregada a un auditor es la misma que se registró.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Conteo de reparto, para vigilar el traslado sin tener que recordar la consulta
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW fluxion.v_evidence_storage_split AS
SELECT
  organization_id,
  storage_backend,
  count(*)                          AS evidencias,
  count(*) FILTER (WHERE checksum_sha256 IS NULL) AS sin_huella,
  sum(coalesce(file_size_bytes, 0)) AS bytes
FROM fluxion.system_evidences
WHERE storage_path IS NOT NULL
GROUP BY organization_id, storage_backend;

COMMENT ON VIEW fluxion.v_evidence_storage_split IS
  'Reparto de evidencias entre backends. Mientras haya filas en supabase, el bucket antiguo no se puede retirar.';
