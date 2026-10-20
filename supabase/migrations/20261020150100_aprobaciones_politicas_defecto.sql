-- ============================================================================
-- Flujos de aprobación: políticas por defecto de DP-01 (B11b, 2/2)
-- ============================================================================
-- Requiere 20261020150000 (tipos de aprobador `committee_type` y `function`).
--
-- Hasta ahora, sin una política configurada a mano cada objeto se aprobaba por
-- su vía propia, con garantías distintas (F-01). Esta migración hace que toda
-- organización tenga una política para cada tipo de objeto, con el mapa de
-- aprobaciones de DP-01:
--
--   1. Varias políticas activas por tipo, con condiciones distintas (por nivel
--      del plan, por plantilla del expediente). Se aplica la más específica.
--   2. Pasos con aprobador por tipo de comité o por función de gobierno, y un
--      rol de respaldo. Al abrir la solicitud se resuelven al comité activo
--      (con su quórum: el fijado o la mayoría de los miembros con voto) o a la
--      persona designada; si el comité no está constituido o la función no está
--      designada, decide el rol de respaldo. La resolución queda congelada en la
--      solicitud, con lo que se resolvió y por qué.
--   3. `seed_default_approval_policies`: siembra las políticas de DP-01 en los
--      tipos que la organización no tenga cubiertos. Se ejecuta al crear la
--      organización y aquí para las existentes. No toca los tipos que ya tengan
--      alguna política activa: puede ser una configuración deliberada.
--   4. Los objetos que ya esperaban aprobación por la vía antigua (planes,
--      AISIA, expedientes, evidencias y Declaraciones en revisión) abren su
--      solicitud con la política por defecto.
--
-- Políticas sembradas (DP-01):
--
--   Plan de tratamiento · nivel 1   Responsable del SGAI
--   Plan de tratamiento · nivel 2   Comité de Riesgos de IA      (respaldo: Responsable del SGAI)
--   Plan de tratamiento · nivel 3   Revisión por la Dirección    (respaldo: Directivo)
--   Evaluación AISIA                Comité de IA                 (respaldo: Responsable del SGAI)
--   Expediente · Anexo IV           Responsable del SGAI
--   Expediente · FRIA               Comité de IA                 (respaldo: Responsable del SGAI)
--   Expediente · DPIA               Responsable del tratamiento  (respaldo: Responsable del SGAI)
--   Expediente · Ficha del modelo   Responsable del SGAI
--   Declaración de Aplicabilidad    Revisión por la Dirección    (respaldo: Directivo)
--   Evidencias                      Responsable del SGAI
--
-- La delegación de la dirección en Zona I (decidida el 2026-10-20) usa las
-- delegaciones con fecha de fin que ya existen: los pasos de nivel 3 la admiten,
-- y el motor nunca deja decidir a quien pidió la aprobación, tampoco por
-- delegación.
--
-- Idempotente: funciones con CREATE OR REPLACE, columnas e índices con IF
-- [NOT] EXISTS, la siembra solo cubre tipos sin política y la apertura solo
-- objetos sin solicitud viva.
-- ============================================================================


-- ── 1. Pasos: rol de respaldo y quórum de los comités por tipo ───────────────

ALTER TABLE fluxion.approval_policy_steps
  ADD COLUMN IF NOT EXISTS fallback_role fluxion.org_role;

COMMENT ON COLUMN fluxion.approval_policy_steps.fallback_role IS
  'Rol que decide si el comité por tipo no está constituido o la función no está designada. NULL = Responsable del SGAI.';

ALTER TABLE fluxion.approval_policy_steps
  DROP CONSTRAINT IF EXISTS chk_quorum_solo_comites;
ALTER TABLE fluxion.approval_policy_steps
  ADD CONSTRAINT chk_quorum_solo_comites CHECK (
       (approver_type = 'committee' AND quorum IS NOT NULL AND quorum >= 1)
    -- Por tipo de comité: vacío = el quórum del comité (o la mayoría de los que votan).
    OR (approver_type = 'committee_type' AND (quorum IS NULL OR quorum >= 1))
    OR (approver_type IN ('role', 'profile', 'function') AND quorum IS NULL)
  );


-- ── 2. Varias políticas activas por tipo, con condiciones distintas ──────────

-- Marca de las políticas sembradas: se distinguen de las que configura la
-- organización, que la siembra nunca pisa.
ALTER TABLE fluxion.approval_policies
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

DROP INDEX IF EXISTS fluxion.uq_approval_policy_activa;
CREATE UNIQUE INDEX IF NOT EXISTS uq_approval_policy_activa_condiciones
  ON fluxion.approval_policies (organization_id, object_type, md5(conditions::text))
  WHERE is_active;

-- La más específica (más condiciones) gana; a igualdad, la más antigua.
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
     ORDER BY (SELECT count(*) FROM jsonb_object_keys(conditions)) DESC, created_at
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


-- ── 3. Congelar y resolver la política ───────────────────────────────────────

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

/**
 * Resuelve los pasos por tipo de comité y por función a aprobadores concretos.
 *
 * El resultado solo usa los tipos que el motor ya sabe decidir (rol, perfil y
 * comité), así que `approval_can_decide` y `approval_step_candidates` no
 * cambian. Cada paso resuelto guarda en `resolved_from` lo que pedía la
 * política, y en `fallback` si decidió el rol de respaldo.
 */
CREATE OR REPLACE FUNCTION fluxion.approval_resolve_snapshot(p_organization_id uuid, p_snapshot jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE
SET search_path = fluxion, public
AS $$
DECLARE
  v_paso      jsonb;
  v_pasos     jsonb := '[]'::jsonb;
  v_comite    record;
  v_votan     integer;
  v_perfil    uuid;
  v_respaldo  text;
  v_origen    jsonb;
BEGIN
  FOR v_paso IN SELECT * FROM jsonb_array_elements(p_snapshot -> 'steps') LOOP
    v_respaldo := COALESCE(v_paso ->> 'fallback_role', 'sgai_manager');
    v_origen := jsonb_build_object('approver_type', v_paso ->> 'approver_type', 'approver_ref', v_paso ->> 'approver_ref');

    IF (v_paso ->> 'approver_type') = 'committee_type' THEN
      SELECT c.id, c.quorum INTO v_comite
        FROM fluxion.committees c
       WHERE c.organization_id = p_organization_id
         AND c.type::text = (v_paso ->> 'approver_ref')
         AND c.is_active
       ORDER BY c.created_at
       LIMIT 1;

      v_votan := 0;
      IF v_comite.id IS NOT NULL THEN
        SELECT count(*) INTO v_votan
          FROM fluxion.committee_members m
          JOIN fluxion.profiles p ON p.id = m.profile_id
         WHERE m.committee_id = v_comite.id
           AND m.is_active
           AND m.committee_role <> 'advisor'
           AND p.is_active;
      END IF;

      IF v_comite.id IS NOT NULL AND v_votan > 0 THEN
        v_paso := v_paso || jsonb_build_object(
          'approver_type', 'committee',
          'approver_ref',  v_comite.id,
          -- El quórum del paso, el del comité o la mayoría de los que votan;
          -- nunca más de los que pueden votar, o la solicitud no se cerraría.
          'quorum', LEAST(COALESCE((v_paso ->> 'quorum')::integer, v_comite.quorum, v_votan / 2 + 1), v_votan),
          'resolved_from', v_origen
        );
      ELSE
        v_paso := v_paso || jsonb_build_object(
          'approver_type', 'role', 'approver_ref', v_respaldo, 'quorum', 1,
          'fallback', true, 'resolved_from', v_origen
        );
      END IF;

    ELSIF (v_paso ->> 'approver_type') = 'function' THEN
      SELECT g.profile_id INTO v_perfil
        FROM fluxion.governance_designations g
        JOIN fluxion.profiles p ON p.id = g.profile_id
       WHERE g.organization_id = p_organization_id
         AND g.function::text = (v_paso ->> 'approver_ref')
         AND p.is_active;

      IF v_perfil IS NOT NULL THEN
        v_paso := v_paso || jsonb_build_object(
          'approver_type', 'profile', 'approver_ref', v_perfil, 'quorum', 1, 'resolved_from', v_origen
        );
      ELSE
        v_paso := v_paso || jsonb_build_object(
          'approver_type', 'role', 'approver_ref', v_respaldo, 'quorum', 1,
          'fallback', true, 'resolved_from', v_origen
        );
      END IF;
    END IF;

    v_pasos := v_pasos || jsonb_build_array(v_paso);
  END LOOP;

  RETURN jsonb_set(p_snapshot, '{steps}', v_pasos);
END;
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

  INSERT INTO fluxion.approval_requests
    (organization_id, object_type, object_id, policy_id, policy_snapshot, requested_by)
  VALUES
    (p_organization_id, p_object_type, p_object_id, v_policy, v_snap, p_requested_by)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fluxion.approval_resolve_snapshot(uuid, jsonb) TO service_role;


-- ── 4. Políticas por defecto de DP-01 ────────────────────────────────────────

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
      ('evidence',         'Evidencias (DP-01)',                     '{}'::jsonb,                             'role',           'sgai_manager',    NULL)
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

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION fluxion.seed_default_approval_policies(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION fluxion.seed_default_approval_policies(uuid) TO service_role;

CREATE OR REPLACE FUNCTION fluxion.trg_seed_default_approval_policies() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = fluxion, public
AS $$
BEGIN
  PERFORM fluxion.seed_default_approval_policies(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_organization_created_seed_approvals ON fluxion.organizations;
CREATE TRIGGER on_organization_created_seed_approvals
  AFTER INSERT ON fluxion.organizations
  FOR EACH ROW EXECUTE FUNCTION fluxion.trg_seed_default_approval_policies();

-- Organizaciones existentes.
DO $$
DECLARE
  o record;
BEGIN
  FOR o IN SELECT id FROM fluxion.organizations LOOP
    PERFORM fluxion.seed_default_approval_policies(o.id);
  END LOOP;
END;
$$;


-- ── 5. Objetos que ya esperaban aprobación por la vía antigua ────────────────
-- Abren su solicitud con la política por defecto. Quien la pide: quien preparó
-- el objeto o, si no se puede saber, un Administrador o Responsable del SGAI.
-- Un fallo en un objeto no detiene los demás.

CREATE OR REPLACE FUNCTION fluxion.tmp_b11b_solicitante(p_org uuid, p_profile uuid, p_user uuid)
RETURNS uuid LANGUAGE sql STABLE
SET search_path = fluxion, public
AS $$
  SELECT COALESCE(
    (SELECT id FROM fluxion.profiles WHERE id = p_profile AND organization_id = p_org),
    (SELECT id FROM fluxion.profiles WHERE user_id = p_user AND organization_id = p_org),
    (SELECT id FROM fluxion.profiles
      WHERE organization_id = p_org AND is_active
        AND roles && ARRAY['org_admin', 'sgai_manager']::fluxion.org_role[]
      ORDER BY created_at LIMIT 1)
  );
$$;

DO $$
DECLARE
  r record;
  v_sol uuid;
BEGIN
  -- Planes de tratamiento en aprobación
  FOR r IN
    SELECT tp.id, tp.organization_id, tp.created_by, tp.approval_level
      FROM fluxion.treatment_plans tp
     WHERE tp.status = 'in_review'
       AND NOT EXISTS (SELECT 1 FROM fluxion.approval_requests ar
                        WHERE ar.object_type = 'treatment_plan' AND ar.object_id = tp.id AND ar.status = 'pending')
  LOOP
    BEGIN
      v_sol := fluxion.tmp_b11b_solicitante(r.organization_id, NULL, r.created_by);
      IF v_sol IS NOT NULL THEN
        PERFORM fluxion.approval_open(r.organization_id, 'treatment_plan', r.id, v_sol,
                                      jsonb_build_object('approval_level', r.approval_level));
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Plan %: no se pudo abrir la solicitud (%)', r.id, SQLERRM;
    END;
  END LOOP;

  -- AISIA enviadas
  FOR r IN
    SELECT a.id, a.organization_id, COALESCE(a.submitted_by, a.created_by) AS perfil
      FROM fluxion.aisia_assessments a
     WHERE a.status = 'submitted'
       AND NOT EXISTS (SELECT 1 FROM fluxion.approval_requests ar
                        WHERE ar.object_type = 'aisia_assessment' AND ar.object_id = a.id AND ar.status = 'pending')
  LOOP
    BEGIN
      v_sol := fluxion.tmp_b11b_solicitante(r.organization_id, r.perfil, NULL);
      IF v_sol IS NOT NULL THEN
        PERFORM fluxion.approval_open(r.organization_id, 'aisia_assessment', r.id, v_sol, '{}'::jsonb);
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'AISIA %: no se pudo abrir la solicitud (%)', r.id, SQLERRM;
    END;
  END LOOP;

  -- Expedientes en revisión (no las actas)
  FOR r IN
    SELECT d.id, d.organization_id, d.created_by, d.template_key
      FROM fluxion.documents d
     WHERE d.status = 'in_review'
       AND d.approval_request_id IS NULL
       AND NOT EXISTS (SELECT 1 FROM fluxion.approval_requests ar
                        WHERE ar.object_type = 'document' AND ar.object_id = d.id AND ar.status = 'pending')
  LOOP
    BEGIN
      v_sol := fluxion.tmp_b11b_solicitante(r.organization_id, r.created_by, NULL);
      IF v_sol IS NOT NULL THEN
        PERFORM fluxion.approval_open(r.organization_id, 'document', r.id, v_sol,
                                      jsonb_build_object('template_key', r.template_key));
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Expediente %: no se pudo abrir la solicitud (%)', r.id, SQLERRM;
    END;
  END LOOP;

  -- Evidencias pendientes de revisión
  FOR r IN
    SELECT e.id, e.organization_id, e.owner_user_id
      FROM fluxion.system_evidences e
     WHERE e.status = 'pending_review'
       AND NOT EXISTS (SELECT 1 FROM fluxion.approval_requests ar
                        WHERE ar.object_type = 'evidence' AND ar.object_id = e.id AND ar.status = 'pending')
  LOOP
    BEGIN
      v_sol := fluxion.tmp_b11b_solicitante(r.organization_id, NULL, r.owner_user_id);
      IF v_sol IS NOT NULL THEN
        PERFORM fluxion.approval_open(r.organization_id, 'evidence', r.id, v_sol, '{}'::jsonb);
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Evidencia %: no se pudo abrir la solicitud (%)', r.id, SQLERRM;
    END;
  END LOOP;

  -- Declaraciones de Aplicabilidad en revisión (una por organización)
  FOR r IN
    SELECT m.organization_id
      FROM fluxion.organization_soa_metadata m
     WHERE m.lifecycle_status = 'under_review'
       AND NOT EXISTS (SELECT 1 FROM fluxion.approval_requests ar
                        WHERE ar.object_type = 'soa' AND ar.object_id = m.organization_id AND ar.status = 'pending')
  LOOP
    BEGIN
      v_sol := fluxion.tmp_b11b_solicitante(r.organization_id, NULL, NULL);
      IF v_sol IS NOT NULL THEN
        PERFORM fluxion.approval_open(r.organization_id, 'soa', r.organization_id, v_sol, '{}'::jsonb);
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Declaración de %: no se pudo abrir la solicitud (%)', r.organization_id, SQLERRM;
    END;
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS fluxion.tmp_b11b_solicitante(uuid, uuid, uuid);
