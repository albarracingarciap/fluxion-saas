-- =============================================================================
-- MIGRACIÓN 055: Crear rag.search_chunks con firma de 7 parámetros
-- =============================================================================
-- El wrapper public.search_chunks ya existe en Supabase y está correcto.
-- El problema: llama internamente a rag.search_chunks con 7 parámetros
-- (añadió org_id, filter_metadata, filter_short_name) pero esa versión
-- de rag.search_chunks nunca se creó — solo existe la de 4 parámetros.
-- =============================================================================

CREATE OR REPLACE FUNCTION rag.search_chunks(
    query_embedding   vector,
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
    -- Chunks de normativa global
    SELECT
        c.id,
        c.section_ref,
        c.short_name,
        c.content,
        c.content_tokens,
        (1 - (c.embedding <=> query_embedding))::double precision AS similarity,
        c.metadata,
        c.source_type
    FROM rag.chunks c
    WHERE
        c.is_active = true
        AND c.source_type = ANY(source_types)
        AND (filter_short_name IS NULL OR c.short_name = filter_short_name)
        AND (filter_metadata   IS NULL OR c.metadata @> filter_metadata)
        AND (1 - (c.embedding <=> query_embedding)) >= match_threshold

    UNION ALL

    -- Chunks de documentos propios de la organización (si se pasa org_id)
    SELECT
        oc.id,
        oc.section_ref,
        oc.short_name,
        oc.content,
        oc.content_tokens,
        (1 - (oc.embedding <=> query_embedding))::double precision AS similarity,
        oc.metadata,
        oc.source_type
    FROM rag.organization_chunks oc
    WHERE
        org_id IS NOT NULL
        AND oc.organization_id = org_id
        AND oc.is_active = true
        AND oc.source_type = ANY(source_types)
        AND (filter_short_name IS NULL OR oc.short_name = filter_short_name)
        AND (filter_metadata   IS NULL OR oc.metadata @> filter_metadata)
        AND (1 - (oc.embedding <=> query_embedding)) >= match_threshold

    ORDER BY similarity DESC
    LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION rag.search_chunks(
    vector, rag.source_type[], integer, double precision, uuid, jsonb, text
) TO authenticated, service_role;
