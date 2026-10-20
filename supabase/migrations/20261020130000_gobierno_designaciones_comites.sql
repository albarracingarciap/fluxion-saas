-- ============================================================================
-- Funciones de gobierno, responsables por sistema y comités (B23b, DP-01)
-- ============================================================================
-- Propuesta aprobada el 2026-10-20 (docs/producto/propuesta-b23b-roles-comites.md).
--
--   1. `governance_designations`: funciones de gobierno que no son roles de
--      permisos (CISO, Legal, Riesgos corporativos, Responsable del
--      tratamiento, función de calidad). Una persona por función. Escriben el
--      Administrador y el Responsable del SGAI.
--   2. Incompatibilidad DPO + Responsable del tratamiento (RGPD, Art. 38.6), en
--      las dos direcciones: al designar y al dar el rol DPO.
--   3. Ficha del sistema: Responsable del sistema, Responsable de supervisión
--      humana y su suplente, ligados a miembros. Se intenta casar el texto libre
--      actual (`ai_owner`) con un miembro; el texto se conserva.
--   4. Comités: tipo `technical_committee`, quórum y regla de desempate.
--   5. Flujos de aprobación: los asesores (`advisor`) de un comité tienen voz
--      pero no voto: no son candidatos ni pueden decidir.
--
-- Idempotente: IF NOT EXISTS en tipos, tablas, columnas e índices; funciones con
-- CREATE OR REPLACE; triggers y políticas recreados.
-- ============================================================================


-- ── 1. Funciones de gobierno ─────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'fluxion' AND t.typname = 'governance_function') THEN
    CREATE TYPE fluxion.governance_function AS ENUM (
      'ciso', 'legal', 'corporate_risk', 'data_controller', 'quality'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS fluxion.governance_designations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  function         fluxion.governance_function NOT NULL,
  profile_id       uuid NOT NULL REFERENCES fluxion.profiles(id) ON DELETE CASCADE,
  designated_by    uuid REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  designated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_governance_designation UNIQUE (organization_id, function)
);

COMMENT ON TABLE fluxion.governance_designations IS
  'Funciones de gobierno de DP-01 que no son roles de permisos. Una persona por función (B23b).';

CREATE INDEX IF NOT EXISTS idx_governance_designations_profile
  ON fluxion.governance_designations (profile_id);

ALTER TABLE fluxion.governance_designations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS governance_designations_select ON fluxion.governance_designations;
CREATE POLICY governance_designations_select ON fluxion.governance_designations
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS governance_designations_write ON fluxion.governance_designations;
CREATE POLICY governance_designations_write ON fluxion.governance_designations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM fluxion.profiles p
      WHERE p.user_id = auth.uid()
        AND p.organization_id = governance_designations.organization_id
        AND p.roles && ARRAY['org_admin', 'sgai_manager']::fluxion.org_role[]
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM fluxion.profiles p
      WHERE p.user_id = auth.uid()
        AND p.organization_id = governance_designations.organization_id
        AND p.roles && ARRAY['org_admin', 'sgai_manager']::fluxion.org_role[]
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.governance_designations TO authenticated;
GRANT ALL ON fluxion.governance_designations TO service_role;


-- ── 2. Incompatibilidad DPO + Responsable del tratamiento ────────────────────

CREATE OR REPLACE FUNCTION fluxion.trg_governance_designation_rules() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = fluxion, pg_temp
    AS $$
DECLARE
  v_org   uuid;
  v_roles fluxion.org_role[];
BEGIN
  SELECT organization_id, roles INTO v_org, v_roles
  FROM fluxion.profiles WHERE id = NEW.profile_id;

  IF v_org IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'La persona designada no pertenece a la organización.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.function = 'data_controller' AND 'dpo' = ANY (v_roles) THEN
    RAISE EXCEPTION 'El DPO no puede ser Responsable del tratamiento (RGPD, Art. 38.6).'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_governance_designation_rules ON fluxion.governance_designations;
CREATE TRIGGER trg_governance_designation_rules
  BEFORE INSERT OR UPDATE ON fluxion.governance_designations
  FOR EACH ROW EXECUTE FUNCTION fluxion.trg_governance_designation_rules();

CREATE OR REPLACE FUNCTION fluxion.trg_profiles_dpo_data_controller() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = fluxion, pg_temp
    AS $$
BEGIN
  IF 'dpo' = ANY (NEW.roles) AND EXISTS (
    SELECT 1 FROM fluxion.governance_designations g
    WHERE g.profile_id = NEW.id AND g.function = 'data_controller'
  ) THEN
    RAISE EXCEPTION 'El Responsable del tratamiento no puede ser DPO (RGPD, Art. 38.6).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_dpo_data_controller ON fluxion.profiles;
CREATE TRIGGER trg_profiles_dpo_data_controller
  BEFORE UPDATE OF roles ON fluxion.profiles
  FOR EACH ROW EXECUTE FUNCTION fluxion.trg_profiles_dpo_data_controller();


-- ── 3. Responsables en la ficha del sistema ──────────────────────────────────

ALTER TABLE fluxion.ai_systems
  ADD COLUMN IF NOT EXISTS owner_profile_id uuid REFERENCES fluxion.profiles(id) ON DELETE SET NULL;
ALTER TABLE fluxion.ai_systems
  ADD COLUMN IF NOT EXISTS human_oversight_owner_id uuid REFERENCES fluxion.profiles(id) ON DELETE SET NULL;
ALTER TABLE fluxion.ai_systems
  ADD COLUMN IF NOT EXISTS human_oversight_backup_id uuid REFERENCES fluxion.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN fluxion.ai_systems.owner_profile_id IS
  'Responsable del sistema (miembro con el rol system_owner). ai_owner queda como texto libre del equipo.';
COMMENT ON COLUMN fluxion.ai_systems.human_oversight_owner_id IS
  'Responsable de supervisión humana (AI Act, Art. 14 y 26.2). Obligatorio en alto riesgo para enviar la evaluación.';
COMMENT ON COLUMN fluxion.ai_systems.human_oversight_backup_id IS
  'Suplente del responsable de supervisión humana.';

-- Casar el texto libre con un miembro de la organización, solo si hay uno y
-- solo uno con ese nombre o correo.
UPDATE fluxion.ai_systems s
SET owner_profile_id = m.id
FROM (
  SELECT s2.id AS system_id, min(p.id::text)::uuid AS id
  FROM fluxion.ai_systems s2
  JOIN fluxion.profiles p
    ON p.organization_id = s2.organization_id
   AND (lower(btrim(p.full_name)) = lower(btrim(s2.ai_owner)) OR lower(btrim(p.email)) = lower(btrim(s2.ai_owner)))
  WHERE s2.owner_profile_id IS NULL
    AND s2.ai_owner IS NOT NULL AND btrim(s2.ai_owner) <> ''
  GROUP BY s2.id
  HAVING count(*) = 1
) m
WHERE s.id = m.system_id;


-- ── 4. Comités ───────────────────────────────────────────────────────────────

ALTER TYPE fluxion.committee_type ADD VALUE IF NOT EXISTS 'technical_committee';

ALTER TABLE fluxion.committees
  ADD COLUMN IF NOT EXISTS quorum integer CHECK (quorum IS NULL OR quorum >= 1);
ALTER TABLE fluxion.committees
  ADD COLUMN IF NOT EXISTS tie_break text NOT NULL DEFAULT 'chair' CHECK (tie_break IN ('chair', 'escalate'));

COMMENT ON COLUMN fluxion.committees.quorum IS
  'Miembros con voto necesarios para decidir. NULL = mayoría de los miembros con voto (los asesores no cuentan).';
COMMENT ON COLUMN fluxion.committees.tie_break IS
  'Desempate: chair = voto del presidente; escalate = se eleva al órgano superior.';


-- ── 5. Asesores sin voto en Flujos de aprobación ─────────────────────────────
-- Mismas funciones que en 20261020090000, con los asesores excluidos en las
-- tres comprobaciones de pertenencia a comité.

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
