-- ─────────────────────────────────────────────────────────────────────────────
-- B2 · Agregados diarios
--
-- Las pantallas leen de aquí, no de los tramos crudos. Consultar millones de
-- filas para pintar un panel es lo que convierte una base de datos compartida
-- en un problema de todos.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS telemetry.rollup_daily (
  organization_id uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  day             date NOT NULL,

  -- Los NULL forman parte de la clave, así que se normalizan a valores
  -- centinela: en PostgreSQL, NULL <> NULL en una clave primaria y se
  -- duplicarían las filas de lo que no tiene sistema o entorno asignado.
  ai_system_id    uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  provider_name   text NOT NULL,
  request_model   text NOT NULL DEFAULT 'desconocido',
  environment     text NOT NULL DEFAULT 'desconocido',

  calls           bigint NOT NULL,
  errors          bigint NOT NULL,
  input_tokens    bigint NOT NULL,
  output_tokens   bigint NOT NULL,
  cost_total      numeric(14,6) NOT NULL,

  -- Cuántas de esas llamadas tienen coste fiable. Sin este dato, un total
  -- incompleto se lee como un total, que es peor que no tener el panel.
  calls_costed    bigint NOT NULL,

  duration_p50_ms integer,
  duration_p95_ms integer,

  computed_at     timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (organization_id, day, ai_system_id, provider_name, request_model, environment)
);

CREATE INDEX IF NOT EXISTS idx_rollup_daily_org_day
  ON telemetry.rollup_daily (organization_id, day DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Rastro de ejecución
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS telemetry.rollup_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at       timestamptz NOT NULL DEFAULT now(),
  day_from     date NOT NULL,
  day_to       date NOT NULL,
  rows_written integer NOT NULL DEFAULT 0,
  duration_ms  integer NOT NULL DEFAULT 0,
  error        text
);

CREATE INDEX IF NOT EXISTS idx_rollup_runs_ran_at
  ON telemetry.rollup_runs (ran_at DESC);

COMMENT ON TABLE telemetry.rollup_runs IS
  'Rastro de cada cálculo de agregados. Existe porque pg_cron ya desapareció una vez en una migración y nadie se enteró en semanas: un agregado que no se calcula produce paneles a cero, indistinguible de "no hubo tráfico".';

-- ─────────────────────────────────────────────────────────────────────────────
-- Cálculo
-- ─────────────────────────────────────────────────────────────────────────────

/**
 * Recalcula los agregados de un rango de días.
 *
 * Recalcula en vez de acumular: los tramos pueden llegar tarde —un exportador
 * que estuvo caído reintenta— y un contador incremental se quedaría corto para
 * siempre sin que nadie pudiera notarlo.
 */
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
    duration_p50_ms, duration_p95_ms
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
    percentile_disc(0.95) WITHIN GROUP (ORDER BY s.duration_ms)::integer
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
  -- El fallo se registra ANTES de propagarse. Un error de pg_cron que solo
  -- vive en los logs del contenedor es un error que nadie va a leer.
  INSERT INTO telemetry.rollup_runs (day_from, day_to, rows_written, duration_ms, error)
  VALUES (
    p_day_from, p_day_to, 0,
    (extract(epoch FROM clock_timestamp() - v_started) * 1000)::integer,
    SQLERRM
  );
  RAISE;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE telemetry.rollup_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rollup_daily_select ON telemetry.rollup_daily;
CREATE POLICY rollup_daily_select ON telemetry.rollup_daily
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

GRANT SELECT ON telemetry.rollup_daily TO authenticated;
GRANT ALL    ON telemetry.rollup_daily TO service_role;
GRANT SELECT ON telemetry.rollup_runs  TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Programación
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Cada hora, recalculando ayer y hoy: cubre los tramos que llegan tarde sin
  -- tener que reprocesar el histórico.
  PERFORM cron.unschedule('telemetry-rollup')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'telemetry-rollup');

  PERFORM cron.schedule(
    'telemetry-rollup',
    '25 * * * *',
    'SELECT telemetry.compute_rollup()'
  );

  -- Particiones con antelación. Si falta la del mes que viene, las escrituras
  -- fallan el día 1 a las 00:00, que es cuando peor se diagnostica.
  PERFORM cron.unschedule('telemetry-partitions')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'telemetry-partitions');

  PERFORM cron.schedule(
    'telemetry-partitions',
    '0 3 1 * *',
    'SELECT telemetry.ensure_partitions(6)'
  );
END;
$$;

-- Primer cálculo, para no esperar a la hora en punto.
SELECT telemetry.compute_rollup((now() - interval '30 days')::date, now()::date);
