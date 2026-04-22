-- =========================================================================
-- FLUXION SAAS — MODULE RAG & VECTOR SEARCH
-- =========================================================================
-- Descripción: Módulo para habilitar búsqueda semántica sobre regulaciones y estándares.
-- Usa la extensión pgvector con un índice HNSW para OpenAI Embeddings.

-- 1. Habilitar la extensión de vectores 
-- Debe ejecutarse desde un usuario con privilegios (como el postgress_role original en Supabase).
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Crear esquema independiente para los documentos base (aislado de los tenants)
CREATE SCHEMA IF NOT EXISTS rag;

-- 3. Tabla principal de documentos regulatorios chunkizados
CREATE TABLE rag.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace TEXT NOT NULL,                 -- Ej: 'ai_act', 'iso_42001', 'gdpr'
  
  -- Metadatos estructurales extraídos durante el parseo (EUR-Lex / ISO)
  regulatory_source TEXT NOT NULL,         -- Archivo o fuente origen (ej. 'eur-lex-ai-act-2024')
  chapter TEXT,                            -- Capítulo / Sección mayor
  article_ref TEXT,                        -- Ej: 'Art. 10(1)'
  title TEXT,                              -- Título del artículo o sección
  
  -- Contexto puro para el LLM
  content TEXT NOT NULL,                   -- El texto parseado
  content_tokens INTEGER,                  -- Tokens gastados, para control de ventana
  
  -- Filtros de aplicabilidad (útiles para pre-filtrar antes de la búsqueda HNSW)
  applies_to_risk_level TEXT[] DEFAULT '{}',
  applies_to_role TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  
  -- El Embedding vector de 1536 dimensiones (OpenAI text-embedding-3-small)
  embedding vector(1536),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Índice HNSW para búsqueda por coseno extremadamente rápida
-- Aproximación recomendada por pgvector para más de 10k filas
CREATE INDEX idx_rag_documents_embedding 
  ON rag.documents 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 5. Índice en el namespace para filtrados pre-vectoriales rápidos
CREATE INDEX idx_rag_documents_namespace ON rag.documents(namespace);

-- 6. SEGURIDAD: Solo lectura pública autenticada
-- Igual que el schema compliance, esto permite que FastAPI RAG o NextJS consulten
-- la normativa vectorizada usando la clave anónima del usuario.
ALTER TABLE rag.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura RAG autorizada" ON rag.documents FOR SELECT USING (auth.role() = 'authenticated');
