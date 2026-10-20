-- ============================================================================
-- Flujos de aprobación: todos los tipos de objeto en la bandeja (B11a)
-- ============================================================================
-- Hasta ahora solo el plan de tratamiento abría solicitudes. Con B11a también
-- lo hacen la AISIA, el expediente documental, la Declaración de Aplicabilidad
-- y las evidencias, cuando hay una política activa para su tipo.
--
-- La vista de la bandeja resolvía a texto solo el plan y los documentos. Se
-- completa con los otros tres tipos y se añade `object_href`, el enlace a la
-- pantalla del objeto, para que quien decide pueda revisarlo antes de votar.
--
-- La Declaración de Aplicabilidad es una por organización: su solicitud usa el
-- id de la organización como `object_id`.
--
-- Idempotente: CREATE OR REPLACE VIEW con las mismas columnas en el mismo
-- orden y `object_href` añadida al final.
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
    ELSE NULL
  END AS object_href

FROM fluxion.approval_requests r
LEFT JOIN fluxion.profiles solicitante ON solicitante.id = r.requested_by;

COMMENT ON VIEW fluxion.v_approval_requests IS
  'Solicitudes con el objeto resuelto a texto, su enlace y el paso actual sacado del '
  'snapshot. security_invoker: la RLS de approval_requests sigue mandando.';

GRANT SELECT ON fluxion.v_approval_requests TO authenticated, service_role;
