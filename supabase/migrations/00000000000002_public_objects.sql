CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_chunks(query_embedding text, source_types rag.source_type[], match_count integer DEFAULT 4, match_threshold double precision DEFAULT 0.50, org_id uuid DEFAULT NULL::uuid, filter_metadata jsonb DEFAULT NULL::jsonb, filter_short_name text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, section_ref text, short_name text, content text, content_tokens integer, similarity double precision, metadata jsonb, source_type rag.source_type)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'rag', 'public'
AS $function$
    SELECT * FROM rag.search_chunks(
        query_embedding::vector,
        source_types,
        match_count,
        match_threshold,
        org_id,
        filter_metadata,
        filter_short_name
    );
$function$
;


CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
