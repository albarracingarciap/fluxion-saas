-- ============================================================================
-- FLUXION — 043: Split rag.documents en global y por organización
-- ============================================================================
-- Problema: rag.documents mezclaba normativa global (AI Act, ISO 42001...)
-- con documentos propios de cada org usando organization_id nullable.
-- El FK a fluxion.organizations provocó pérdida de datos globales al hacer
-- TRUNCATE CASCADE sobre fluxion.organizations en la migración 039.
--
-- Solución:
--   - rag.documents       → solo normativa global. Sin FK a fluxion.
--   - rag.organization_documents → documentos propios de org. FK con CASCADE.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. LIMPIAR rag.documents: eliminar organization_id y su FK
-- ─────────────────────────────────────────────────────────────────────────────

-- Mover documentos de org a la nueva tabla antes de borrar la columna.
-- (Tabla vacía ahora por el incidente, pero la lógica queda documentada.)

ALTER TABLE rag.documents
  DROP CONSTRAINT IF EXISTS documents_organization_id_fkey,
  DROP CONSTRAINT IF EXISTS uq_doc_title_version;

DROP INDEX IF EXISTS rag.idx_documents_org;

-- Eliminar la columna que vinculaba normativa global con tenants
ALTER TABLE rag.documents DROP COLUMN IF EXISTS organization_id;

-- Nuevo unique constraint sin organization_id (normativa global es única por título+versión)
ALTER TABLE rag.documents
  ADD CONSTRAINT uq_doc_title_version UNIQUE (title, version);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. NUEVA TABLA: rag.organization_documents
-- ─────────────────────────────────────────────────────────────────────────────
-- Documentos propios de cada organización: políticas internas, procedimientos,
-- evidencias propias, guías personalizadas. Indexables y buscables por vector.
-- El CASCADE aquí es correcto: si se elimina la org, se eliminan sus docs.

CREATE TABLE rag.organization_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  source_type      rag.source_type NOT NULL,
  title            TEXT NOT NULL,
  short_name       TEXT NOT NULL,
  language         TEXT NOT NULL DEFAULT 'es',
  version          TEXT,
  url              TEXT,

  total_chunks     INT NOT NULL DEFAULT 0,
  total_tokens     INT NOT NULL DEFAULT 0,
  last_ingested_at TIMESTAMPTZ,
  checksum         TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organization_id, title, version)
);

CREATE INDEX idx_org_documents_org
  ON rag.organization_documents(organization_id);

CREATE INDEX idx_org_documents_source_type
  ON rag.organization_documents(source_type, language);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS
-- ─────────────────────────────────────────────────────────────────────────────

-- rag.documents: lectura global para cualquier usuario autenticado
DROP POLICY IF EXISTS "Lectura RAG autorizada" ON rag.documents;
CREATE POLICY "rag_documents_global_read"
  ON rag.documents FOR SELECT
  USING (auth.role() = 'authenticated');

-- rag.organization_documents: solo miembros de la org pueden leer sus documentos
ALTER TABLE rag.organization_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rag_org_documents_select"
  ON rag.organization_documents FOR SELECT
  USING (organization_id = fluxion.auth_user_org_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTA: Si existen tablas de chunks relacionadas (rag.chunks u otras) que
-- también tienen organization_id, aplicar el mismo split en una migración
-- posterior una vez confirmada su estructura.
-- ─────────────────────────────────────────────────────────────────────────────
