-- ============================================================================
-- FLUXION — 045: Split de la vista rag.corpus_status
-- ============================================================================
-- Tras el split de tablas (043 + 044), corpus_status solo cubre contenido
-- global. Se recrea explícitamente y se añade rag.org_corpus_status para
-- el contenido propio de cada organización.
-- La RLS de rag.organization_documents y rag.organization_chunks garantiza
-- que cada organización solo ve sus propios datos en org_corpus_status.
-- ============================================================================

-- Vista global: normativa regulatoria (sin organización)
CREATE OR REPLACE VIEW rag.corpus_status AS
SELECT
  d.source_type,
  d.short_name,
  d.language,
  d.version,
  d.total_chunks,
  d.total_tokens,
  d.last_ingested_at,
  count(c.id) FILTER (WHERE c.is_active)     AS active_chunks,
  count(c.id) FILTER (WHERE NOT c.is_active) AS inactive_chunks,
  max(c.created_at)                          AS last_chunk_at,
  CASE
    WHEN d.last_ingested_at < now() - INTERVAL '90 days' THEN true
    ELSE false
  END AS needs_refresh
FROM rag.documents d
LEFT JOIN rag.chunks c ON c.document_id = d.id
GROUP BY
  d.id, d.source_type, d.short_name, d.language, d.version,
  d.total_chunks, d.total_tokens, d.last_ingested_at
ORDER BY d.source_type, d.short_name;

-- Vista por organización: documentos propios (filtrada automáticamente por RLS)
CREATE OR REPLACE VIEW rag.org_corpus_status AS
SELECT
  d.organization_id,
  d.source_type,
  d.short_name,
  d.language,
  d.version,
  d.total_chunks,
  d.total_tokens,
  d.last_ingested_at,
  count(c.id) FILTER (WHERE c.is_active)     AS active_chunks,
  count(c.id) FILTER (WHERE NOT c.is_active) AS inactive_chunks,
  max(c.created_at)                          AS last_chunk_at,
  CASE
    WHEN d.last_ingested_at < now() - INTERVAL '90 days' THEN true
    ELSE false
  END AS needs_refresh
FROM rag.organization_documents d
LEFT JOIN rag.organization_chunks c ON c.document_id = d.id
GROUP BY
  d.id, d.organization_id, d.source_type, d.short_name, d.language, d.version,
  d.total_chunks, d.total_tokens, d.last_ingested_at
ORDER BY d.organization_id, d.source_type, d.short_name;
