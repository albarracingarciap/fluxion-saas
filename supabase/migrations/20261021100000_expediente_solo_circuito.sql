-- ============================================================================
-- Expediente documental: solo se aprueba en Flujos de aprobación (B11f)
-- ============================================================================
-- Mismo cierre que el plan en B11e. Hasta ahora, un expediente cuya plantilla
-- no encajaba con ninguna política se aprobaba desde su pantalla, y la base de
-- datos dejaba aprobarlo a un Responsable del SGAI que no lo hubiera redactado.
--
--   1. `trg_document_lifecycle_rules`: con usuario autenticado ya no se puede
--      pasar a «Aprobado»; lo hace el efecto de la aprobación (rol de servicio).
--   2. Segregación de quien prepara (DP-01, I-08): la regla «quien redacta un
--      apartado no aprueba» vivía en ese trigger. Pasa al motor: la solicitud
--      lleva en `context.prepared_by` los perfiles que prepararon el objeto, y
--      ni ellos ni quien la pidió pueden decidir ni ser candidatos, tampoco como
--      titulares de una delegación (salvo que la política lo permita).
--   3. Expedientes «En revisión» sin solicitud pendiente: se les abre con la
--      política de su plantilla; si no hay política o autor, vuelven a borrador.
--
-- Idempotente: funciones con CREATE OR REPLACE; el paso 3 solo actúa sobre
-- expedientes en revisión sin solicitud.
-- ============================================================================


-- ── 2. Quien prepara no decide ───────────────────────────────────────────────

/** ¿Pidió o preparó este perfil el objeto de la solicitud, sin que la política le deje aprobar? */
CREATE OR REPLACE FUNCTION fluxion.approval_is_preparer(p_request_id uuid, p_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE
SET search_path = fluxion, public
AS $$
  SELECT COALESCE((
    SELECT NOT COALESCE((r.policy_snapshot ->> 'author_can_approve')::boolean, false)
       AND (p_profile_id = r.requested_by
            OR COALESCE(r.context -> 'prepared_by', '[]'::jsonb) ? p_profile_id::text)
      FROM fluxion.approval_requests r
     WHERE r.id = p_request_id
  ), false);
$$;

GRANT EXECUTE ON FUNCTION fluxion.approval_is_preparer(uuid, uuid) TO authenticated, service_role;


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

  -- Segregacion de funciones: quien lo pidio o lo preparo no lo aprueba,
  -- salvo que la politica congelada dijera lo contrario (B11f).
  IF fluxion.approval_is_preparer(p_request_id, p_profile_id) THEN
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
       AND NOT fluxion.approval_is_preparer(p_request_id, p.id)
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
     -- Segregacion de funciones: quien la pidio o la preparo no aparece, salvo
     -- que la politica congelada lo permitiera (B11f).
     NOT fluxion.approval_is_preparer(p_request_id, c.id)
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


-- ── 1. El expediente no se aprueba fuera del circuito ────────────────────────

CREATE OR REPLACE FUNCTION fluxion.trg_document_lifecycle_rules() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = fluxion, pg_temp
    AS $$
DECLARE
  v_uid     uuid := auth.uid();
BEGIN
  -- Escrituras del sistema (service role: actas de aprobación, migraciones).
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'Un expediente nuevo nace en borrador.'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.content IS DISTINCT FROM OLD.content AND OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'El expediente solo se edita en borrador.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
       (OLD.status = 'draft'     AND NEW.status = 'in_review')
    OR (OLD.status = 'in_review' AND NEW.status IN ('draft', 'approved'))
    OR (OLD.status = 'approved'  AND NEW.status = 'superseded')
  ) THEN
    RAISE EXCEPTION 'El expediente no puede pasar de «%» a «%».', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- B11f: el expediente solo se aprueba en Flujos de aprobación. Lo aplica
  -- el efecto de la aprobación con el rol de servicio (sin usuario, arriba).
  IF NEW.status = 'approved' THEN
    RAISE EXCEPTION 'El expediente se aprueba en Aprobaciones.'
      USING ERRCODE = 'insufficient_privilege';
  ELSIF NEW.status IN ('draft', 'in_review') THEN
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;


-- ── 3. Expedientes en revisión sin solicitud ─────────────────────────────────

DO $$
DECLARE
  d           record;
  v_autores   jsonb;
  v_req       uuid;
  v_abiertas  integer := 0;
  v_devueltos integer := 0;
BEGIN
  FOR d IN
    SELECT doc.id, doc.organization_id, doc.template_key, doc.created_by, doc.content
      FROM fluxion.documents doc
     WHERE doc.status = 'in_review'
       AND NOT EXISTS (
         SELECT 1 FROM fluxion.approval_requests r
          WHERE r.object_type = 'document'
            AND r.object_id = doc.id
            AND r.status = 'pending')
  LOOP
    SELECT COALESCE(jsonb_agg(DISTINCT c.valor ->> 'author_id') FILTER (WHERE c.valor ->> 'author_id' IS NOT NULL), '[]'::jsonb)
      INTO v_autores
      FROM jsonb_each(COALESCE(d.content, '{}'::jsonb)) AS c(ref, valor)
     WHERE jsonb_typeof(c.valor) = 'object';

    v_req := NULL;
    IF d.created_by IS NOT NULL THEN
      v_req := fluxion.approval_open(
        d.organization_id, 'document', d.id, d.created_by,
        jsonb_build_object('template_key', d.template_key, 'prepared_by', v_autores));
    END IF;

    IF v_req IS NOT NULL THEN
      v_abiertas := v_abiertas + 1;
    ELSE
      UPDATE fluxion.documents SET status = 'draft', updated_at = now() WHERE id = d.id;
      v_devueltos := v_devueltos + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'B11f: % solicitudes abiertas, % expedientes devueltos a borrador', v_abiertas, v_devueltos;
END;
$$;
