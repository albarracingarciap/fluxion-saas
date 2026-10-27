-- ============================================================================
-- AISIA: del asistente al expediente (B15b, F-09, DP-05)
-- ============================================================================
--   Cada sistema con una evaluación AISIA del asistente pasa a tener su AISIA en
--   el expediente documental (`documents.template_key = 'aisia'`), y la
--   plantilla `aisia` (B15a) se activa.
--
--   Qué se migra, por sistema, de su última versión de AISIA:
--     - estado: `approved` → documento aprobado (con quién y cuándo); cualquier
--       otro → borrador. Si alguna AISIA espera aprobación en un circuito
--       abierto, la migración se detiene: hay que decidirla o cancelarla antes;
--     - texto redactado de S1-S6 → apartados del documento, como redacción
--       humana (`content[ref].text`), con su autor;
--     - lo que ahora se deriva (S1 y S2 de la ficha, S3 y S4 de la evaluación
--       vigente y su plan) no se copia, salvo los textos de S1 que se editaron
--       en el asistente y ya no coinciden con la ficha;
--     - los modos de fallo y el plan elegidos a mano en S3 y S4 no se copian:
--       el documento cita la evaluación vigente.
--   No se migra un sistema que ya tenga AISIA en el expediente.
--
--   Las tablas `aisia_*` se conservan hasta validar la migración (B15c).
--
-- Idempotente.
-- ============================================================================

-- ── 1. Texto de un apartado a partir de las claves de una sección ──────────

CREATE OR REPLACE FUNCTION pg_temp.aisia_texto(p_data jsonb, p_claves text[], p_etiquetas text[])
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_partes text[] := '{}';
  v_valor  jsonb;
  v_texto  text;
BEGIN
  FOR i IN 1 .. array_length(p_claves, 1) LOOP
    v_valor := p_data -> p_claves[i];
    CONTINUE WHEN v_valor IS NULL OR jsonb_typeof(v_valor) = 'null';
    v_texto := CASE jsonb_typeof(v_valor)
      WHEN 'boolean' THEN CASE WHEN v_valor::text = 'true' THEN 'sí' ELSE 'no' END
      WHEN 'string'  THEN CASE v_valor #>> '{}'
                            WHEN 'low' THEN 'baja' WHEN 'medium' THEN 'media'
                            WHEN 'high' THEN 'alta' WHEN 'critical' THEN 'crítica'
                            ELSE v_valor #>> '{}' END
      WHEN 'array'   THEN (SELECT string_agg(x, ', ') FROM jsonb_array_elements_text(v_valor) x)
      ELSE v_valor #>> '{}'
    END;
    CONTINUE WHEN v_texto IS NULL OR btrim(v_texto) = '';
    v_partes := v_partes || (p_etiquetas[i] || ': ' || btrim(v_texto));
  END LOOP;
  RETURN NULLIF(array_to_string(v_partes, E'\n'), '');
END;
$$;


-- ── 2. Migración ────────────────────────────────────────────────────────────

DO $$
DECLARE
  a          record;
  v_s        jsonb;
  v_sys      record;
  v_content  jsonb;
  v_autor    jsonb;
  v_ref      text;
  v_texto    text;
  v_doc      uuid;
  v_titulo   text;
  v_tpl      integer;
  v_user     uuid;
  v_n        integer := 0;
BEGIN
  IF EXISTS (
    SELECT 1 FROM fluxion.approval_requests r
      JOIN fluxion.aisia_assessments x ON x.id = r.object_id
     WHERE r.object_type = 'aisia_assessment' AND r.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Hay AISIA en un circuito de aprobación abierto: decídelas o cancélalas antes de migrar (B15b).';
  END IF;

  SELECT version, title INTO v_tpl, v_titulo
    FROM fluxion.document_templates
   WHERE organization_id IS NULL AND key = 'aisia'
   ORDER BY version DESC LIMIT 1;
  IF v_tpl IS NULL THEN
    RAISE EXCEPTION 'Falta la plantilla aisia: aplica antes 20261027120000_expediente_plantilla_aisia.sql.';
  END IF;

  FOR a IN
    SELECT DISTINCT ON (x.ai_system_id) x.*
      FROM fluxion.aisia_assessments x
     ORDER BY x.ai_system_id, x.version DESC
  LOOP
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM fluxion.documents d
       WHERE d.ai_system_id = a.ai_system_id AND d.template_key = 'aisia' AND d.status <> 'superseded'
    );

    SELECT jsonb_object_agg(section_code, data) INTO v_s
      FROM fluxion.aisia_sections WHERE assessment_id = a.id;
    v_s := coalesce(v_s, '{}'::jsonb);

    SELECT id, name, intended_use, prohibited_uses, technical_description INTO v_sys
      FROM fluxion.ai_systems WHERE id = a.ai_system_id;

    v_content := '{}'::jsonb;
    v_autor := jsonb_build_object('author_id', a.created_by, 'updated_at', a.updated_at);

    FOR v_ref, v_texto IN
      SELECT * FROM (VALUES
        ('AISIA.S1.b', concat_ws(E'\n',
            pg_temp.aisia_texto(v_s -> 'S1', ARRAY['deployment_context', 'tech_stack'],
                                             ARRAY['Contexto de despliegue', 'Tecnología']),
            CASE WHEN nullif(btrim(v_s -> 'S1' ->> 'intended_use'), '') IS DISTINCT FROM nullif(btrim(v_sys.intended_use), '')
                 THEN pg_temp.aisia_texto(v_s -> 'S1', ARRAY['intended_use'], ARRAY['Finalidad prevista (redactada en la AISIA)']) END,
            CASE WHEN nullif(btrim(v_s -> 'S1' ->> 'prohibited_uses'), '') IS DISTINCT FROM nullif(btrim(v_sys.prohibited_uses), '')
                 THEN pg_temp.aisia_texto(v_s -> 'S1', ARRAY['prohibited_uses'], ARRAY['Usos prohibidos (redactados en la AISIA)']) END,
            CASE WHEN nullif(btrim(v_s -> 'S1' ->> 'technical_description'), '') IS DISTINCT FROM nullif(btrim(v_sys.technical_description), '')
                 THEN pg_temp.aisia_texto(v_s -> 'S1', ARRAY['technical_description'], ARRAY['Descripción técnica (redactada en la AISIA)']) END)),
        ('AISIA.S2.b', pg_temp.aisia_texto(v_s -> 'S2',
            ARRAY['data_sources_description', 'data_quality_measures', 'dpia_notes'],
            ARRAY['Fuentes de datos', 'Medidas de calidad', 'Notas sobre la DPIA'])),
        ('AISIA.S3.b', pg_temp.aisia_texto(v_s -> 'S3',
            ARRAY['risk_summary', 'additional_risks'],
            ARRAY['Resumen de riesgos', 'Riesgos adicionales'])),
        ('AISIA.S4.b', pg_temp.aisia_texto(v_s -> 'S4',
            ARRAY['treatment_summary', 'residual_risk_description', 'monitoring_plan'],
            ARRAY['Resumen del tratamiento', 'Riesgo residual', 'Plan de seguimiento'])),
        ('AISIA.S5.a', pg_temp.aisia_texto(v_s -> 'S5',
            ARRAY['affected_groups', 'vulnerable_groups_affected', 'vulnerable_groups_description'],
            ARRAY['Grupos afectados', 'Afecta a colectivos vulnerables', 'Colectivos vulnerables'])),
        ('AISIA.S5.b', pg_temp.aisia_texto(v_s -> 'S5', ARRAY['rights_impacted'], ARRAY['Derechos afectados'])),
        ('AISIA.S5.c', pg_temp.aisia_texto(v_s -> 'S5',
            ARRAY['impact_severity', 'impact_likelihood', 'impact_description'],
            ARRAY['Gravedad', 'Probabilidad', 'Descripción del impacto'])),
        ('AISIA.S5.d', pg_temp.aisia_texto(v_s -> 'S5', ARRAY['safeguards'], ARRAY['Salvaguardas'])),
        ('AISIA.S6.a', pg_temp.aisia_texto(v_s -> 'S6',
            ARRAY['social_impact_description', 'bias_risk_assessment'],
            ARRAY['Impacto social', 'Riesgo de sesgo'])),
        ('AISIA.S6.b', pg_temp.aisia_texto(v_s -> 'S6', ARRAY['environmental_consideration'], ARRAY['Consideraciones ambientales'])),
        ('AISIA.S6.c', pg_temp.aisia_texto(v_s -> 'S6',
            ARRAY['broader_societal_implications', 'stakeholder_consultation'],
            ARRAY['Implicaciones sociales', 'Consulta a partes interesadas'])),
        ('AISIA.S6.d', pg_temp.aisia_texto(v_s -> 'S6', ARRAY['overall_conclusion'], ARRAY['Conclusión']))
      ) AS t(ref, texto)
    LOOP
      CONTINUE WHEN nullif(btrim(v_texto), '') IS NULL;
      v_content := v_content || jsonb_build_object(v_ref, v_autor || jsonb_build_object('text', v_texto));
    END LOOP;

    -- Sin `auth.uid()` el disparador del ciclo deja crear el documento ya aprobado.
    INSERT INTO fluxion.documents
      (organization_id, ai_system_id, template_key, template_version, title, status, content,
       approved_by, approved_at, created_by, created_at, updated_at, version)
    VALUES
      (a.organization_id, a.ai_system_id, 'aisia', v_tpl, v_titulo || ' · ' || v_sys.name,
       CASE WHEN a.status = 'approved' THEN 'approved' ELSE 'draft' END,
       v_content,
       CASE WHEN a.status = 'approved' THEN a.approved_by END,
       CASE WHEN a.status = 'approved' THEN a.approved_at END,
       a.created_by, a.created_at, now(), 1)
    RETURNING id INTO v_doc;

    SELECT user_id INTO v_user FROM fluxion.profiles WHERE id = a.created_by;

    INSERT INTO fluxion.ai_system_history
      (ai_system_id, organization_id, event_type, event_title, event_summary, actor_user_id, payload)
    VALUES
      (a.ai_system_id, a.organization_id, 'aisia_migrated', 'AISIA trasladada al expediente',
       format('La evaluación AISIA v%s (%s) pasa al expediente documental como %s.',
              a.version,
              CASE a.status WHEN 'approved' THEN 'aprobada' WHEN 'submitted' THEN 'enviada'
                            WHEN 'rejected' THEN 'rechazada' ELSE 'borrador' END,
              CASE WHEN a.status = 'approved' THEN 'documento aprobado' ELSE 'borrador' END),
       NULL,
       jsonb_build_object('assessment_id', a.id, 'document_id', v_doc, 'assessment_status', a.status,
                          'migrated_refs', (SELECT coalesce(jsonb_agg(k), '[]'::jsonb) FROM jsonb_object_keys(v_content) k),
                          'created_by_user_id', v_user));

    v_n := v_n + 1;
  END LOOP;

  RAISE NOTICE 'AISIA migradas al expediente: %', v_n;
END;
$$;


-- ── 3. La plantilla AISIA aparece en el expediente ─────────────────────────

UPDATE fluxion.document_templates
   SET is_active = true
 WHERE organization_id IS NULL AND key = 'aisia' AND version = 1 AND NOT is_active;
