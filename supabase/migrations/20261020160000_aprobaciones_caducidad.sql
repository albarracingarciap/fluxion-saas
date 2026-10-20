-- ============================================================================
-- Flujos de aprobación: caducidad de las solicitudes (B11c)
-- ============================================================================
-- Las solicitudes no caducaban: si nadie alcanzaba el quórum, el objeto se
-- quedaba «en aprobación» indefinidamente (GAP-17, O8).
--
--   1. `approval_policies.expires_after_days`: días que puede estar abierta una
--      solicitud de esa política. NULL = no caduca (como hasta ahora).
--   2. `approval_requests.expires_at`: la fecha, calculada y congelada al abrir.
--   3. La vista de la bandeja expone `expires_at`.
--
-- Cerrar las caducadas lo hace la tarea programada /api/cron/approval-expiry:
-- las cancela con el motivo «Caducada», devuelve el objeto a borrador y avisa,
-- igual que una cancelación manual.
--
-- Idempotente: columnas con IF NOT EXISTS, funciones y vista con CREATE OR
-- REPLACE (la vista conserva sus columnas y añade `expires_at` al final).
-- ============================================================================

ALTER TABLE fluxion.approval_policies
  ADD COLUMN IF NOT EXISTS expires_after_days integer CHECK (expires_after_days IS NULL OR expires_after_days >= 1);

COMMENT ON COLUMN fluxion.approval_policies.expires_after_days IS
  'Días que puede estar abierta una solicitud. NULL = no caduca.';

ALTER TABLE fluxion.approval_requests
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_approval_requests_caducidad
  ON fluxion.approval_requests (expires_at)
  WHERE status = 'pending' AND expires_at IS NOT NULL;


CREATE OR REPLACE FUNCTION fluxion.approval_snapshot(p_policy_id uuid)
RETURNS jsonb LANGUAGE sql STABLE
SET search_path = fluxion, public
AS $$
  SELECT jsonb_build_object(
    'policy_id',          p.id,
    'name',               p.name,
    'object_type',        p.object_type,
    'author_can_approve', p.author_can_approve,
    'conditions',         p.conditions,
    'frozen_at',          now(),
    'expires_after_days', p.expires_after_days,
    'steps', COALESCE((
      SELECT jsonb_agg(
               jsonb_build_object(
                 'position',         s.position,
                 'approver_type',    s.approver_type,
                 'approver_ref',     s.approver_ref,
                 'quorum',           CASE WHEN s.approver_type = 'committee_type' THEN s.quorum
                                          ELSE COALESCE(s.quorum, 1) END,
                 'allow_delegation', s.allow_delegation,
                 'fallback_role',    s.fallback_role
               ) ORDER BY s.position
             )
        FROM fluxion.approval_policy_steps s
       WHERE s.policy_id = p.id
    ), '[]'::jsonb)
  )
  FROM fluxion.approval_policies p
  WHERE p.id = p_policy_id;
$$;


CREATE OR REPLACE FUNCTION fluxion.approval_open(
  p_organization_id uuid,
  p_object_type     fluxion.approval_object_type,
  p_object_id       uuid,
  p_requested_by    uuid,
  p_context         jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql
SET search_path = fluxion, public
AS $$
DECLARE
  v_policy uuid;
  v_snap   jsonb;
  v_id     uuid;
BEGIN
  v_policy := fluxion.approval_policy_for(p_organization_id, p_object_type, p_context);
  IF v_policy IS NULL THEN
    RETURN NULL;
  END IF;

  -- B11b: comités por tipo y funciones, resueltos y congelados al abrir.
  v_snap := fluxion.approval_resolve_snapshot(p_organization_id, fluxion.approval_snapshot(v_policy));

  IF jsonb_array_length(v_snap -> 'steps') = 0 THEN
    RAISE EXCEPTION 'La politica % no tiene ningun paso: no se puede aprobar nada con ella', v_policy;
  END IF;

  -- B11c: caducidad de la política, congelada como fecha en la solicitud.
  INSERT INTO fluxion.approval_requests
    (organization_id, object_type, object_id, policy_id, policy_snapshot, requested_by, expires_at)
  VALUES
    (p_organization_id, p_object_type, p_object_id, v_policy, v_snap, p_requested_by,
     CASE WHEN (v_snap ->> 'expires_after_days') IS NOT NULL
          THEN now() + make_interval(days => (v_snap ->> 'expires_after_days')::integer) END)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


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
  END AS object_href,

  -- Caducidad (B11c).
  r.expires_at

FROM fluxion.approval_requests r
LEFT JOIN fluxion.profiles solicitante ON solicitante.id = r.requested_by;

GRANT SELECT ON fluxion.v_approval_requests TO authenticated, service_role;
