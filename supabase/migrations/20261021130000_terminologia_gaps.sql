-- ============================================================================
-- Terminología: «gap» en los textos de la interfaz (decisión del 2026-10-21)
-- ============================================================================
-- El término de la interfaz es «gap» (el habitual entre los profesionales con
-- los que trabaja el producto), y «excluir»/«exclusión» para su disposición
-- (TODO 254). Tres textos de B11d viven en la base de datos y decían «brecha»:
--   · la etiqueta de la bandeja de Aprobaciones (`v_approval_requests`);
--   · el nombre de la política por defecto y su siembra;
--   · el mensaje del trigger `trg_gap_disposition_rules`.
--
-- Las solicitudes ya abiertas conservan el nombre de la política en su copia
-- congelada. Solo se renombra la política por defecto si sigue con su nombre.
--
-- Idempotente: funciones y vista con CREATE OR REPLACE; el UPDATE solo toca el
-- nombre original.
-- ============================================================================

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
    WHEN 'aisia_assessment' THEN (
      SELECT COALESCE(a.title, 'AISIA · ' || s.name)
        FROM fluxion.aisia_assessments a
        LEFT JOIN fluxion.ai_systems s ON s.id = a.ai_system_id
       WHERE a.id = r.object_id
    )
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
    WHEN 'aisia_assessment' THEN (
      SELECT '/inventario/' || a.ai_system_id || '/aisia/' || a.id
        FROM fluxion.aisia_assessments a WHERE a.id = r.object_id
    )
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


CREATE OR REPLACE FUNCTION fluxion.trg_gap_disposition_rules()
RETURNS trigger LANGUAGE plpgsql
SET search_path = fluxion, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' THEN
    RAISE EXCEPTION 'Esta exclusión espera aprobación: se decide en Aprobaciones o se retira'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status = 'active'
     AND (TG_OP = 'INSERT'
          OR (NEW.disposition, NEW.rationale, NEW.expires_at, NEW.decided_at)
             IS DISTINCT FROM (OLD.disposition, OLD.rationale, OLD.expires_at, OLD.decided_at))
     AND fluxion.approval_policy_for(NEW.organization_id, 'gap_disposition',
                                     jsonb_build_object('gap_layer', NEW.gap_layer)) IS NOT NULL THEN
    RAISE EXCEPTION 'Excluir este gap pasa por aprobación'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;


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
      ('aisia_assessment', 'Evaluación AISIA (DP-01)',               '{}'::jsonb,                             'committee_type', 'ai_committee',    'sgai_manager'),
      ('document',         'Expediente · Anexo IV (DP-01)',          '{"template_key": ["annex_iv"]}'::jsonb, 'role',           'sgai_manager',    NULL),
      ('document',         'Expediente · FRIA (DP-01)',              '{"template_key": ["fria"]}'::jsonb,     'committee_type', 'ai_committee',    'sgai_manager'),
      ('document',         'Expediente · DPIA (DP-01)',              '{"template_key": ["dpia"]}'::jsonb,     'function',       'data_controller', 'sgai_manager'),
      ('document',         'Expediente · Ficha del modelo',          '{"template_key": ["model_card"]}'::jsonb, 'role',         'sgai_manager',    NULL),
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


UPDATE fluxion.approval_policies
   SET name = 'Exclusión de gaps (DP-07)'
 WHERE is_default
   AND object_type = 'gap_disposition'
   AND name = 'Exclusión de brechas (DP-07)';
