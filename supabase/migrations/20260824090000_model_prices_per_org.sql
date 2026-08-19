-- ─────────────────────────────────────────────────────────────────────────────
-- B2 · Tarifas propias por organización
--
-- `model_prices` nació como catálogo global mantenido por Fluxion. En cuanto se
-- gestiona desde la interfaz, eso deja de valer: un `org_admin` de un cliente
-- estaría editando las tarifas de todos los demás.
--
-- Solución: dos niveles.
--   · organization_id NULL  → catálogo de Fluxion, lectura para todos
--   · organization_id lleno → tarifa propia del cliente, que gana sobre el
--                             catálogo (precios negociados, descuentos por
--                             volumen, otra moneda)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE telemetry.model_prices
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES fluxion.organizations(id) ON DELETE CASCADE;

COMMENT ON COLUMN telemetry.model_prices.organization_id IS
  'NULL = catálogo de Fluxion, visible para todos. Con valor = tarifa propia de esa organización, que prevalece sobre el catálogo.';

-- La unicidad pasa a incluir la organización. El centinela es necesario porque
-- en PostgreSQL varios NULL no colisionan en un índice único, y entonces el
-- catálogo admitiría duplicados de la misma tarifa.
ALTER TABLE telemetry.model_prices
  DROP CONSTRAINT IF EXISTS model_prices_provider_model_effective_from_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_model_prices_scope
  ON telemetry.model_prices (
    coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
    provider, model, effective_from
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Resolución con precedencia
-- ─────────────────────────────────────────────────────────────────────────────

/**
 * Tarifa aplicable a una organización en una fecha.
 *
 * La propia de la organización gana sobre la del catálogo. `NULLS LAST` en el
 * orden hace ese trabajo: si hay fila propia sale primero.
 */
CREATE OR REPLACE FUNCTION telemetry.price_at(
  p_provider        text,
  p_model           text,
  p_when            date,
  p_organization_id uuid DEFAULT NULL
) RETURNS telemetry.model_prices
LANGUAGE sql STABLE AS $$
  SELECT *
    FROM telemetry.model_prices
   WHERE provider = p_provider
     AND model    = p_model
     AND effective_from <= p_when
     AND (organization_id = p_organization_id OR organization_id IS NULL)
   ORDER BY organization_id NULLS LAST, effective_from DESC
   LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: se puede leer el catálogo y lo propio; solo se escribe lo propio
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS model_prices_select ON telemetry.model_prices;
CREATE POLICY model_prices_select ON telemetry.model_prices
  FOR SELECT USING (
    organization_id IS NULL
    OR organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

-- El catálogo no se toca desde la aplicación: esas filas son de Fluxion y las
-- comparten todos los clientes. Solo service_role.
DROP POLICY IF EXISTS model_prices_insert ON telemetry.model_prices;
CREATE POLICY model_prices_insert ON telemetry.model_prices
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS model_prices_update ON telemetry.model_prices;
CREATE POLICY model_prices_update ON telemetry.model_prices
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS model_prices_delete ON telemetry.model_prices;
CREATE POLICY model_prices_delete ON telemetry.model_prices
  FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON telemetry.model_prices TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Modelos vistos sin tarifa, por organización
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS telemetry.v_models_without_price;

CREATE VIEW telemetry.v_models_without_price
WITH (security_invoker = true) AS
SELECT s.organization_id,
       s.provider_name,
       s.request_model,
       count(*)                          AS llamadas,
       sum(coalesce(s.input_tokens, 0))  AS tokens_entrada,
       sum(coalesce(s.output_tokens, 0)) AS tokens_salida,
       min(s.started_at)                 AS visto_desde,
       max(s.started_at)                 AS visto_hasta
  FROM telemetry.llm_spans s
 WHERE s.cost_status = 'unknown'
 GROUP BY s.organization_id, s.provider_name, s.request_model;

GRANT SELECT ON telemetry.v_models_without_price TO authenticated;
