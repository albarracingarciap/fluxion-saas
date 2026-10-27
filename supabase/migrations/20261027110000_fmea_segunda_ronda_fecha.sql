-- ============================================================================
-- FMEA: fecha de la segunda ronda de un plan parcial (B14b, TODO 282)
-- ============================================================================
--   Un plan parcial deja modos sin evaluar para una segunda ronda. El responsable
--   ha decidido que el plan parcial fije una fecha para esa segunda ronda:
--
--     - `fmea_evaluations.second_round_due_date`: fecha límite de la segunda
--       ronda, obligatoria al enviar un plan parcial y nula en un envío completo;
--     - `fmea_aplicar_aprobacion_plan`: al aprobarse, la próxima revisión es la
--       de la cadencia de la zona o la fecha de la segunda ronda, la anterior.
--       El resto de la función no cambia (20261020100000).
--
-- Idempotente.
-- ============================================================================

ALTER TABLE fluxion.fmea_evaluations
  ADD COLUMN IF NOT EXISTS second_round_due_date date;

COMMENT ON COLUMN fluxion.fmea_evaluations.second_round_due_date IS
  'Fecha límite de la segunda ronda de un plan parcial (B14b). Nula en un envío completo. Al aprobarse, la próxima revisión no la supera.';

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
  v_proxima      timestamptz;
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

  SELECT id, version, second_round_due_date INTO v_eval
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

  -- Próxima revisión: la de la cadencia o, en un plan parcial, la fecha de la
  -- segunda ronda si es anterior (B14b, TODO 282). LEAST ignora los NULL.
  v_proxima := LEAST(
    CASE WHEN v_intervalo IS NULL THEN NULL ELSE v_aprobado_en + v_intervalo END,
    v_eval.second_round_due_date::timestamptz
  );

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
      next_review_at = v_proxima
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
    'next_review_at',          v_proxima
  );
END;
$$;

ALTER FUNCTION fluxion.fmea_aplicar_aprobacion_plan(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION fluxion.fmea_aplicar_aprobacion_plan(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION fluxion.fmea_aplicar_aprobacion_plan(uuid, uuid) TO service_role;
