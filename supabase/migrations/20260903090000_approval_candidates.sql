-- ============================================================================
-- C3 · A quien hay que avisar
-- ============================================================================
-- `approval_can_decide` responde «¿puede esta persona?». Para avisar hace falta
-- la pregunta inversa: «¿quienes pueden?».
--
-- Podria resolverse llamando a la primera por cada perfil de la organizacion,
-- pero eso es una consulta por miembro cada vez que una solicitud avanza de
-- paso. Se resuelve de una vez.
--
-- Las dos comparten criterio a proposito —rol, designacion, comite,
-- delegacion, segregacion de funciones—. Si divergen, alguien recibira un aviso
-- de algo que no puede decidir, o peor, no lo recibira pudiendo.

CREATE OR REPLACE FUNCTION fluxion.approval_step_candidates(p_request_id uuid)
RETURNS TABLE (profile_id uuid, via text)
LANGUAGE plpgsql STABLE
SET search_path = fluxion, public
AS $$
DECLARE
  v_req  record;
  v_paso jsonb;
BEGIN
  SELECT * INTO v_req FROM fluxion.approval_requests WHERE id = p_request_id;
  IF NOT FOUND OR v_req.status <> 'pending' THEN
    RETURN;
  END IF;

  SELECT s INTO v_paso
    FROM jsonb_array_elements(v_req.policy_snapshot -> 'steps') s
   WHERE (s ->> 'position')::smallint = v_req.current_position;

  IF v_paso IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH directos AS (
    -- Por rol
    SELECT p.id, 'role'::text AS via
      FROM fluxion.profiles p
     WHERE (v_paso ->> 'approver_type') = 'role'
       AND p.organization_id = v_req.organization_id
       AND p.role::text = (v_paso ->> 'approver_ref')
       AND p.is_active

    UNION

    -- Por designacion
    SELECT p.id, 'profile'::text
      FROM fluxion.profiles p
     WHERE (v_paso ->> 'approver_type') = 'profile'
       AND p.id::text = (v_paso ->> 'approver_ref')
       AND p.organization_id = v_req.organization_id
       AND p.is_active

    UNION

    -- Por comite. Los miembros externos no tienen perfil: constan en el comite
    -- pero no pueden votar, asi que tampoco se les avisa por aqui.
    SELECT p.id, 'committee'::text
      FROM fluxion.committee_members m
      JOIN fluxion.profiles p ON p.id = m.profile_id
     WHERE (v_paso ->> 'approver_type') = 'committee'
       AND m.committee_id = (v_paso ->> 'approver_ref')::uuid
       AND m.is_active
       AND p.is_active
  ),
  con_delegados AS (
    SELECT d.id, d.via FROM directos d

    UNION

    -- Quien recibe la delegacion de alguien que si puede.
    SELECT d2.to_profile_id, 'delegation'::text
      FROM fluxion.approval_delegations d2
      JOIN directos t ON t.id = d2.from_profile_id
     WHERE COALESCE((v_paso ->> 'allow_delegation')::boolean, true)
       AND d2.organization_id = v_req.organization_id
       AND CURRENT_DATE BETWEEN d2.valid_from AND d2.valid_until
       AND (cardinality(d2.object_types) = 0 OR v_req.object_type = ANY (d2.object_types))
  )
  SELECT c.id, min(c.via)
    FROM con_delegados c
   WHERE
     -- Segregacion de funciones: quien la pidio no aparece, salvo que la
     -- politica congelada lo permitiera.
     (c.id <> v_req.requested_by
      OR COALESCE((v_req.policy_snapshot ->> 'author_can_approve')::boolean, false))
     -- Ni quien ya voto en este paso.
     AND NOT EXISTS (
       SELECT 1 FROM fluxion.approval_decisions ad
        WHERE ad.request_id = p_request_id
          AND ad.position = v_req.current_position
          AND ad.actor_profile_id = c.id
     )
   GROUP BY c.id;
END;
$$;

COMMENT ON FUNCTION fluxion.approval_step_candidates(uuid) IS
  'Quienes pueden decidir el paso actual. Inversa de approval_can_decide, para '
  'poder avisar sin preguntar perfil a perfil.';

GRANT EXECUTE ON FUNCTION fluxion.approval_step_candidates(uuid) TO service_role;
