-- ============================================================================
-- AISIA, Declaración de Aplicabilidad y evidencias: solo en el circuito (B11g)
-- ============================================================================
-- Mismo cierre que el plan (B11e) y el expediente (B11f). Desde la interfaz ya
-- no se aprueban fuera de Flujos de aprobación; aquí se cierra también la API:
--
--   1. Evidencias (`trg_evidence_review_rules`, B10): con usuario autenticado ya
--      no se pasa a «Válida» ni a «Rechazada».
--   2. AISIA (`trg_aisia_lifecycle_rules`, nuevo): con usuario no se pasa a
--      «Aprobada» ni a «Rechazada».
--   3. Declaración (`trg_soa_lifecycle_rules`, nuevo): con usuario no se pasa a
--      «Aprobada».
--   Lo aplica el efecto de la aprobación con el rol de servicio, sin usuario.
--
--   4. Objetos en revisión sin solicitud pendiente: se les abre con su política
--      y `context.prepared_by` (quien aporta la evidencia; quien creó y envió la
--      AISIA), para que no los decida quien los preparó (DP-01). Si no se puede,
--      vuelven a borrador.
--
-- Idempotente: funciones con CREATE OR REPLACE, triggers con DROP IF EXISTS; el
-- paso 4 solo actúa sobre objetos en revisión sin solicitud.
-- ============================================================================


-- ── 1. Evidencias ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.trg_evidence_review_rules() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = fluxion, pg_temp
    AS $$
DECLARE
  v_uid   uuid := auth.uid();
BEGIN
  -- Escrituras del sistema (service role, tareas programadas, migraciones).
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('draft', 'pending_review') THEN
      RAISE EXCEPTION 'Una evidencia nueva entra en borrador o pendiente de revisión; se valida con la revisión.'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Transiciones del ciclo. «→ draft» desde válida, caducada o pendiente es la
  -- vuelta a borrador al modificar su contenido.
  IF NOT (
       (OLD.status IN ('draft', 'rejected') AND NEW.status = 'pending_review')
    OR (OLD.status = 'pending_review'        AND NEW.status IN ('valid', 'rejected'))
    OR (OLD.status IN ('rejected', 'valid', 'expired', 'pending_review') AND NEW.status = 'draft')
  ) THEN
    RAISE EXCEPTION 'La evidencia no puede pasar de «%» a «%»: el estado solo cambia con el ciclo de revisión.',
      OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- B11g: aprobar o rechazar se decide en Flujos de aprobación; lo aplica su
  -- efecto con el rol de servicio (sin usuario, arriba).
  IF NEW.status IN ('valid', 'rejected') THEN
    RAISE EXCEPTION 'La evidencia se aprueba o rechaza en Aprobaciones.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;


-- ── 2. AISIA ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.trg_aisia_lifecycle_rules() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = fluxion, pg_temp
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('approved', 'rejected')
     AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
    RAISE EXCEPTION 'La AISIA se aprueba o rechaza en Aprobaciones.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aisia_lifecycle_rules ON fluxion.aisia_assessments;
CREATE TRIGGER trg_aisia_lifecycle_rules
  BEFORE INSERT OR UPDATE ON fluxion.aisia_assessments
  FOR EACH ROW EXECUTE FUNCTION fluxion.trg_aisia_lifecycle_rules();


-- ── 3. Declaración de Aplicabilidad ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.trg_soa_lifecycle_rules() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = fluxion, pg_temp
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.lifecycle_status = 'approved'
     AND (TG_OP = 'INSERT' OR NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status) THEN
    RAISE EXCEPTION 'La Declaración de Aplicabilidad se aprueba en Aprobaciones.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_soa_lifecycle_rules ON fluxion.organization_soa_metadata;
CREATE TRIGGER trg_soa_lifecycle_rules
  BEFORE INSERT OR UPDATE ON fluxion.organization_soa_metadata
  FOR EACH ROW EXECUTE FUNCTION fluxion.trg_soa_lifecycle_rules();


-- ── 4. Objetos en revisión sin solicitud ─────────────────────────────────────

DO $$
DECLARE
  o           record;
  v_perfil    uuid;
  v_req       uuid;
  v_abiertas  integer := 0;
  v_devueltos integer := 0;
BEGIN
  -- AISIA enviadas
  FOR o IN
    SELECT a.id, a.organization_id, a.created_by, a.submitted_by
      FROM fluxion.aisia_assessments a
     WHERE a.status = 'submitted'
       AND NOT EXISTS (SELECT 1 FROM fluxion.approval_requests r
                        WHERE r.object_type = 'aisia_assessment' AND r.object_id = a.id AND r.status = 'pending')
  LOOP
    v_req := NULL;
    IF COALESCE(o.submitted_by, o.created_by) IS NOT NULL THEN
      v_req := fluxion.approval_open(o.organization_id, 'aisia_assessment', o.id, COALESCE(o.submitted_by, o.created_by),
        jsonb_build_object('prepared_by',
          (SELECT COALESCE(jsonb_agg(DISTINCT x), '[]'::jsonb) FROM unnest(ARRAY[o.created_by, o.submitted_by]) x WHERE x IS NOT NULL)));
    END IF;
    IF v_req IS NOT NULL THEN
      v_abiertas := v_abiertas + 1;
    ELSE
      UPDATE fluxion.aisia_assessments SET status = 'draft', submitted_at = NULL, submitted_by = NULL WHERE id = o.id;
      v_devueltos := v_devueltos + 1;
    END IF;
  END LOOP;

  -- Evidencias pendientes de revisión
  FOR o IN
    SELECT e.id, e.organization_id, e.owner_user_id
      FROM fluxion.system_evidences e
     WHERE e.status = 'pending_review'
       AND NOT EXISTS (SELECT 1 FROM fluxion.approval_requests r
                        WHERE r.object_type = 'evidence' AND r.object_id = e.id AND r.status = 'pending')
  LOOP
    SELECT p.id INTO v_perfil FROM fluxion.profiles p
     WHERE p.user_id = o.owner_user_id AND p.organization_id = o.organization_id LIMIT 1;
    v_req := NULL;
    IF v_perfil IS NOT NULL THEN
      v_req := fluxion.approval_open(o.organization_id, 'evidence', o.id, v_perfil,
        jsonb_build_object('prepared_by', jsonb_build_array(v_perfil)));
    END IF;
    IF v_req IS NOT NULL THEN
      v_abiertas := v_abiertas + 1;
    ELSE
      UPDATE fluxion.system_evidences SET status = 'draft', updated_at = now() WHERE id = o.id;
      v_devueltos := v_devueltos + 1;
    END IF;
  END LOOP;

  -- Declaraciones en revisión: la pidió quien la envió (último paso a revisión).
  FOR o IN
    SELECT m.organization_id
      FROM fluxion.organization_soa_metadata m
     WHERE m.lifecycle_status = 'under_review'
       AND NOT EXISTS (SELECT 1 FROM fluxion.approval_requests r
                        WHERE r.object_type = 'soa' AND r.object_id = m.organization_id AND r.status = 'pending')
  LOOP
    SELECT l.actor_user_id INTO v_perfil
      FROM fluxion.soa_lifecycle_log l
      JOIN fluxion.profiles p ON p.id = l.actor_user_id AND p.organization_id = o.organization_id
     WHERE l.organization_id = o.organization_id AND l.to_status = 'under_review'
     ORDER BY l.created_at DESC LIMIT 1;
    v_req := NULL;
    IF v_perfil IS NOT NULL THEN
      v_req := fluxion.approval_open(o.organization_id, 'soa', o.organization_id, v_perfil, '{}'::jsonb);
    END IF;
    IF v_req IS NOT NULL THEN
      v_abiertas := v_abiertas + 1;
    ELSE
      UPDATE fluxion.organization_soa_metadata SET lifecycle_status = 'draft' WHERE organization_id = o.organization_id;
      INSERT INTO fluxion.soa_lifecycle_log (organization_id, actor_user_id, from_status, to_status)
      VALUES (o.organization_id, NULL, 'under_review', 'draft');
      v_devueltos := v_devueltos + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'B11g: % solicitudes abiertas, % objetos devueltos a borrador', v_abiertas, v_devueltos;
END;
$$;
