-- ============================================================================
-- Ciclo único de la evaluación de riesgos: FMEA y plan de tratamiento (B07)
-- ============================================================================
-- DP-03: la evaluación FMEA y su plan de tratamiento forman una sola
-- evaluación de riesgos del sistema, con un ciclo de vida común. Hasta ahora:
--
--   · la evaluación se quedaba en `in_review` para siempre: nada la pasaba a
--     `approved` al aprobarse el plan (GAP-13);
--   · el plan se quedaba en `approved`: nada lo pasaba a `in_progress` ni a
--     `closed` al ejecutar o cerrar sus acciones (GAP-20);
--   · las acciones con opción «Aceptar» se quedaban en `pending` y el plan no
--     podía cerrarse nunca;
--   · sin evaluación aprobada no había versión vigente ni reevaluación posible
--     (GAP-32), y la comparativa entre versiones era inalcanzable.
--
-- Esta migración:
--   1. `fluxion.plan_estado_por_acciones`: estado de ejecución de un plan
--      aprobado según sus acciones (abiertas → `in_progress`; ninguna abierta →
--      `closed`).
--   2. Trigger en `treatment_actions`: recalcula ese estado cuando cambia el
--      estado de una acción de un plan aprobado, en ejecución o cerrado.
--   3. `fluxion.fmea_aplicar_aprobacion_plan`: lo que pasa al aprobarse un plan,
--      en una sola transacción. La llaman las dos vías de aprobación (aprobador
--      asignado y Flujos de aprobación).
--   4. Corrige la propagación tarea → acción: completar desde Tareas la tarea
--      de una acción fallaba siempre (ver §4).
--   5. Migración de datos: aplica (3) a los planes ya aprobados cuya evaluación
--      sigue en revisión.
--
-- Idempotente: funciones con CREATE OR REPLACE, trigger recreado, y la
-- migración de datos solo toca evaluaciones `in_review` con plan aprobado.
-- ============================================================================


-- ── 1. Estado de ejecución del plan ──────────────────────────────────────────
-- Acciones terminadas: `completed`, `accepted` y `cancelled`. Un plan sin
-- acciones (evaluación sin candidatos a tratamiento) se cierra al aprobarse.
-- Solo actúa sobre planes ya aprobados: borrador, revisión y sustituido no se
-- tocan.

CREATE OR REPLACE FUNCTION fluxion.plan_estado_por_acciones(p_plan_id uuid)
RETURNS fluxion.treatment_plan_status
    LANGUAGE plpgsql
    SET search_path = fluxion, pg_temp
    AS $$
DECLARE
  v_estado  fluxion.treatment_plan_status;
  v_abiertas integer;
  v_nuevo   fluxion.treatment_plan_status;
BEGIN
  SELECT status INTO v_estado FROM fluxion.treatment_plans WHERE id = p_plan_id;

  IF v_estado IS NULL OR v_estado NOT IN ('approved', 'in_progress', 'closed') THEN
    RETURN v_estado;
  END IF;

  SELECT count(*) INTO v_abiertas
  FROM fluxion.treatment_actions
  WHERE plan_id = p_plan_id
    AND status NOT IN ('completed', 'accepted', 'cancelled');

  v_nuevo := CASE WHEN v_abiertas = 0 THEN 'closed' ELSE 'in_progress' END;

  IF v_nuevo IS DISTINCT FROM v_estado THEN
    UPDATE fluxion.treatment_plans
    SET status = v_nuevo, updated_at = now()
    WHERE id = p_plan_id;
  END IF;

  RETURN v_nuevo;
END;
$$;

ALTER FUNCTION fluxion.plan_estado_por_acciones(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION fluxion.plan_estado_por_acciones(uuid) FROM PUBLIC, anon, authenticated;


-- ── 2. Trigger en las acciones ───────────────────────────────────────────────
-- SECURITY DEFINER: la acción la puede completar quien tiene la tarea asignada
-- (trg_task_done_propagate), y esa persona no tiene por qué poder escribir el
-- plan por RLS.

CREATE OR REPLACE FUNCTION fluxion.trg_treatment_action_plan_status() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = fluxion, pg_temp
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM fluxion.plan_estado_por_acciones(OLD.plan_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM fluxion.plan_estado_por_acciones(NEW.plan_id);
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION fluxion.trg_treatment_action_plan_status() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_treatment_action_plan_status ON fluxion.treatment_actions;
CREATE TRIGGER trg_treatment_action_plan_status
  AFTER INSERT OR DELETE OR UPDATE OF status ON fluxion.treatment_actions
  FOR EACH ROW EXECUTE FUNCTION fluxion.trg_treatment_action_plan_status();


-- ── 3. Aprobación del plan ───────────────────────────────────────────────────
-- Se llama cuando el plan ya está en `approved` (lo deja así cada vía de
-- aprobación, que además guarda su instantánea). En una transacción:
--
--   a. Las acciones «Aceptar» pendientes quedan aceptadas: la aprobación del
--      plan es la aprobación de la aceptación del riesgo.
--   b. La evaluación del plan pasa a `approved`, con aprobador, fecha y próxima
--      revisión según la cadencia del plan.
--   c. Las versiones anteriores del mismo sistema pasan a `superseded`. Sus
--      planes abiertos también, y sus acciones abiertas se cancelan (con ellas,
--      sus tareas, por trg_treatment_action_sync_task): lo que siga haciendo
--      falta ya está en el plan de la versión nueva.
--   d. El plan pasa a `in_progress`, o a `closed` si no le queda ninguna acción
--      abierta.
--
-- p_aprobador es auth.users.id, como el resto de campos de aprobador (P1).
-- Devuelve un resumen para el historial del sistema.

CREATE OR REPLACE FUNCTION fluxion.fmea_aplicar_aprobacion_plan(p_plan_id uuid, p_aprobador uuid)
RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = fluxion, pg_temp
    AS $$
DECLARE
  v_plan         record;
  v_eval         record;
  v_aprobado_en  timestamptz;
  v_intervalo    interval;
  v_aceptadas    integer;
  v_evals_sust   uuid[];
  v_planes_sust  uuid[];
  v_canceladas   integer := 0;
  v_estado       fluxion.treatment_plan_status;
BEGIN
  SELECT id, organization_id, system_id, evaluation_id, status, approved_at, review_cadence
  INTO v_plan
  FROM fluxion.treatment_plans
  WHERE id = p_plan_id
  FOR UPDATE;

  IF v_plan.id IS NULL THEN
    RAISE EXCEPTION 'Plan % no encontrado', p_plan_id;
  END IF;

  IF v_plan.status <> 'approved' THEN
    RAISE EXCEPTION 'El plan % no está aprobado (estado %)', p_plan_id, v_plan.status;
  END IF;

  SELECT id, version INTO v_eval
  FROM fluxion.fmea_evaluations
  WHERE id = v_plan.evaluation_id
  FOR UPDATE;

  v_aprobado_en := COALESCE(v_plan.approved_at, now());
  v_intervalo := CASE v_plan.review_cadence
    WHEN 'monthly'   THEN interval '1 month'
    WHEN 'quarterly' THEN interval '3 months'
    WHEN 'biannual'  THEN interval '6 months'
    WHEN 'annual'    THEN interval '12 months'
    ELSE NULL
  END;

  -- a. Aceptaciones
  UPDATE fluxion.treatment_actions
  SET status                 = 'accepted',
      acceptance_approved_by = COALESCE(acceptance_approved_by, p_aprobador),
      acceptance_approved_at = COALESCE(acceptance_approved_at, v_aprobado_en)
  WHERE plan_id = p_plan_id
    AND option = 'aceptar'
    AND status = 'pending';
  GET DIAGNOSTICS v_aceptadas = ROW_COUNT;

  -- b. Evaluación aprobada
  UPDATE fluxion.fmea_evaluations
  SET state          = 'approved',
      approver_id    = p_aprobador,
      approved_at    = v_aprobado_en,
      next_review_at = CASE WHEN v_intervalo IS NULL THEN NULL ELSE v_aprobado_en + v_intervalo END
  WHERE id = v_plan.evaluation_id;

  -- c. Versiones anteriores sustituidas
  WITH sust AS (
    UPDATE fluxion.fmea_evaluations
    SET state = 'superseded'
    WHERE organization_id = v_plan.organization_id
      AND system_id       = v_plan.system_id
      AND id             <> v_plan.evaluation_id
      AND version         < v_eval.version
      AND state          <> 'superseded'
    RETURNING id
  )
  SELECT COALESCE(array_agg(id), '{}') INTO v_evals_sust FROM sust;

  WITH sust AS (
    UPDATE fluxion.treatment_plans
    SET status = 'superseded'
    WHERE evaluation_id = ANY (v_evals_sust)
      AND status NOT IN ('closed', 'superseded')
    RETURNING id
  )
  SELECT COALESCE(array_agg(id), '{}') INTO v_planes_sust FROM sust;

  IF array_length(v_planes_sust, 1) > 0 THEN
    UPDATE fluxion.treatment_actions
    SET status = 'cancelled'
    WHERE plan_id = ANY (v_planes_sust)
      AND status NOT IN ('completed', 'accepted', 'cancelled');
    GET DIAGNOSTICS v_canceladas = ROW_COUNT;
  END IF;

  -- d. Estado de ejecución del plan
  v_estado := fluxion.plan_estado_por_acciones(p_plan_id);

  RETURN jsonb_build_object(
    'plan_status',             v_estado,
    'accepted_actions',        v_aceptadas,
    'superseded_evaluations',  to_jsonb(v_evals_sust),
    'superseded_plans',        to_jsonb(v_planes_sust),
    'cancelled_actions',       v_canceladas,
    'next_review_at',          CASE WHEN v_intervalo IS NULL THEN NULL ELSE v_aprobado_en + v_intervalo END
  );
END;
$$;

ALTER FUNCTION fluxion.fmea_aplicar_aprobacion_plan(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION fluxion.fmea_aplicar_aprobacion_plan(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION fluxion.fmea_aplicar_aprobacion_plan(uuid, uuid) TO service_role;


-- ── 4. Propagación tarea → acción ────────────────────────────────────────────
-- trg_task_done_propagate es BEFORE UPDATE en `tasks` y, al marcar la tarea
-- como hecha, completaba la acción. La acción, en su trigger AFTER
-- (trg_treatment_action_sync_task), vuelve a actualizar la misma tarea, que
-- todavía se está actualizando: Postgres aborta con «tuple to be updated was
-- already modified by an operation triggered by the current command». Es
-- decir, completar desde Tareas la tarea de una acción del plan fallaba
-- siempre, y con ello el plan nunca podía cerrarse por esa vía.
--
-- La parte que modifica la propia fila (completed_at) sigue en BEFORE; la
-- propagación a la acción pasa a un trigger AFTER, cuando la tarea ya está
-- escrita. El reenvío de la acción a la tarea llega entonces con la tarea ya en
-- `done` y no vuelve a propagar.
--
-- Idempotente: la función BEFORE se reemplaza y el trigger AFTER se recrea.

CREATE OR REPLACE FUNCTION fluxion.trg_task_done_propagate() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status <> 'done' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;

  -- Limpiar completed_at si se reabre
  IF NEW.status <> 'done' AND OLD.status = 'done' THEN
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- SECURITY DEFINER: quien completa la tarea es quien la tiene asignada, y RLS
-- puede no dejarle escribir la acción; sin esto la acción se quedaría abierta
-- en silencio. Solo toca la acción de origen de la tarea que se completa.
CREATE OR REPLACE FUNCTION fluxion.trg_task_done_propagate_action() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = fluxion, pg_temp
    AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status <> 'done'
     AND NEW.source_type = 'treatment_action' AND NEW.source_id IS NOT NULL
  THEN
    UPDATE fluxion.treatment_actions
    SET status = 'completed', completed_at = now()
    WHERE id = NEW.source_id
      AND status NOT IN ('completed', 'accepted', 'cancelled');
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION fluxion.trg_task_done_propagate_action() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_task_done_propagate_action ON fluxion.tasks;
CREATE TRIGGER trg_task_done_propagate_action
  AFTER UPDATE OF status ON fluxion.tasks
  FOR EACH ROW EXECUTE FUNCTION fluxion.trg_task_done_propagate_action();


-- ── 5. Datos existentes ──────────────────────────────────────────────────────
-- Planes aprobados cuya evaluación se quedó en revisión: se les aplica la
-- aprobación como si acabara de producirse, de la versión más antigua a la más
-- reciente, para que cada sistema termine con su última versión vigente.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tp.id AS plan_id, tp.approver_id
    FROM fluxion.treatment_plans tp
    JOIN fluxion.fmea_evaluations fe ON fe.id = tp.evaluation_id
    WHERE tp.status = 'approved'
      AND fe.state = 'in_review'
    ORDER BY fe.system_id, fe.version
  LOOP
    PERFORM fluxion.fmea_aplicar_aprobacion_plan(r.plan_id, r.approver_id);
  END LOOP;
END;
$$;
