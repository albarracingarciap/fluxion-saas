-- ─────────────────────────────────────────────────────────────────────────────
-- B2 · Telemetría y FinOps de IA · almacén
--
-- Esquema propio, y no una tabla más en `fluxion`, a propósito: este es el
-- volumen que no debe compartir destino con los datos de cumplimiento. Una
-- restauración del expediente regulatorio no tiene por qué arrastrar millones
-- de tramos, y mudar esto a otra instancia debe ser un `pg_dump -n telemetry`,
-- no un proyecto.
--
-- Es también la primera pieza real de la separación Control/Data que quedó
-- pendiente de la Ola 0.
--
-- ⚠️ Requiere añadir `telemetry` a PGRST_DB_SCHEMAS en el servicio supabase-rest
--    y ejecutar NOTIFY pgrst, 'reload schema'. Sin eso, PostgREST devuelve 404
--    a todo lo de aquí con toda la naturalidad del mundo.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS telemetry;

GRANT USAGE ON SCHEMA telemetry TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tarifas
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS telemetry.model_prices (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  provider                  text NOT NULL,
  model                     text NOT NULL,
  effective_from            date NOT NULL,

  input_per_million         numeric(12,4) NOT NULL,
  output_per_million        numeric(12,4) NOT NULL,

  -- No son adorno: con caché de contexto y con modelos de razonamiento,
  -- calcular el coste solo con entrada y salida da cifras falsas, a veces por
  -- un factor de tres.
  cached_input_per_million  numeric(12,4),
  reasoning_per_million     numeric(12,4),

  currency                  text NOT NULL DEFAULT 'USD',

  -- De dónde salió la cifra. Un precio sin procedencia no se puede auditar ni
  -- defender ante el cliente al que se lo estás facturando.
  source                    text,
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),

  UNIQUE (provider, model, effective_from)
);

COMMENT ON TABLE telemetry.model_prices IS
  'Tarifas por modelo con vigencia. Se deja VACÍA a propósito: sembrar precios de memoria produce un panel de costes en el que no se puede confiar, y un panel de costes poco fiable es peor que no tenerlo porque se usa para decidir.';

/**
 * Tarifa vigente para un modelo en una fecha.
 * Devuelve NULL si no hay ninguna, que es lo que marca el coste como desconocido.
 */
CREATE OR REPLACE FUNCTION telemetry.price_at(
  p_provider text,
  p_model    text,
  p_when     date
) RETURNS telemetry.model_prices
LANGUAGE sql STABLE AS $$
  SELECT *
    FROM telemetry.model_prices
   WHERE provider = p_provider
     AND model    = p_model
     AND effective_from <= p_when
   ORDER BY effective_from DESC
   LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tramos
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS telemetry.llm_spans (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  -- Identidad OTel
  trace_id         text        NOT NULL,
  span_id          text        NOT NULL,
  parent_span_id   text,

  started_at       timestamptz NOT NULL,
  ended_at         timestamptz NOT NULL,
  duration_ms      integer     NOT NULL,

  -- Obligatorios del semconv de GenAI
  operation_name   text        NOT NULL,   -- gen_ai.operation.name
  provider_name    text        NOT NULL,   -- gen_ai.provider.name

  -- Condicionales y recomendados
  request_model    text,                   -- gen_ai.request.model
  response_model   text,                   -- gen_ai.response.model
  input_tokens     integer,                -- gen_ai.usage.input_tokens
  output_tokens    integer,                -- gen_ai.usage.output_tokens
  cached_tokens    integer,
  reasoning_tokens integer,
  conversation_id  text,                   -- gen_ai.conversation.id
  response_id      text,                   -- gen_ai.response.id
  finish_reasons   text[],                 -- gen_ai.response.finish_reasons
  error_type       text,                   -- error.type
  is_stream        boolean,                -- gen_ai.request.stream

  -- Coste congelado al ingerir. Si se calculase al consultar, el informe de
  -- marzo cambiaría en junio al tocar el proveedor sus tarifas, y un informe
  -- que cambia solo no sirve para justificar un presupuesto.
  cost_input       numeric(14,6),
  cost_output      numeric(14,6),
  cost_total       numeric(14,6),
  currency         text        NOT NULL DEFAULT 'USD',
  price_id         uuid        REFERENCES telemetry.model_prices(id) ON DELETE SET NULL,

  -- exact     · había tarifa y el tramo traía el desglose completo
  -- estimated · había tarifa pero faltaba desglose (caché, razonamiento)
  -- unknown   · no hay tarifa para ese modelo
  cost_status      text        NOT NULL DEFAULT 'unknown'
                     CHECK (cost_status IN ('exact', 'estimated', 'unknown')),

  -- Contexto propio
  ai_system_id     uuid        REFERENCES fluxion.ai_systems(id) ON DELETE SET NULL,
  service_name     text,
  environment      text,

  -- Lo que no tiene columna propia.
  -- NUNCA contenido de prompts ni de respuestas: ver docs/modulos/b2.
  attributes       jsonb       NOT NULL DEFAULT '{}'::jsonb,

  ingested_at      timestamptz NOT NULL DEFAULT now(),

  -- La clave primaria ES la deduplicación. Los exportadores de OTel reintentan
  -- ante un 5xx; sin esto, un corte de red duplica el coste del día. Mismo
  -- principio que dedupe_key en fluxion.signals.
  PRIMARY KEY (organization_id, started_at, trace_id, span_id)
) PARTITION BY RANGE (started_at);

COMMENT ON COLUMN telemetry.llm_spans.attributes IS
  'Atributos sin columna propia. El ingestor descarta el contenido de prompts y respuestas aunque llegue: no basta con no pedirlo.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Particiones mensuales
-- ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea las particiones que falten desde el mes anterior hasta N meses por
 * delante. Idempotente.
 *
 * Sin partición, el INSERT falla. Es deliberado que falle en voz alta en vez de
 * caer en una partición por defecto donde los datos se acumularían fuera de la
 * rotación de retención y nadie los volvería a mirar.
 */
CREATE OR REPLACE FUNCTION telemetry.ensure_partitions(p_months_ahead integer DEFAULT 6)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  -- Los límites de partición se interpretan en la zona horaria del servidor.
  -- El VPS va en UTC; si algún día no lo fuera, hay que fijarla aquí.
  v_month date := (date_trunc('month', now()) - interval '1 month')::date;
  v_end   date := (date_trunc('month', now()) + (p_months_ahead || ' months')::interval)::date;
  v_name  text;
  v_count integer := 0;
BEGIN
  WHILE v_month < v_end LOOP
    v_name := format('llm_spans_y%sm%s', to_char(v_month, 'YYYY'), to_char(v_month, 'MM'));

    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'telemetry' AND c.relname = v_name
    ) THEN
      EXECUTE format(
        'CREATE TABLE telemetry.%I PARTITION OF telemetry.llm_spans FOR VALUES FROM (%L) TO (%L)',
        v_name, v_month, (v_month + interval '1 month')::date
      );
      v_count := v_count + 1;
    END IF;

    v_month := (v_month + interval '1 month')::date;
  END LOOP;

  RETURN v_count;
END;
$$;

/**
 * Retención: suelta las particiones anteriores a una fecha.
 *
 * DROP de la partición entera y no DELETE de filas: el DELETE deja la tabla
 * igual de grande y además genera trabajo de vacuum.
 */
CREATE OR REPLACE FUNCTION telemetry.drop_partitions_before(p_before date)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  r       record;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_inherits i  ON i.inhrelid = c.oid
      JOIN pg_class p     ON p.oid = i.inhparent
     WHERE n.nspname = 'telemetry'
       AND p.relname = 'llm_spans'
       AND c.relname ~ '^llm_spans_y[0-9]{4}m[0-9]{2}$'
       -- llm_spans_y2026m08 -> 202608
       AND to_date(replace(replace(c.relname, 'llm_spans_y', ''), 'm', ''), 'YYYYMM')
           < date_trunc('month', p_before)::date
  LOOP
    EXECUTE format('DROP TABLE telemetry.%I', r.relname);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

SELECT telemetry.ensure_partitions(6);

-- ─────────────────────────────────────────────────────────────────────────────
-- Índices
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_llm_spans_org_system
  ON telemetry.llm_spans (organization_id, ai_system_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_spans_org_model
  ON telemetry.llm_spans (organization_id, request_model, started_at DESC);

-- Para la bandeja de telemetría sin adscribir
CREATE INDEX IF NOT EXISTS idx_llm_spans_unassigned
  ON telemetry.llm_spans (organization_id, service_name, started_at DESC)
  WHERE ai_system_id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Huecos visibles
-- ─────────────────────────────────────────────────────────────────────────────

/**
 * Modelos vistos en la telemetría para los que no hay tarifa.
 *
 * Esta vista es el sustituto de sembrar precios inventados: en vez de un panel
 * que miente con confianza, una lista de lo que hay que rellenar.
 */
-- security_invoker = true NO es opcional: una vista sobre una tabla con RLS se
-- ejecuta por omisión con los permisos de su propietario, que aquí es
-- supabase_admin. Sin esta cláusula, cualquier usuario autenticado vería los
-- modelos y el tráfico de TODAS las organizaciones a través de la vista, con la
-- RLS de la tabla intacta y perfectamente inútil.
CREATE OR REPLACE VIEW telemetry.v_models_without_price
WITH (security_invoker = true) AS
SELECT s.organization_id,
       s.provider_name,
       s.request_model,
       count(*)                     AS llamadas,
       sum(coalesce(s.input_tokens, 0))  AS tokens_entrada,
       sum(coalesce(s.output_tokens, 0)) AS tokens_salida,
       min(s.started_at)            AS visto_desde,
       max(s.started_at)            AS visto_hasta
  FROM telemetry.llm_spans s
 WHERE s.cost_status = 'unknown'
 GROUP BY s.organization_id, s.provider_name, s.request_model;

COMMENT ON VIEW telemetry.v_models_without_price IS
  'Modelos con tráfico y sin tarifa. Mientras tengan filas, el coste total de la organización está incompleto y la pantalla debe decirlo.';

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE telemetry.llm_spans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry.model_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS llm_spans_select ON telemetry.llm_spans;
CREATE POLICY llm_spans_select ON telemetry.llm_spans
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

-- La escritura llega por el servicio de ingesta con service_role, autenticado
-- por clave de API. Ningún navegador escribe telemetría.

DROP POLICY IF EXISTS model_prices_select ON telemetry.model_prices;
CREATE POLICY model_prices_select ON telemetry.model_prices
  FOR SELECT USING (true);

GRANT SELECT ON telemetry.llm_spans    TO authenticated;
GRANT SELECT ON telemetry.model_prices TO authenticated;
GRANT SELECT ON telemetry.v_models_without_price TO authenticated;
GRANT ALL    ON telemetry.llm_spans    TO service_role;
GRANT ALL    ON telemetry.model_prices TO service_role;
