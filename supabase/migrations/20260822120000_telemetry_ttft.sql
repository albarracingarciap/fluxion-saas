-- ─────────────────────────────────────────────────────────────────────────────
-- B2 · Tiempo hasta el primer token
--
-- La duración del tramo mide la llamada completa. En streaming eso NO es lo que
-- percibe el usuario: la primera palabra aparece mucho antes de que la
-- respuesta termine.
--
-- Sin esta métrica, un panel que dice "6 segundos" suena a servicio lento
-- cuando puede que el usuario esté leyendo desde el segundo 0,8. Son dos cosas
-- distintas y piden arreglos distintos.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE telemetry.llm_spans
  ADD COLUMN IF NOT EXISTS ttft_ms integer;

COMMENT ON COLUMN telemetry.llm_spans.ttft_ms IS
  'Milisegundos hasta el primer token con contenido. Solo en streaming; nulo en el resto. Es la latencia percibida, frente a duration_ms que es la llamada entera.';

ALTER TABLE telemetry.rollup_daily
  ADD COLUMN IF NOT EXISTS ttft_p50_ms integer,
  ADD COLUMN IF NOT EXISTS ttft_p95_ms integer;

-- ─────────────────────────────────────────────────────────────────────────────
-- Recálculo con las dos métricas
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION telemetry.compute_rollup(
  p_day_from date DEFAULT (now() - interval '1 day')::date,
  p_day_to   date DEFAULT now()::date
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = telemetry, fluxion, public
AS $$
DECLARE
  v_started timestamptz := clock_timestamp();
  v_rows    integer := 0;
BEGIN
  DELETE FROM telemetry.rollup_daily
   WHERE day BETWEEN p_day_from AND p_day_to;

  INSERT INTO telemetry.rollup_daily (
    organization_id, day, ai_system_id, provider_name, request_model, environment,
    calls, errors, input_tokens, output_tokens, cost_total, calls_costed,
    duration_p50_ms, duration_p95_ms, ttft_p50_ms, ttft_p95_ms
  )
  SELECT
    s.organization_id,
    (s.started_at AT TIME ZONE 'UTC')::date,
    coalesce(s.ai_system_id, '00000000-0000-0000-0000-000000000000'::uuid),
    s.provider_name,
    coalesce(s.request_model, 'desconocido'),
    coalesce(s.environment, 'desconocido'),
    count(*),
    count(*) FILTER (WHERE s.error_type IS NOT NULL),
    sum(coalesce(s.input_tokens, 0)),
    sum(coalesce(s.output_tokens, 0)),
    sum(coalesce(s.cost_total, 0)),
    count(*) FILTER (WHERE s.cost_status <> 'unknown'),
    percentile_disc(0.5)  WITHIN GROUP (ORDER BY s.duration_ms)::integer,
    percentile_disc(0.95) WITHIN GROUP (ORDER BY s.duration_ms)::integer,
    -- Solo sobre las llamadas que lo declaran: incluir las no-streaming como
    -- ceros hundiría la mediana y daría una latencia percibida falsamente buena.
    percentile_disc(0.5)  WITHIN GROUP (ORDER BY s.ttft_ms)
      FILTER (WHERE s.ttft_ms IS NOT NULL)::integer,
    percentile_disc(0.95) WITHIN GROUP (ORDER BY s.ttft_ms)
      FILTER (WHERE s.ttft_ms IS NOT NULL)::integer
  FROM telemetry.llm_spans s
  WHERE s.started_at >= p_day_from::timestamptz
    AND s.started_at <  (p_day_to + 1)::timestamptz
  GROUP BY 1, 2, 3, 4, 5, 6;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  INSERT INTO telemetry.rollup_runs (day_from, day_to, rows_written, duration_ms)
  VALUES (
    p_day_from, p_day_to, v_rows,
    (extract(epoch FROM clock_timestamp() - v_started) * 1000)::integer
  );

  RETURN v_rows;

EXCEPTION WHEN OTHERS THEN
  INSERT INTO telemetry.rollup_runs (day_from, day_to, rows_written, duration_ms, error)
  VALUES (
    p_day_from, p_day_to, 0,
    (extract(epoch FROM clock_timestamp() - v_started) * 1000)::integer,
    SQLERRM
  );
  RAISE;
END;
$$;
