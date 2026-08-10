-- =============================================================================
-- MIGRACIÓN 055b: Reemplazar public.search_chunks
-- =============================================================================
-- El wrapper public.search_chunks que existía en Supabase tiene una referencia
-- a "document_id" que ya no existe en rag.chunks (columna eliminada en 043-044).
-- Lo reemplazamos con una implementación limpia que delega en rag.search_chunks.
-- =============================================================================

-- Necesitamos DROP explícito porque la firma puede diferir de la existente
-- y CREATE OR REPLACE solo funciona si la firma es idéntica.
DROP FUNCTION IF EXISTS public.search_chunks(text, rag.source_type[], integer, double precision, uuid, jsonb, text);
DROP FUNCTION IF EXISTS public.search_chunks(vector, rag.source_type[], integer, double precision, uuid, jsonb, text);
DROP FUNCTION IF EXISTS public.search_chunks(text, rag.source_type[], integer, double precision);
DROP FUNCTION IF EXISTS public.search_chunks(vector, rag.source_type[], integer, double precision);

CREATE FUNCTION public.search_chunks(
    query_embedding   text,
    source_types      rag.source_type[],
    match_count       integer           DEFAULT 4,
    match_threshold   double precision  DEFAULT 0.50,
    org_id            uuid              DEFAULT NULL,
    filter_metadata   jsonb             DEFAULT NULL,
    filter_short_name text              DEFAULT NULL
)
RETURNS TABLE (
    id              uuid,
    section_ref     text,
    short_name      text,
    content         text,
    content_tokens  integer,
    similarity      double precision,
    metadata        jsonb,
    source_type     rag.source_type
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = rag, public
AS $$
    SELECT * FROM rag.search_chunks(
        query_embedding::vector,
        source_types,
        match_count,
        match_threshold,
        org_id,
        filter_metadata,
        filter_short_name
    );
$$;

GRANT EXECUTE ON FUNCTION public.search_chunks(
    text, rag.source_type[], integer, double precision, uuid, jsonb, text
) TO authenticated, anon, service_role;
