-- ============================================================================
-- AISIA: retirada de las tablas del asistente (B15c)
-- ============================================================================
--   La AISIA es el documento `aisia` del expediente desde B15b, y el
--   responsable ha validado la migración. Se retiran:
--     - las tablas `aisia_assessments`, `aisia_sections` y
--       `aisia_ai_generations` (esta última nunca se usó) y el disparador
--       `trg_aisia_lifecycle_rules`;
--     - las políticas de aprobación de tipo `aisia_assessment` y su fila en la
--       semilla de políticas por defecto.
--
--   Las solicitudes de aprobación antiguas de AISIA se conservan: su etiqueta
--   y el sistema se copian al contexto (`legacy_label`, `legacy_ai_system_id`)
--   y `v_approval_requests` los lee de ahí; el enlace lleva a la AISIA del
--   expediente. El valor `aisia_assessment` sigue en el enum
--   `approval_object_type` (Postgres no permite quitarlo) para esas solicitudes
--   y para las delegaciones que lo nombraban.
--
--   Antes de borrar se comprueba que nada se pierda: ninguna AISIA en un
--   circuito abierto, y ningún sistema con una AISIA aprobada en el asistente
--   que no la tenga aprobada en el expediente (la Declaración dejaría de
--   contarla para A.5.2 a A.5.5).
--
-- Idempotente.
-- ============================================================================

-- ── 1. Comprobaciones ───────────────────────────────────────────────────────

DO $$
DECLARE
  v_sin text;
BEGIN
  IF to_regclass('fluxion.aisia_assessments') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM fluxion.approval_requests
     WHERE object_type = 'aisia_assessment' AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Hay AISIA del asistente en un circuito abierto: decídelas o cancélalas antes (B15c).';
  END IF;

  SELECT string_agg(DISTINCT s.name, ', ') INTO v_sin
    FROM fluxion.aisia_assessments a
    JOIN fluxion.ai_systems s ON s.id = a.ai_system_id
   WHERE a.status = 'approved'
     AND NOT EXISTS (
       SELECT 1 FROM fluxion.documents d
        WHERE d.ai_system_id = a.ai_system_id AND d.template_key = 'aisia'
          AND d.status IN ('approved', 'superseded') AND d.approved_at IS NOT NULL
     );
  IF v_sin IS NOT NULL THEN
    RAISE EXCEPTION 'Estos sistemas tienen una AISIA aprobada en el asistente y ninguna aprobada en el expediente: %. Apruébala en el expediente antes de retirar las tablas (B15c).', v_sin;
  END IF;

  -- Etiqueta y sistema de las solicitudes antiguas, antes de borrar su objeto.
  UPDATE fluxion.approval_requests r
     SET context = r.context || jsonb_build_object(
           'legacy_label', COALESCE(a.title, 'AISIA · ' || s.name),
           'legacy_ai_system_id', a.ai_system_id)
    FROM fluxion.aisia_assessments a
    LEFT JOIN fluxion.ai_systems s ON s.id = a.ai_system_id
   WHERE r.object_type = 'aisia_assessment'
     AND r.object_id = a.id
     AND NOT r.context ? 'legacy_label';
END;
$$;


-- ── 2. Vista de solicitudes sin las tablas de la AISIA ──────────────────────

CREATE OR REPLACE VIEW fluxion.v_approval_requests
WITH (security_invoker = true) AS
SELECT
  r.id,
  r.organization_id,
  r.object_type,
  r.object_id,
  r.status,
  r.current_position,
  r.requested_by,
  r.requested_at,
  r.closed_at,
  r.closed_reason,
  r.policy_snapshot ->> 'name'  AS policy_name,
  solicitante.full_name         AS requested_by_name,

  -- Etiqueta legible del objeto
  CASE r.object_type
    WHEN 'treatment_plan' THEN (
      SELECT s.name
        FROM fluxion.treatment_plans tp
        JOIN fluxion.fmea_evaluations e ON e.id = tp.evaluation_id
        LEFT JOIN fluxion.ai_systems s  ON s.id = e.system_id
       WHERE tp.id = r.object_id
    )
    WHEN 'document' THEN (
      SELECT d.title FROM fluxion.documents d WHERE d.id = r.object_id
    )
    -- AISIA del asistente retirado (B15c): la etiqueta se guardó en el contexto.
    WHEN 'aisia_assessment' THEN COALESCE(r.context ->> 'legacy_label', 'Evaluación AISIA')
    WHEN 'soa' THEN 'Declaración de Aplicabilidad ISO/IEC 42001'
    WHEN 'evidence' THEN (
      SELECT ev.title FROM fluxion.system_evidences ev WHERE ev.id = r.object_id
    )
    -- Del contexto: una exclusión rechazada o cancelada se borra, y el
    -- histórico tiene que seguir diciendo qué se pidió excluir.
    WHEN 'gap_disposition' THEN
      'Exclusión de gap · ' || COALESCE(
        r.context ->> 'gap_title',
        CASE r.context ->> 'gap_layer' WHEN 'fmea' THEN 'Riesgo sin tratar'
                                       WHEN 'normativo' THEN 'Obligación sin cubrir'
                                       ELSE r.context ->> 'gap_layer' END)
    ELSE NULL
  END AS object_label,

  -- Paso actual, sacado del snapshot: la politica viva puede haber cambiado.
  (SELECT s FROM jsonb_array_elements(r.policy_snapshot -> 'steps') s
    WHERE (s ->> 'position')::smallint = r.current_position) AS current_step,

  (SELECT count(*) FROM jsonb_array_elements(r.policy_snapshot -> 'steps')) AS total_steps,

  -- Votos a favor ya reunidos en el paso actual.
  (SELECT count(*)
     FROM fluxion.approval_decisions d
    WHERE d.request_id = r.id
      AND d.position = r.current_position
      AND d.decision = 'approved') AS approvals_in_step,

  -- Pantalla del objeto (B11a).
  CASE r.object_type
    WHEN 'treatment_plan' THEN (
      SELECT '/inventario/' || tp.system_id || '/fmea/' || tp.evaluation_id || '/plan'
        FROM fluxion.treatment_plans tp WHERE tp.id = r.object_id
    )
    WHEN 'document' THEN (
      SELECT CASE WHEN d.ai_system_id IS NOT NULL
                  THEN '/inventario/' || d.ai_system_id || '/expediente/' || d.template_key END
        FROM fluxion.documents d WHERE d.id = r.object_id
    )
    WHEN 'aisia_assessment' THEN
      CASE WHEN r.context ? 'legacy_ai_system_id'
           THEN '/inventario/' || (r.context ->> 'legacy_ai_system_id') || '/expediente/aisia' END
    WHEN 'soa' THEN '/plantillas/soa-iso42001'
    WHEN 'evidence' THEN '/evidencias/' || r.object_id
    WHEN 'gap_disposition' THEN '/gaps/excluded'
    ELSE NULL
  END AS object_href,

  -- Caducidad (B11c).
  r.expires_at

FROM fluxion.approval_requests r
LEFT JOIN fluxion.profiles solicitante ON solicitante.id = r.requested_by;

GRANT SELECT ON fluxion.v_approval_requests TO authenticated, service_role;


-- ── 3. Políticas ────────────────────────────────────────────────────────────

-- Los pasos se borran en cascada; las solicitudes antiguas guardan su copia
-- (`policy_snapshot`) y su `policy_id` pasa a nulo.
DELETE FROM fluxion.approval_policies WHERE object_type = 'aisia_assessment';

CREATE OR REPLACE FUNCTION fluxion.add_default_consultations(p_policy_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = fluxion, public
AS $$
DECLARE
  v_pol  record;
  v_tipo text;
  v_ref  text;
  v_cond jsonb := '{}'::jsonb;
BEGIN
  SELECT id, object_type::text AS object_type, conditions INTO v_pol
    FROM fluxion.approval_policies WHERE id = p_policy_id AND is_default;
  IF v_pol.id IS NULL THEN RETURN; END IF;

  IF v_pol.object_type = 'document' AND v_pol.conditions -> 'template_key' ?| ARRAY['fria', 'dpia', 'aisia'] THEN
    v_tipo := 'role'; v_ref := 'dpo';
  ELSIF v_pol.object_type = 'treatment_plan' AND v_pol.conditions -> 'approval_level' ?| ARRAY['level_1', 'level_2'] THEN
    v_tipo := 'function'; v_ref := 'ciso';
    v_cond := '{"has_security_controls": ["true"]}'::jsonb;
  ELSE
    RETURN;
  END IF;

  -- Ya añadida, o la política se ha editado (más de un paso): no se toca.
  IF (SELECT count(*) FROM fluxion.approval_policy_steps WHERE policy_id = p_policy_id) <> 1 THEN
    RETURN;
  END IF;

  UPDATE fluxion.approval_policy_steps SET position = position + 1 WHERE policy_id = p_policy_id;
  INSERT INTO fluxion.approval_policy_steps
    (policy_id, position, approver_type, approver_ref, quorum, allow_delegation, kind, condition)
  VALUES
    (p_policy_id, 1, v_tipo::fluxion.approval_approver_type, v_ref, NULL, true, 'consultation', v_cond);
END;
$$;

REVOKE ALL ON FUNCTION fluxion.add_default_consultations(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION fluxion.seed_default_approval_policies(p_organization_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path = fluxion, public
AS $$
DECLARE
  d        record;
  v_policy uuid;
  v_n      integer := 0;
BEGIN
  FOR d IN
    SELECT * FROM (VALUES
      ('treatment_plan',   'Plan de tratamiento · Nivel 1 (DP-01)', '{"approval_level": ["level_1"]}'::jsonb, 'role',           'sgai_manager',    NULL),
      ('treatment_plan',   'Plan de tratamiento · Nivel 2 (DP-01)', '{"approval_level": ["level_2"]}'::jsonb, 'committee_type', 'risk_committee',  'sgai_manager'),
      ('treatment_plan',   'Plan de tratamiento · Nivel 3 (DP-01)', '{"approval_level": ["level_3"]}'::jsonb, 'committee_type', 'director_review', 'executive'),
      ('document',         'Expediente · Anexo IV (DP-01)',          '{"template_key": ["annex_iv"]}'::jsonb, 'role',           'sgai_manager',    NULL),
      ('document',         'Expediente · FRIA (DP-01)',              '{"template_key": ["fria"]}'::jsonb,     'committee_type', 'ai_committee',    'sgai_manager'),
      ('document',         'Expediente · DPIA (DP-01)',              '{"template_key": ["dpia"]}'::jsonb,     'function',       'data_controller', 'sgai_manager'),
      ('document',         'Expediente · Ficha del modelo',          '{"template_key": ["model_card"]}'::jsonb, 'role',         'sgai_manager',    NULL),
      ('document',         'Expediente · AISIA (DP-01)',             '{"template_key": ["aisia"]}'::jsonb,    'committee_type', 'ai_committee',    'sgai_manager'),
      ('soa',              'Declaración de Aplicabilidad (DP-01)',   '{}'::jsonb,                             'committee_type', 'director_review', 'executive'),
      ('evidence',         'Evidencias (DP-01)',                     '{}'::jsonb,                             'role',           'sgai_manager',    NULL),
      ('gap_disposition',  'Exclusión de gaps (DP-07)',           '{"gap_layer": ["fmea", "normativo"]}'::jsonb, 'role',   'sgai_manager',    NULL)
    ) AS t(object_type, name, conditions, approver_type, approver_ref, fallback_role)
  LOOP
    -- Solo tipos sin ninguna política activa: si la organización ya configuró
    -- el suyo, se respeta.
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM fluxion.approval_policies p
       WHERE p.organization_id = p_organization_id
         AND p.object_type::text = d.object_type
         AND p.is_active
         AND NOT p.is_default
    );
    -- Y sin repetir una ya sembrada.
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM fluxion.approval_policies p
       WHERE p.organization_id = p_organization_id
         AND p.object_type::text = d.object_type
         AND p.is_active
         AND p.conditions = d.conditions
    );

    INSERT INTO fluxion.approval_policies (organization_id, object_type, name, conditions, author_can_approve, is_active, is_default)
    VALUES (p_organization_id, d.object_type::fluxion.approval_object_type, d.name, d.conditions, false, true, true)
    RETURNING id INTO v_policy;

    INSERT INTO fluxion.approval_policy_steps (policy_id, position, approver_type, approver_ref, quorum, allow_delegation, fallback_role)
    VALUES (v_policy, 1, d.approver_type::fluxion.approval_approver_type, d.approver_ref, NULL, true, d.fallback_role::fluxion.org_role);

    -- B11d: pasos de consulta de DP-01 delante del de aprobación.
    PERFORM fluxion.add_default_consultations(v_policy);

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$$;


-- ── 4. Tablas del asistente ─────────────────────────────────────────────────

DROP TABLE IF EXISTS fluxion.aisia_ai_generations;
DROP TABLE IF EXISTS fluxion.aisia_sections;
DROP TABLE IF EXISTS fluxion.aisia_assessments;
DROP FUNCTION IF EXISTS fluxion.trg_aisia_lifecycle_rules();
