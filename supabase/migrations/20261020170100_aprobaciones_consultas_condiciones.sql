-- ============================================================================
-- Flujos de aprobación: consultas, pasos condicionales, Auditor y brechas (B11d, 2/2)
-- ============================================================================
-- Requiere 20261020170000 (tipo de objeto `gap_disposition`).
--
--   1. Pasos de **consulta** (`kind = 'consultation'`): quien consulta emite un
--      dictamen (favorable o desfavorable, siempre con texto) que consta pero no
--      decide; la solicitud avanza al paso siguiente. DP-01: el DPO dictamina en
--      la AISIA, la FRIA y la DPIA; el CISO revisa los planes con controles de
--      seguridad. Si no hay nadie a quien consultar, la consulta se omite (y
--      queda constancia en la solicitud): un dictamen no tiene sustituto. Quien
--      solicita no cuenta como consultado (salvo que la política le deje
--      aprobar), ni el Auditor.
--   2. Pasos **condicionales** (`condition`, mismo formato que las condiciones
--      de la política): el paso solo entra si el contexto de la solicitud lo
--      cumple. El contexto se guarda en `approval_requests.context`.
--   3. **El Auditor nunca decide** (DP-01, I-08): no es candidato ni puede
--      votar, tampoco por delegación.
--   4. **Exclusión de brechas** (DP-07): `gap_dispositions.status` (`active` o
--      `pending`). Excluir una brecha de las capas «Riesgo sin tratar» (fmea) u
--      «Obligación sin cubrir» (normativo) queda pendiente hasta que se aprueba.
--      Política por defecto: el Responsable del SGAI. Un trigger impide activar
--      desde la API una exclusión que gobierna una política.
--   5. Las políticas por defecto de DP-01 ganan sus consultas: DPO en la AISIA,
--      la FRIA y la DPIA; CISO en los planes de nivel 1 y 2 con controles de
--      seguridad. A las ya sembradas se les añaden solo si siguen sin tocar (un
--      paso).
--
-- Idempotente: columnas con IF NOT EXISTS, funciones y vista con CREATE OR
-- REPLACE; las consultas se añaden una vez (se comprueba que no estén).
-- ============================================================================


-- ── 1 y 2. Pasos de consulta y condicionales; contexto de la solicitud ───────

ALTER TABLE fluxion.approval_policy_steps
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'approval'
    CHECK (kind IN ('approval', 'consultation'));
ALTER TABLE fluxion.approval_policy_steps
  ADD COLUMN IF NOT EXISTS condition jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN fluxion.approval_policy_steps.kind IS
  'approval = decide (vota); consultation = emite un dictamen que consta pero no decide.';
COMMENT ON COLUMN fluxion.approval_policy_steps.condition IS
  'El paso solo entra si el contexto de la solicitud cumple estas condiciones. {} = siempre.';

ALTER TABLE fluxion.approval_requests
  ADD COLUMN IF NOT EXISTS context jsonb NOT NULL DEFAULT '{}'::jsonb;


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
                 'fallback_role',    s.fallback_role,
                 'kind',             s.kind,
                 'condition',        s.condition
               ) ORDER BY s.position
             )
        FROM fluxion.approval_policy_steps s
       WHERE s.policy_id = p.id
    ), '[]'::jsonb)
  )
  FROM fluxion.approval_policies p
  WHERE p.id = p_policy_id;
$$;


CREATE OR REPLACE FUNCTION fluxion.approval_resolve_snapshot(
  p_organization_id uuid,
  p_snapshot        jsonb,
  p_context         jsonb
) RETURNS jsonb LANGUAGE plpgsql STABLE
SET search_path = fluxion, public
AS $$
DECLARE
  v_paso      jsonb;
  v_filtrado  jsonb := '[]'::jsonb;
  v_omitidos  jsonb := '[]'::jsonb;
  v_resuelto  jsonb;
  v_pos       integer := 0;
  clave       text;
  admitido    jsonb;
  v_encaja    boolean;
  v_hay       boolean;
  -- Quien solicita no cuenta como consultado si la política no le deja
  -- decidir: approval_open lo pasa en el contexto (no se guarda).
  v_autor     uuid := CASE WHEN COALESCE((p_snapshot ->> 'author_can_approve')::boolean, false) THEN NULL
                           ELSE (p_context ->> '_requested_by')::uuid END;
BEGIN
  -- 1. Pasos condicionales: cada clave de `condition` tiene que estar en el
  --    contexto con uno de los valores admitidos.
  FOR v_paso IN SELECT * FROM jsonb_array_elements(p_snapshot -> 'steps') ORDER BY (value ->> 'position')::integer LOOP
    v_encaja := true;
    FOR clave, admitido IN SELECT * FROM jsonb_each(COALESCE(v_paso -> 'condition', '{}'::jsonb)) LOOP
      IF NOT (COALESCE(p_context, '{}'::jsonb) ? clave AND admitido @> to_jsonb(p_context ->> clave)) THEN
        v_encaja := false;
        EXIT;
      END IF;
    END LOOP;
    IF NOT v_encaja THEN
      v_omitidos := v_omitidos || jsonb_build_array(v_paso || jsonb_build_object('omitted_reason', 'condition'));
      CONTINUE;
    END IF;
    v_filtrado := v_filtrado || jsonb_build_array(v_paso);
  END LOOP;

  -- 2. Comités por tipo y funciones (resolución de B11b).
  v_resuelto := fluxion.approval_resolve_snapshot(p_organization_id, jsonb_set(p_snapshot, '{steps}', v_filtrado));

  -- 3. Una consulta sin nadie a quien consultar se omite: no tiene respaldo
  --    (el dictamen es de quien tiene la función, no de un sustituto) y no
  --    puede bloquear la solicitud. Queda constancia en `omitted_steps`.
  v_filtrado := '[]'::jsonb;
  FOR v_paso IN SELECT * FROM jsonb_array_elements(v_resuelto -> 'steps') LOOP
    IF COALESCE(v_paso ->> 'kind', 'approval') = 'consultation' THEN
      IF COALESCE((v_paso ->> 'fallback')::boolean, false) THEN
        v_hay := false;  -- la función no estaba designada o el comité no existía
      ELSIF (v_paso ->> 'approver_type') = 'role' THEN
        SELECT EXISTS (SELECT 1 FROM fluxion.profiles p
                        WHERE p.organization_id = p_organization_id AND p.is_active
                          AND p.id IS DISTINCT FROM v_autor
                          AND NOT ('auditor' = ANY (p.roles::text[]))
                          AND (v_paso ->> 'approver_ref') = ANY (p.roles::text[])) INTO v_hay;
      ELSIF (v_paso ->> 'approver_type') = 'profile' THEN
        v_hay := (v_paso ->> 'approver_ref')::uuid IS DISTINCT FROM v_autor;
      ELSE
        v_hay := true;
      END IF;
      IF NOT v_hay THEN
        -- Consta lo que pedía la política (el CISO), no el respaldo.
        v_omitidos := v_omitidos || jsonb_build_array(
          (v_paso - 'fallback' - 'resolved_from') || COALESCE(v_paso -> 'resolved_from', '{}'::jsonb)
            || jsonb_build_object('omitted_reason', 'no_consultee'));
        CONTINUE;
      END IF;
    END IF;
    v_pos := v_pos + 1;
    v_filtrado := v_filtrado || jsonb_build_array(jsonb_set(v_paso, '{position}', to_jsonb(v_pos)));
  END LOOP;

  RETURN jsonb_set(jsonb_set(v_resuelto, '{steps}', v_filtrado), '{omitted_steps}', v_omitidos);
END;
$$;

GRANT EXECUTE ON FUNCTION fluxion.approval_resolve_snapshot(uuid, jsonb, jsonb) TO service_role;


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
  -- B11d: además, pasos condicionales según el contexto y consultas sin nadie
  -- a quien consultar, omitidos.
  v_snap := fluxion.approval_resolve_snapshot(
    p_organization_id, fluxion.approval_snapshot(v_policy),
    COALESCE(p_context, '{}'::jsonb) || jsonb_build_object('_requested_by', p_requested_by));

  IF jsonb_array_length(v_snap -> 'steps') = 0 THEN
    RAISE EXCEPTION 'La politica % no tiene ningun paso: no se puede aprobar nada con ella', v_policy;
  END IF;

  -- B11c: caducidad de la política, congelada como fecha en la solicitud.
  INSERT INTO fluxion.approval_requests
    (organization_id, object_type, object_id, policy_id, policy_snapshot, requested_by, expires_at, context)
  VALUES
    (p_organization_id, p_object_type, p_object_id, v_policy, v_snap, p_requested_by,
     CASE WHEN (v_snap ->> 'expires_after_days') IS NOT NULL
          THEN now() + make_interval(days => (v_snap ->> 'expires_after_days')::integer) END,
     COALESCE(p_context, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


CREATE OR REPLACE FUNCTION fluxion.approval_decide(
  p_request_id uuid,
  p_profile_id uuid,
  p_decision   fluxion.approval_decision_type,
  p_reason     text DEFAULT NULL
) RETURNS fluxion.approval_request_status
LANGUAGE plpgsql
SET search_path = fluxion, public
AS $$
DECLARE
  v_req      record;
  v_motivo   text;
  v_titular  uuid;
  v_paso     jsonb;
  v_quorum   smallint;
  v_favor    smallint;
  v_ultimo   smallint;
  v_consulta boolean;
BEGIN
  SELECT * INTO v_req FROM fluxion.approval_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud % inexistente', p_request_id;
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'La solicitud % ya esta %', p_request_id, v_req.status;
  END IF;

  SELECT motivo, on_behalf_of INTO v_motivo, v_titular
    FROM fluxion.approval_can_decide(p_request_id, p_profile_id);

  IF v_motivo IS NULL THEN
    RAISE EXCEPTION 'El perfil % no puede decidir en el paso % de la solicitud %',
      p_profile_id, v_req.current_position, p_request_id;
  END IF;

  SELECT s INTO v_paso
    FROM jsonb_array_elements(v_req.policy_snapshot -> 'steps') s
   WHERE (s ->> 'position')::smallint = v_req.current_position;

  SELECT max((s ->> 'position')::smallint) INTO v_ultimo
    FROM jsonb_array_elements(v_req.policy_snapshot -> 'steps') s;

  -- B11d: un paso de consulta registra un dictamen (favorable si «aprueba»,
  -- desfavorable si «rechaza») que no decide la solicitud: consta y la hace
  -- avanzar. Sin texto no hay dictamen.
  v_consulta := COALESCE(v_paso ->> 'kind', 'approval') = 'consultation';
  IF v_consulta AND (p_reason IS NULL OR length(btrim(p_reason)) = 0) THEN
    RAISE EXCEPTION 'Un dictamen necesita su texto';
  END IF;
  IF v_consulta AND p_decision = 'abstained' THEN
    RAISE EXCEPTION 'En una consulta no cabe abstenerse: el dictamen es favorable o desfavorable';
  END IF;

  INSERT INTO fluxion.approval_decisions
    (request_id, position, actor_profile_id, on_behalf_of, decision, reason)
  VALUES
    (p_request_id, v_req.current_position, p_profile_id, v_titular, p_decision, p_reason);

  IF v_consulta THEN
    IF v_req.current_position >= v_ultimo THEN
      UPDATE fluxion.approval_requests
         SET status = 'approved', closed_at = now()
       WHERE id = p_request_id;
      RETURN 'approved';
    END IF;
    UPDATE fluxion.approval_requests
       SET current_position = v_req.current_position + 1
     WHERE id = p_request_id;
    RETURN 'pending';
  END IF;

  IF p_decision = 'rejected' THEN
    UPDATE fluxion.approval_requests
       SET status = 'rejected', closed_at = now(), closed_reason = p_reason
     WHERE id = p_request_id;
    RETURN 'rejected';
  END IF;

  v_quorum := COALESCE((v_paso ->> 'quorum')::smallint, 1);

  SELECT count(*) INTO v_favor
    FROM fluxion.approval_decisions d
   WHERE d.request_id = p_request_id
     AND d.position = v_req.current_position
     AND d.decision = 'approved';

  IF v_favor < v_quorum THEN
    RETURN 'pending';
  END IF;

  IF v_req.current_position >= v_ultimo THEN
    UPDATE fluxion.approval_requests
       SET status = 'approved', closed_at = now()
     WHERE id = p_request_id;
    RETURN 'approved';
  END IF;

  UPDATE fluxion.approval_requests
     SET current_position = v_req.current_position + 1
   WHERE id = p_request_id;

  RETURN 'pending';
END;
$$;


-- ── 3. El Auditor nunca decide ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.approval_can_decide(
  p_request_id uuid,
  p_profile_id uuid
) RETURNS TABLE (motivo text, on_behalf_of uuid)
LANGUAGE plpgsql STABLE
SET search_path = fluxion, public
AS $$
DECLARE
  v_req      record;
  v_paso     jsonb;
  v_roles    fluxion.org_role[];
  v_org      uuid;
  v_titular  uuid;
BEGIN
  SELECT * INTO v_req FROM fluxion.approval_requests WHERE id = p_request_id;
  IF NOT FOUND OR v_req.status <> 'pending' THEN
    RETURN;
  END IF;

  SELECT organization_id, roles INTO v_org, v_roles
    FROM fluxion.profiles WHERE id = p_profile_id;

  IF v_org IS DISTINCT FROM v_req.organization_id THEN
    RETURN;
  END IF;

  -- B11d (DP-01, I-08): el Auditor nunca decide; audita lo aprobado.
  IF 'auditor' = ANY (v_roles::text[]) THEN
    RETURN;
  END IF;

  -- Segregacion de funciones: quien lo pidio no lo aprueba, salvo que la
  -- politica congelada dijera lo contrario cuando se abrio.
  IF p_profile_id = v_req.requested_by
     AND NOT COALESCE((v_req.policy_snapshot ->> 'author_can_approve')::boolean, false) THEN
    RETURN;
  END IF;

  -- Ya voto en este paso.
  IF EXISTS (
    SELECT 1 FROM fluxion.approval_decisions d
     WHERE d.request_id = p_request_id
       AND d.position = v_req.current_position
       AND d.actor_profile_id = p_profile_id
  ) THEN
    RETURN;
  END IF;

  SELECT s INTO v_paso
    FROM jsonb_array_elements(v_req.policy_snapshot -> 'steps') s
   WHERE (s ->> 'position')::smallint = v_req.current_position;

  IF v_paso IS NULL THEN
    RETURN;
  END IF;

  -- Por derecho propio
  IF (v_paso ->> 'approver_type') = 'role' AND (v_paso ->> 'approver_ref') = ANY (v_roles::text[]) THEN
    RETURN QUERY SELECT 'role'::text, NULL::uuid;
    RETURN;
  END IF;

  IF (v_paso ->> 'approver_type') = 'profile' AND (v_paso ->> 'approver_ref') = p_profile_id::text THEN
    RETURN QUERY SELECT 'profile'::text, NULL::uuid;
    RETURN;
  END IF;

  IF (v_paso ->> 'approver_type') = 'committee' AND EXISTS (
       SELECT 1 FROM fluxion.committee_members m
        WHERE m.committee_id = (v_paso ->> 'approver_ref')::uuid
          AND m.profile_id = p_profile_id
          AND m.is_active AND m.committee_role <> 'advisor'
     ) THEN
    RETURN QUERY SELECT 'committee'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Por delegacion. Se busca un titular que si pudiera y que haya delegado en
  -- esta persona, con la delegacion vigente hoy y cubriendo este tipo de objeto.
  IF COALESCE((v_paso ->> 'allow_delegation')::boolean, true) THEN
    SELECT d.from_profile_id INTO v_titular
      FROM fluxion.approval_delegations d
      JOIN fluxion.profiles p ON p.id = d.from_profile_id
     WHERE d.to_profile_id = p_profile_id
       AND d.organization_id = v_req.organization_id
       AND CURRENT_DATE BETWEEN d.valid_from AND d.valid_until
       AND (cardinality(d.object_types) = 0 OR v_req.object_type = ANY (d.object_types))
       AND (
            ((v_paso ->> 'approver_type') = 'role'    AND (v_paso ->> 'approver_ref') = ANY (p.roles::text[]))
         OR ((v_paso ->> 'approver_type') = 'profile' AND (v_paso ->> 'approver_ref') = p.id::text)
         OR ((v_paso ->> 'approver_type') = 'committee' AND EXISTS (
              SELECT 1 FROM fluxion.committee_members m
               WHERE m.committee_id = (v_paso ->> 'approver_ref')::uuid
                 AND m.profile_id = p.id
                 AND m.is_active AND m.committee_role <> 'advisor'))
       )
       -- El titular tampoco puede aprobar lo suyo: la delegacion no lava la
       -- segregacion de funciones.
       AND NOT (p.id = v_req.requested_by
                AND NOT COALESCE((v_req.policy_snapshot ->> 'author_can_approve')::boolean, false))
     ORDER BY d.valid_until
     LIMIT 1;

    IF v_titular IS NOT NULL THEN
      RETURN QUERY SELECT 'delegation'::text, v_titular;
      RETURN;
    END IF;
  END IF;

  RETURN;
END;
$$;


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
       AND (v_paso ->> 'approver_ref') = ANY (p.roles::text[])
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
       AND m.is_active AND m.committee_role <> 'advisor'
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
     -- Ni el Auditor (B11d): nunca decide.
     AND NOT EXISTS (
       SELECT 1 FROM fluxion.profiles px
        WHERE px.id = c.id AND 'auditor' = ANY (px.roles::text[])
     )
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


-- ── 4. Exclusión de brechas pendiente de aprobación ──────────────────────────

ALTER TABLE fluxion.gap_dispositions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending'));

COMMENT ON COLUMN fluxion.gap_dispositions.status IS
  'active = la brecha queda excluida; pending = esperando aprobación (DP-07). Una exclusión rechazada se borra.';

/**
 * Una exclusión que gobierna una política solo se activa al aprobarse. Desde la
 * API (con usuario) no se puede crear ya activa, activar una pendiente ni
 * rehacer una activa; tampoco tocar una pendiente, que se retira y se vuelve a
 * pedir. El servidor activa y borra con el rol de servicio (sin `auth.uid()`),
 * como en B10.
 */
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
    RAISE EXCEPTION 'Excluir esta brecha pasa por aprobación'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gap_disposition_rules ON fluxion.gap_dispositions;
CREATE TRIGGER trg_gap_disposition_rules
  BEFORE INSERT OR UPDATE ON fluxion.gap_dispositions
  FOR EACH ROW EXECUTE FUNCTION fluxion.trg_gap_disposition_rules();


-- ── 5. Consultas de DP-01 en las políticas por defecto ───────────────────────

/** Añade a una política sembrada sus pasos de consulta de DP-01, una vez. */
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

  IF v_pol.object_type = 'aisia_assessment'
     OR (v_pol.object_type = 'document' AND v_pol.conditions -> 'template_key' ?| ARRAY['fria', 'dpia']) THEN
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
      ('aisia_assessment', 'Evaluación AISIA (DP-01)',               '{}'::jsonb,                             'committee_type', 'ai_committee',    'sgai_manager'),
      ('document',         'Expediente · Anexo IV (DP-01)',          '{"template_key": ["annex_iv"]}'::jsonb, 'role',           'sgai_manager',    NULL),
      ('document',         'Expediente · FRIA (DP-01)',              '{"template_key": ["fria"]}'::jsonb,     'committee_type', 'ai_committee',    'sgai_manager'),
      ('document',         'Expediente · DPIA (DP-01)',              '{"template_key": ["dpia"]}'::jsonb,     'function',       'data_controller', 'sgai_manager'),
      ('document',         'Expediente · Ficha del modelo',          '{"template_key": ["model_card"]}'::jsonb, 'role',         'sgai_manager',    NULL),
      ('soa',              'Declaración de Aplicabilidad (DP-01)',   '{}'::jsonb,                             'committee_type', 'director_review', 'executive'),
      ('evidence',         'Evidencias (DP-01)',                     '{}'::jsonb,                             'role',           'sgai_manager',    NULL),
      ('gap_disposition',  'Exclusión de brechas (DP-07)',           '{"gap_layer": ["fmea", "normativo"]}'::jsonb, 'role',   'sgai_manager',    NULL)
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


-- Organizaciones existentes: política de exclusión de brechas y consultas en
-- las sembradas sin tocar.
DO $$
DECLARE
  o record;
  p record;
BEGIN
  FOR o IN SELECT id FROM fluxion.organizations LOOP
    PERFORM fluxion.seed_default_approval_policies(o.id);
  END LOOP;
  FOR p IN SELECT id FROM fluxion.approval_policies WHERE is_default AND is_active LOOP
    PERFORM fluxion.add_default_consultations(p.id);
  END LOOP;
END;
$$;


-- ── Vista de la bandeja: exclusiones de brechas ──────────────────────────────

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
      'Exclusión de brecha · ' || COALESCE(
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
