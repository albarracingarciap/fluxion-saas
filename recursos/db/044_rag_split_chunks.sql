-- ============================================================================
-- FLUXION — 044: Split rag.chunks en global y por organización
-- ============================================================================
-- Complementa la migración 043. rag.chunks tenía el mismo problema:
-- organization_id nullable con FK a fluxion.organizations sin CASCADE,
-- pero vulnerable a TRUNCATE CASCADE desde fluxion.
--
-- Resultado:
--   - rag.chunks              → solo chunks de normativa global.
--                               document_id → rag.documents (global)
--   - rag.organization_chunks → chunks de documentos propios de org.
--                               document_id → rag.organization_documents
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. LIMPIAR rag.chunks: eliminar organization_id y FK a fluxion
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE rag.chunks
  DROP CONSTRAINT IF EXISTS chunks_organization_id_fkey;

-- Indexes parciales que filtraban por organization_id
DROP INDEX IF EXISTS rag.idx_chunks_platform_hnsw;
DROP INDEX IF EXISTS rag.idx_chunks_org_source;

ALTER TABLE rag.chunks DROP COLUMN IF EXISTS organization_id;

-- Recrear el HNSW global (sin filtro de org, ahora todos los chunks son globales)
CREATE INDEX idx_chunks_global_hnsw
  ON rag.chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE is_active = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. NUEVA TABLA: rag.organization_chunks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE rag.organization_chunks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES rag.organization_documents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  source_type     rag.source_type NOT NULL,
  chunk_type      rag.chunk_type NOT NULL,
  chunk_index     INT NOT NULL,
  section_ref     TEXT,
  parent_section  TEXT,
  content         TEXT NOT NULL,
  content_tokens  INT NOT NULL,
  summary         TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  embedding       public.vector,
  short_name      TEXT,
  language        TEXT NOT NULL DEFAULT 'es',
  is_active       BOOLEAN NOT NULL DEFAULT true,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (document_id, chunk_index)
);

-- Vector search por organización
CREATE INDEX idx_org_chunks_embedding_hnsw
  ON rag.organization_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE is_active = true;

-- Búsqueda por doc y org
CREATE INDEX idx_org_chunks_document
  ON rag.organization_chunks(document_id)
  WHERE is_active = true;

CREATE INDEX idx_org_chunks_org_source
  ON rag.organization_chunks(organization_id, source_type)
  WHERE is_active = true;

CREATE INDEX idx_org_chunks_short_name
  ON rag.organization_chunks(short_name)
  WHERE is_active = true AND short_name IS NOT NULL;

-- FTS español
CREATE INDEX idx_org_chunks_fts_es
  ON rag.organization_chunks USING gin (to_tsvector('spanish', content))
  WHERE is_active = true AND (language IS NULL OR language = 'es');

-- FTS inglés
CREATE INDEX idx_org_chunks_fts_en
  ON rag.organization_chunks USING gin (to_tsvector('english', content))
  WHERE is_active = true AND language = 'en';

CREATE INDEX idx_org_chunks_metadata_gin
  ON rag.organization_chunks USING gin (metadata);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS
-- ─────────────────────────────────────────────────────────────────────────────

-- rag.chunks: lectura global para usuarios autenticados (sin cambios semánticos)
-- La policy existente sigue siendo válida.

-- rag.organization_chunks: solo miembros de la org
ALTER TABLE rag.organization_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rag_org_chunks_select"
  ON rag.organization_chunks FOR SELECT
  USING (organization_id = fluxion.auth_user_org_id());
