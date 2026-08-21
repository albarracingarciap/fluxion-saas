-- ============================================================================
-- C3 · Motor de aprobaciones — nucleo
-- ============================================================================
-- Fluxion ya tiene seis maquinas de estado de aprobacion, una por dominio. Este
-- motor NO las sustituye: responde solo a quien debe aprobar, en que orden y
-- con que quorum, y devuelve un veredicto. Cada dominio conserva su columna de
-- estado y decide que hacer con el.
--
-- Anclaje: Art. 9.5 del Reglamento (UE) 2024/1689 — el riesgo residual «is
-- judged to be acceptable». Juzgar es un acto de alguien; tiene que constar
-- quien y con que autoridad. Hoy eso es un campo de texto libre
-- (treatment_plans.approval_minutes_ref).
--
-- Este paso deja el nucleo funcionando y probable por SQL. Sin interfaz.
-- ============================================================================


-- ── Vocabulario ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE fluxion.approval_object_type AS ENUM (
    'treatment_plan', 'aisia_assessment', 'document', 'soa', 'evidence'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fluxion.approval_approver_type AS ENUM ('role', 'profile', 'committee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fluxion.approval_request_status AS ENUM (
    'pending', 'approved', 'rejected', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fluxion.approval_decision_type AS ENUM ('approved', 'rejected', 'abstained');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 1 · Politicas ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.approval_policies (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  object_type        fluxion.approval_object_type NOT NULL,
  name               text NOT NULL,

  -- Cuando aplica. Cada clave debe existir en el contexto que se pasa al abrir
  -- la solicitud y su valor estar en la lista. Vacio = aplica siempre.
  --
  --   {"approval_level": ["level_2", "level_3"]}
  conditions         jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Segregacion de funciones. Se puede desactivar —en una organizacion de tres
  -- personas puede no haber alternativa— pero queda registrado en la politica,
  -- de modo que un auditor vea una decision consciente y no un descuido.
  author_can_approve boolean NOT NULL DEFAULT false,

  is_active          boolean NOT NULL DEFAULT true,
  created_by         uuid REFERENCES fluxion.profiles(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Una sola politica activa por tipo de objeto: con dos, «cual se aplico» pasa a
-- depender del orden de insercion, y eso no se puede explicar a un auditor.
CREATE UNIQUE INDEX IF NOT EXISTS uq_approval_policy_activa
  ON fluxion.approval_policies (organization_id, object_type)
  WHERE is_active;


-- ── 2 · Pasos de la cadena ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.approval_policy_steps (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id        uuid NOT NULL REFERENCES fluxion.approval_policies(id) ON DELETE CASCADE,
  position         smallint NOT NULL CHECK (position >= 1),

  approver_type    fluxion.approval_approver_type NOT NULL,
  -- El rol (org_role), el id del perfil o el id del comite, segun el tipo.
  approver_ref     text NOT NULL,

  -- Solo para comites. En rol y perfil el quorum es 1 por definicion, y
  -- permitir otro valor invitaria a configurar algo que no se puede cumplir.
  quorum           smallint,

  allow_delegation boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (policy_id, position),
  CONSTRAINT chk_quorum_solo_comites CHECK (
    (approver_type = 'committee' AND quorum IS NOT NULL AND quorum >= 1)
    OR (approver_type <> 'committee' AND quorum IS NULL)
  )
);


-- ── 3 · Solicitudes ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.approval_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  -- Sin clave ajena a proposito: los cinco objetos viven en tablas distintas y
  -- una FK polimorfica no existe en PostgreSQL. La integridad la garantiza
  -- quien abre la solicitud.
  object_type      fluxion.approval_object_type NOT NULL,
  object_id        uuid NOT NULL,

  policy_id        uuid REFERENCES fluxion.approval_policies(id) ON DELETE SET NULL,

  -- La politica CONGELADA. Si alguien la cambia manana, las solicitudes vivas
  -- siguen con la regla que se les aplico. Sin esto el historico miente:
  -- verias «aprobado por una persona» bajo una politica que hoy exige tres.
  -- Mismo razonamiento que el coste congelado de telemetry.llm_spans.
  policy_snapshot  jsonb NOT NULL,

  status           fluxion.approval_request_status NOT NULL DEFAULT 'pending',
  current_position smallint NOT NULL DEFAULT 1,

  requested_by     uuid NOT NULL REFERENCES fluxion.profiles(id),
  requested_at     timestamptz NOT NULL DEFAULT now(),
  closed_at        timestamptz,
  closed_reason    text,

  CONSTRAINT chk_cierre_coherente CHECK (
    (status = 'pending' AND closed_at IS NULL)
    OR (status <> 'pending' AND closed_at IS NOT NULL)
  )
);

-- Una solicitud viva por objeto. Dos abiertas a la vez sobre lo mismo dejarian
-- dos veredictos posibles y ninguna forma de saber cual manda.
CREATE UNIQUE INDEX IF NOT EXISTS uq_approval_request_viva
  ON fluxion.approval_requests (object_type, object_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_approval_requests_org
  ON fluxion.approval_requests (organization_id, status, requested_at DESC);


-- ── 4 · Decisiones ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.approval_decisions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        uuid NOT NULL REFERENCES fluxion.approval_requests(id) ON DELETE CASCADE,
  position          smallint NOT NULL,

  -- Quien decide de verdad. Nunca se guarda el titular como si hubiera
  -- decidido el: delegar no es suplantar.
  actor_profile_id  uuid NOT NULL REFERENCES fluxion.profiles(id),
  on_behalf_of      uuid REFERENCES fluxion.profiles(id),

  decision          fluxion.approval_decision_type NOT NULL,
  reason            text,
  decided_at        timestamptz NOT NULL DEFAULT now(),

  -- Rechazar sin motivo no es una decision, es un portazo. El siguiente que
  -- rehaga el objeto necesita saber que corregir.
  CONSTRAINT chk_rechazo_motivado CHECK (
    decision <> 'rejected' OR (reason IS NOT NULL AND length(btrim(reason)) > 0)
  ),

  -- Un voto por persona y paso. Cambiar de opinion exige cancelar y reabrir,
  -- no reescribir lo que ya se dijo.
  UNIQUE (request_id, position, actor_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_approval_decisions_request
  ON fluxion.approval_decisions (request_id, position);

-- Inmutable: se corrige con otra decision, no editando la anterior.
CREATE OR REPLACE FUNCTION fluxion.approval_decisions_inmutables()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Las decisiones de aprobacion no se modifican ni se borran (solicitud %, paso %)',
    OLD.request_id, OLD.position;
END;
$$;

DROP TRIGGER IF EXISTS trg_approval_decisions_inmutables ON fluxion.approval_decisions;
CREATE TRIGGER trg_approval_decisions_inmutables
  BEFORE UPDATE OR DELETE ON fluxion.approval_decisions
  FOR EACH ROW EXECUTE FUNCTION fluxion.approval_decisions_inmutables();


-- ── 5 · Delegaciones ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.approval_delegations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  from_profile_id  uuid NOT NULL REFERENCES fluxion.profiles(id) ON DELETE CASCADE,
  to_profile_id    uuid NOT NULL REFERENCES fluxion.profiles(id) ON DELETE CASCADE,

  valid_from       date NOT NULL DEFAULT CURRENT_DATE,
  -- Obligatoria: una delegacion sin caducidad es una transferencia de
  -- autoridad disfrazada.
  valid_until      date NOT NULL,

  -- Vacio = todos los tipos de objeto.
  object_types     fluxion.approval_object_type[] NOT NULL DEFAULT '{}',

  created_by       uuid REFERENCES fluxion.profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_ventana_valida CHECK (valid_until >= valid_from),
  CONSTRAINT chk_no_autodelegacion CHECK (from_profile_id <> to_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_approval_delegations_destino
  ON fluxion.approval_delegations (to_profile_id, valid_until);


-- ── updated_at ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.set_approval_policies_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_approval_policies_updated_at ON fluxion.approval_policies;
CREATE TRIGGER trg_approval_policies_updated_at
  BEFORE UPDATE ON fluxion.approval_policies
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_approval_policies_updated_at();


-- ============================================================================
-- Motor
-- ============================================================================

/**
 * Congela una politica y sus pasos en un jsonb.
 *
 * Lo que se guarda aqui es lo que decidira quien puede aprobar durante toda la
 * vida de la solicitud, pase lo que pase con la politica original.
 */
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
    'steps', COALESCE((
      SELECT jsonb_agg(
               jsonb_build_object(
                 'position',         s.position,
                 'approver_type',    s.approver_type,
                 'approver_ref',     s.approver_ref,
                 'quorum',           COALESCE(s.quorum, 1),
                 'allow_delegation', s.allow_delegation
               ) ORDER BY s.position
             )
        FROM fluxion.approval_policy_steps s
       WHERE s.policy_id = p.id
    ), '[]'::jsonb)
  )
  FROM fluxion.approval_policies p
  WHERE p.id = p_policy_id;
$$;


/**
 * Politica activa aplicable a un objeto, o NULL si ninguna aplica.
 *
 * `p_context` describe el objeto en el momento de pedir la aprobacion; para un
 * plan de tratamiento seria {"approval_level": "level_3"}. Cada clave de
 * `conditions` tiene que estar en el contexto y su valor figurar en la lista.
 *
 * Sin politica no hay aprobacion: el dominio sigue como hasta ahora. Eso es lo
 * que permite enganchar un dominio cada vez sin migrar nada.
 */
CREATE OR REPLACE FUNCTION fluxion.approval_policy_for(
  p_organization_id uuid,
  p_object_type     fluxion.approval_object_type,
  p_context         jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql STABLE
SET search_path = fluxion, public
AS $$
DECLARE
  r        record;
  clave    text;
  admitido jsonb;
  encaja   boolean;
BEGIN
  FOR r IN
    SELECT id, conditions
      FROM fluxion.approval_policies
     WHERE organization_id = p_organization_id
       AND object_type = p_object_type
       AND is_active
  LOOP
    encaja := true;

    FOR clave, admitido IN SELECT * FROM jsonb_each(r.conditions) LOOP
      IF p_context ? clave
         AND admitido @> to_jsonb(p_context ->> clave) THEN
        CONTINUE;
      END IF;
      encaja := false;
      EXIT;
    END LOOP;

    IF encaja THEN
      RETURN r.id;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;


/**
 * ¿Puede esta persona decidir en el paso actual de esta solicitud?
 *
 * Devuelve el motivo por el que si —'role', 'profile', 'committee'— junto al
 * titular por cuenta de quien actua, si viene por delegacion. NULL en `motivo`
 * significa que no puede.
 *
 * La resolucion sale del snapshot, no de la politica viva (§2.3 del plan).
 */
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
  v_rol      fluxion.org_role;
  v_org      uuid;
  v_titular  uuid;
BEGIN
  SELECT * INTO v_req FROM fluxion.approval_requests WHERE id = p_request_id;
  IF NOT FOUND OR v_req.status <> 'pending' THEN
    RETURN;
  END IF;

  SELECT organization_id, role INTO v_org, v_rol
    FROM fluxion.profiles WHERE id = p_profile_id;

  IF v_org IS DISTINCT FROM v_req.organization_id THEN
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
  IF (v_paso ->> 'approver_type') = 'role' AND (v_paso ->> 'approver_ref') = v_rol::text THEN
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
          AND m.is_active
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
            ((v_paso ->> 'approver_type') = 'role'    AND (v_paso ->> 'approver_ref') = p.role::text)
         OR ((v_paso ->> 'approver_type') = 'profile' AND (v_paso ->> 'approver_ref') = p.id::text)
         OR ((v_paso ->> 'approver_type') = 'committee' AND EXISTS (
              SELECT 1 FROM fluxion.committee_members m
               WHERE m.committee_id = (v_paso ->> 'approver_ref')::uuid
                 AND m.profile_id = p.id
                 AND m.is_active))
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


/**
 * Abre una solicitud. Devuelve su id, o NULL si ninguna politica aplica.
 *
 * NULL no es un error: significa que ese objeto, en ese estado, no requiere
 * aprobacion. El dominio sigue como hasta ahora.
 */
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

  v_snap := fluxion.approval_snapshot(v_policy);

  IF jsonb_array_length(v_snap -> 'steps') = 0 THEN
    RAISE EXCEPTION 'La politica % no tiene ningun paso: no se puede aprobar nada con ella', v_policy;
  END IF;

  INSERT INTO fluxion.approval_requests
    (organization_id, object_type, object_id, policy_id, policy_snapshot, requested_by)
  VALUES
    (p_organization_id, p_object_type, p_object_id, v_policy, v_snap, p_requested_by)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


/**
 * Registra un voto y avanza la solicitud si procede.
 *
 * Un rechazo cierra la solicitud entera de inmediato. La alternativa —seguir
 * recogiendo votos de un paso ya perdido— produce expedientes donde alguien
 * aprobo algo que ya estaba rechazado.
 *
 * Las abstenciones NO cuentan para el quorum: constan, pero no acercan la
 * aprobacion. Es lo que significa abstenerse.
 */
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

  INSERT INTO fluxion.approval_decisions
    (request_id, position, actor_profile_id, on_behalf_of, decision, reason)
  VALUES
    (p_request_id, v_req.current_position, p_profile_id, v_titular, p_decision, p_reason);

  IF p_decision = 'rejected' THEN
    UPDATE fluxion.approval_requests
       SET status = 'rejected', closed_at = now(), closed_reason = p_reason
     WHERE id = p_request_id;
    RETURN 'rejected';
  END IF;

  SELECT s INTO v_paso
    FROM jsonb_array_elements(v_req.policy_snapshot -> 'steps') s
   WHERE (s ->> 'position')::smallint = v_req.current_position;

  v_quorum := COALESCE((v_paso ->> 'quorum')::smallint, 1);

  SELECT count(*) INTO v_favor
    FROM fluxion.approval_decisions d
   WHERE d.request_id = p_request_id
     AND d.position = v_req.current_position
     AND d.decision = 'approved';

  IF v_favor < v_quorum THEN
    RETURN 'pending';
  END IF;

  SELECT max((s ->> 'position')::smallint) INTO v_ultimo
    FROM jsonb_array_elements(v_req.policy_snapshot -> 'steps') s;

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


/**
 * Cancela una solicitud viva. La pide quien la abrio o un administrador; eso lo
 * comprueba la capa de aplicacion, que es quien conoce al usuario.
 */
CREATE OR REPLACE FUNCTION fluxion.approval_cancel(
  p_request_id uuid,
  p_reason     text
) RETURNS void LANGUAGE plpgsql
SET search_path = fluxion, public
AS $$
BEGIN
  UPDATE fluxion.approval_requests
     SET status = 'cancelled', closed_at = now(), closed_reason = p_reason
   WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La solicitud % no existe o ya estaba cerrada', p_request_id;
  END IF;
END;
$$;


-- ============================================================================
-- RLS
-- ============================================================================
-- Lectura para los miembros de la organizacion. Escritura de politicas para los
-- tres roles que ya gestionan comites.
--
-- Las solicitudes y las decisiones NO se escriben directamente: solo a traves
-- de las funciones de arriba, que son las que mantienen las invariantes
-- (quorum, segregacion, avance de paso). Una politica de INSERT abierta las
-- dejaria esquivar por completo.

ALTER TABLE fluxion.approval_policies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.approval_policy_steps  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.approval_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.approval_decisions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.approval_delegations   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS approval_policies_select ON fluxion.approval_policies;
CREATE POLICY approval_policies_select ON fluxion.approval_policies
  FOR SELECT USING (organization_id = fluxion.auth_user_org_id());

DROP POLICY IF EXISTS approval_policies_manage ON fluxion.approval_policies;
CREATE POLICY approval_policies_manage ON fluxion.approval_policies
  USING (
    organization_id = fluxion.auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM fluxion.profiles p
       WHERE p.user_id = auth.uid()
         AND p.role = ANY (ARRAY['org_admin', 'sgai_manager', 'caio']::fluxion.org_role[])
    )
  );

DROP POLICY IF EXISTS approval_policy_steps_select ON fluxion.approval_policy_steps;
CREATE POLICY approval_policy_steps_select ON fluxion.approval_policy_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fluxion.approval_policies p
       WHERE p.id = policy_id AND p.organization_id = fluxion.auth_user_org_id()
    )
  );

DROP POLICY IF EXISTS approval_policy_steps_manage ON fluxion.approval_policy_steps;
CREATE POLICY approval_policy_steps_manage ON fluxion.approval_policy_steps
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.approval_policies pol
       JOIN fluxion.profiles p ON p.user_id = auth.uid()
       WHERE pol.id = policy_id
         AND pol.organization_id = fluxion.auth_user_org_id()
         AND p.role = ANY (ARRAY['org_admin', 'sgai_manager', 'caio']::fluxion.org_role[])
    )
  );

DROP POLICY IF EXISTS approval_requests_select ON fluxion.approval_requests;
CREATE POLICY approval_requests_select ON fluxion.approval_requests
  FOR SELECT USING (organization_id = fluxion.auth_user_org_id());

DROP POLICY IF EXISTS approval_decisions_select ON fluxion.approval_decisions;
CREATE POLICY approval_decisions_select ON fluxion.approval_decisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fluxion.approval_requests r
       WHERE r.id = request_id AND r.organization_id = fluxion.auth_user_org_id()
    )
  );

DROP POLICY IF EXISTS approval_delegations_select ON fluxion.approval_delegations;
CREATE POLICY approval_delegations_select ON fluxion.approval_delegations
  FOR SELECT USING (organization_id = fluxion.auth_user_org_id());

DROP POLICY IF EXISTS approval_delegations_manage ON fluxion.approval_delegations;
CREATE POLICY approval_delegations_manage ON fluxion.approval_delegations
  USING (
    organization_id = fluxion.auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM fluxion.profiles p
       WHERE p.user_id = auth.uid()
         AND (p.id = from_profile_id
              OR p.role = ANY (ARRAY['org_admin', 'sgai_manager']::fluxion.org_role[]))
    )
  );


-- ── Permisos ────────────────────────────────────────────────────────────────
-- SELECT a `authenticated` y todo a `service_role`, que es quien ejecuta las
-- acciones de servidor. Las cuatro vistas de este modulo no existen todavia.

GRANT SELECT ON fluxion.approval_policies     TO authenticated;
GRANT SELECT ON fluxion.approval_policy_steps TO authenticated;
GRANT SELECT ON fluxion.approval_requests     TO authenticated;
GRANT SELECT ON fluxion.approval_decisions    TO authenticated;
GRANT SELECT ON fluxion.approval_delegations  TO authenticated;

GRANT ALL ON fluxion.approval_policies     TO service_role;
GRANT ALL ON fluxion.approval_policy_steps TO service_role;
GRANT ALL ON fluxion.approval_requests     TO service_role;
GRANT ALL ON fluxion.approval_decisions    TO service_role;
GRANT ALL ON fluxion.approval_delegations  TO service_role;

GRANT EXECUTE ON FUNCTION fluxion.approval_policy_for(uuid, fluxion.approval_object_type, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION fluxion.approval_snapshot(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION fluxion.approval_can_decide(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fluxion.approval_open(uuid, fluxion.approval_object_type, uuid, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION fluxion.approval_decide(uuid, uuid, fluxion.approval_decision_type, text) TO service_role;
GRANT EXECUTE ON FUNCTION fluxion.approval_cancel(uuid, text) TO service_role;


COMMENT ON TABLE fluxion.approval_requests IS
  'Solicitudes de aprobacion. `policy_snapshot` congela la regla aplicada: sin '
  'eso, el historico no permite saber que politica regia cuando se aprobo.';

COMMENT ON TABLE fluxion.approval_decisions IS
  'Votos individuales, inmutables. `on_behalf_of` registra la delegacion sin '
  'ocultar quien decidio realmente.';
