-- ============================================================================
-- Roles múltiples por miembro (B23a, decisión DP-01)
-- ============================================================================
-- Hasta ahora cada miembro tenía un solo rol (`profiles.role`). DP-01 exige
-- acumular roles en la misma persona (Administrador + Responsable del SGAI,
-- Responsable del sistema + Analista de riesgos…) y permitir varios
-- Administradores.
--
--   · `profiles.roles` guarda todos los roles del miembro. Es la fuente de
--     verdad.
--   · `profiles.role` se conserva como ROL PRINCIPAL (= roles[1]) para que el
--     código que aún lo lee siga funcionando. Un trigger los mantiene
--     sincronizados en los dos sentidos.
--   · Las políticas RLS y las funciones de aprobación pasan a comprobar la
--     lista completa.
--   · Incompatibilidad de DP-01: DPO y Responsable del SGAI no pueden recaer en
--     la misma persona (RGPD, Art. 38.6).
--
-- Idempotente.
-- ============================================================================


-- ── 1. Columna y relleno ─────────────────────────────────────────────────────

ALTER TABLE fluxion.profiles
  ADD COLUMN IF NOT EXISTS roles fluxion.org_role[] NOT NULL DEFAULT '{}';

UPDATE fluxion.profiles
   SET roles = ARRAY[role]
 WHERE cardinality(roles) = 0;

COMMENT ON COLUMN fluxion.profiles.roles IS
  'Todos los roles del miembro en la organización. El primero es el principal y coincide con `role`.';
COMMENT ON COLUMN fluxion.profiles.role IS
  'Rol principal (= roles[1]). Se mantiene por compatibilidad: las comprobaciones de permisos usan `roles`.';

CREATE INDEX IF NOT EXISTS idx_profiles_roles ON fluxion.profiles USING gin (roles);


-- ── 2. Sincronización role ⇄ roles ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.sync_profile_roles() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.role IS DISTINCT FROM OLD.role
     AND NEW.roles IS NOT DISTINCT FROM OLD.roles THEN
    -- Escritura antigua que solo cambia `role`: el nuevo rol pasa a principal y
    -- sustituye al anterior; los demás roles se conservan.
    NEW.roles := array_prepend(NEW.role, array_remove(array_remove(OLD.roles, OLD.role), NEW.role));
  ELSIF NEW.roles IS NULL OR cardinality(NEW.roles) = 0 THEN
    NEW.roles := ARRAY[NEW.role];
  ELSE
    -- `roles` manda: sin duplicados, en el orden dado; el primero es el principal.
    NEW.roles := ARRAY(
      SELECT r FROM unnest(NEW.roles) WITH ORDINALITY AS u(r, o)
       GROUP BY r ORDER BY min(o)
    );
    NEW.role := NEW.roles[1];
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_sync_roles ON fluxion.profiles;
CREATE TRIGGER trg_profiles_sync_roles
  BEFORE INSERT OR UPDATE OF role, roles ON fluxion.profiles
  FOR EACH ROW EXECUTE FUNCTION fluxion.sync_profile_roles();


-- ── 3. Restricciones ─────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE fluxion.profiles
    ADD CONSTRAINT chk_profiles_rol_principal CHECK (cardinality(roles) > 0 AND role = roles[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE fluxion.profiles
    ADD CONSTRAINT chk_profiles_dpo_no_sgai
    CHECK (NOT ('dpo'::fluxion.org_role = ANY (roles) AND 'sgai_manager'::fluxion.org_role = ANY (roles)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 4. Políticas RLS: de `role` a `roles` ────────────────────────────────────
--
-- Las políticas comparan el rol con dos patrones (deparseados por Postgres):
--   <alias>.role = ANY (ARRAY[...])    →  <alias>.roles && ARRAY[...]
--   <alias>.role = 'x'::fluxion.org_role →  'x'::fluxion.org_role = ANY (<alias>.roles)
-- con <alias> = profiles o p. Se reescriben desde el catálogo, así que cubren
-- las políticas tal como están, vengan de la migración que vengan. Si alguna
-- conserva el patrón antiguo, la migración se aborta.

DO $$
DECLARE
  pol        record;
  v_qual     text;
  v_check    text;
  v_sql      text;
  v_cambios  int := 0;
  v_restan   int;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, qual, with_check
      FROM pg_policies
     WHERE coalesce(qual, '') || coalesce(with_check, '') ~ '\m(profiles|p)\.role\M'
  LOOP
    v_qual  := pol.qual;
    v_check := pol.with_check;

    IF v_qual IS NOT NULL THEN
      v_qual := regexp_replace(v_qual, '\m(profiles|p)\.role = ANY \((ARRAY\[[^]]*\])\)', '\1.roles && \2', 'g');
      v_qual := regexp_replace(v_qual, '\m(profiles|p)\.role = (''[a-z_]+''::fluxion\.org_role)', '\2 = ANY (\1.roles)', 'g');
    END IF;
    IF v_check IS NOT NULL THEN
      v_check := regexp_replace(v_check, '\m(profiles|p)\.role = ANY \((ARRAY\[[^]]*\])\)', '\1.roles && \2', 'g');
      v_check := regexp_replace(v_check, '\m(profiles|p)\.role = (''[a-z_]+''::fluxion\.org_role)', '\2 = ANY (\1.roles)', 'g');
    END IF;

    v_sql := format('ALTER POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    IF v_qual IS NOT NULL THEN
      v_sql := v_sql || format(' USING (%s)', v_qual);
    END IF;
    IF v_check IS NOT NULL THEN
      v_sql := v_sql || format(' WITH CHECK (%s)', v_check);
    END IF;

    EXECUTE v_sql;
    v_cambios := v_cambios + 1;
  END LOOP;

  SELECT count(*) INTO v_restan
    FROM pg_policies
   WHERE coalesce(qual, '') || coalesce(with_check, '') ~ '\m(profiles|p)\.role\M';

  IF v_restan > 0 THEN
    RAISE EXCEPTION 'Quedan % políticas que comparan con profiles.role: revisar antes de aplicar', v_restan;
  END IF;

  RAISE NOTICE 'Políticas RLS reescritas a roles múltiples: %', v_cambios;
END $$;


-- ── 5. Funciones de Flujos de aprobación ─────────────────────────────────────
-- Misma definición vigente, comparando con la lista de roles.

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
            ((v_paso ->> 'approver_type') = 'role'    AND (v_paso ->> 'approver_ref') = ANY (p.roles::text[]))
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
