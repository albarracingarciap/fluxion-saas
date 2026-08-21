-- ============================================================================
-- C3 · Vista de solicitudes para la bandeja
-- ============================================================================
-- Una solicitud guarda `object_type` + `object_id` y nada mas. Es correcto —los
-- cinco objetos viven en tablas distintas y una clave ajena polimorfica no
-- existe— pero deja la bandeja mostrando identificadores.
--
-- La resolucion a texto se hace aqui y no en la aplicacion: son cinco joins
-- distintos segun el tipo, y hacerlos uno a uno desde TypeScript convierte una
-- lista de diez solicitudes en treinta consultas.
--
-- Solo se resuelven los tipos que ya existen de verdad. Los demas devuelven
-- NULL y la interfaz muestra el tipo: preferible a inventar una etiqueta que
-- prometa una pantalla que todavia no esta.

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
    ELSE NULL
  END AS object_label,

  -- Paso actual, sacado del snapshot: la politica viva puede haber cambiado.
  (SELECT s FROM jsonb_array_elements(r.policy_snapshot -> 'steps') s
    WHERE (s ->> 'position')::smallint = r.current_position) AS current_step,

  (SELECT count(*) FROM jsonb_array_elements(r.policy_snapshot -> 'steps')) AS total_steps,

  -- Votos a favor ya reunidos en el paso actual. Con el quorum del paso, es lo
  -- que permite pintar «2 de 3» sin una segunda consulta.
  (SELECT count(*)
     FROM fluxion.approval_decisions d
    WHERE d.request_id = r.id
      AND d.position = r.current_position
      AND d.decision = 'approved') AS approvals_in_step

FROM fluxion.approval_requests r
LEFT JOIN fluxion.profiles solicitante ON solicitante.id = r.requested_by;

COMMENT ON VIEW fluxion.v_approval_requests IS
  'Solicitudes con el objeto resuelto a texto y el paso actual sacado del '
  'snapshot. security_invoker: la RLS de approval_requests sigue mandando.';

-- Los dos roles. Conceder solo a `authenticated` fue lo que dejo cuatro vistas
-- ilegibles para el cliente de servicio al estrenar la instancia propia.
GRANT SELECT ON fluxion.v_approval_requests TO authenticated, service_role;
