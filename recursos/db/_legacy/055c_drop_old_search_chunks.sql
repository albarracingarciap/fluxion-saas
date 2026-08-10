-- =============================================================================
-- MIGRACIÓN 055c: Eliminar la versión antigua de public.search_chunks
-- =============================================================================
-- Hay dos overloads en conflicto. La versión antigua usa:
--   query_embedding => public.vector   (no text)
--   source_types    => text[]          (no rag.source_type[])
-- PostgREST no puede elegir entre las dos → PGRST203.
-- Eliminamos la antigua; mantenemos la de 055b (text, rag.source_type[]).
-- =============================================================================

DROP FUNCTION IF EXISTS public.search_chunks(
    public.vector, text[], integer, double precision, uuid, jsonb, text
);

-- Verificar que solo queda una versión (debe devolver 1 fila)
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'search_chunks';
