-- ============================================================================
-- FLUXION — 046: Split de rag.ingestion_jobs
-- ============================================================================
-- rag.ingestion_jobs referencia rag.documents(id), que tras la migración 043
-- solo contiene normativa global. No tiene FK a fluxion, así que no hay
-- riesgo de cascade, pero el split semántico es necesario para poder
-- trackear la ingesta de documentos propios de cada organización.
--
-- rag.ingestion_jobs     → trabajos de ingesta de normativa global (sin cambios)
-- rag.org_ingestion_jobs → trabajos de ingesta de documentos de org
-- ============================================================================

CREATE TABLE rag.org_ingestion_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id         UUID NOT NULL REFERENCES rag.organization_documents(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  status              TEXT NOT NULL DEFAULT 'pending',
  trigger             TEXT NOT NULL,

  chunks_created      INT NOT NULL DEFAULT 0,
  chunks_updated      INT NOT NULL DEFAULT 0,
  chunks_deleted      INT NOT NULL DEFAULT 0,
  tokens_processed    INT NOT NULL DEFAULT 0,
  embedding_cost_usd  NUMERIC(10, 6),
  error_message       TEXT,

  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_ingestion_jobs_document
  ON rag.org_ingestion_jobs(document_id, status);

CREATE INDEX idx_org_ingestion_jobs_org
  ON rag.org_ingestion_jobs(organization_id, status);

ALTER TABLE rag.org_ingestion_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rag_org_ingestion_jobs_select"
  ON rag.org_ingestion_jobs FOR SELECT
  USING (organization_id = fluxion.auth_user_org_id());
