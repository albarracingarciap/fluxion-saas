-- ─────────────────────────────────────────────────────────────────────────────
-- B2 · Presupuestos de gasto en IA
--
-- Un presupuesto sin aviso es un número en una pantalla que nadie mira. Lo que
-- se construye aquí es el aviso; el número es la excusa.
--
-- Los umbrales superados emiten una SEÑAL en fluxion.signals, y de ahí salen
-- por los canales que ya existen. No se construye una segunda vía de avisos:
-- Slack y Teams ya funcionan, con reintentos y registro de entregas.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS telemetry.cost_budgets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  scope           text NOT NULL CHECK (scope IN ('organization', 'system')),
  ai_system_id    uuid REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,

  period          text NOT NULL DEFAULT 'month' CHECK (period IN ('month')),
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  currency        text NOT NULL DEFAULT 'USD',

  -- Porcentajes a los que avisar. 100 no es el final: superarlo también avisa,
  -- porque el gasto no se detiene solo al llegar al presupuesto.
  alert_at_pct    integer[] NOT NULL DEFAULT '{50,80,100}',

  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid REFERENCES fluxion.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_budget_scope
    CHECK ((scope = 'system') = (ai_system_id IS NOT NULL))
);

-- Un presupuesto vivo por ámbito. Dos presupuestos para el mismo sistema es la
-- forma más rápida de que uno avise y el otro no, sin que nadie sepa cuál rige.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cost_budgets_scope
  ON telemetry.cost_budgets (
    organization_id,
    coalesce(ai_system_id, '00000000-0000-0000-0000-000000000000'::uuid),
    period
  )
  WHERE is_active;

CREATE TABLE IF NOT EXISTS telemetry.cost_budget_alerts (
  budget_id  uuid NOT NULL REFERENCES telemetry.cost_budgets(id) ON DELETE CASCADE,
  period_key text NOT NULL,               -- '2026-08'
  threshold  integer NOT NULL,
  spent      numeric(14,6) NOT NULL,
  sent_at    timestamptz NOT NULL DEFAULT now(),

  -- La clave primaria ES la idempotencia, calcada de incident_deadline_alerts:
  -- el vigilante corre cada hora y no repite avisos.
  PRIMARY KEY (budget_id, period_key, threshold)
);

COMMENT ON TABLE telemetry.cost_budget_alerts IS
  'Umbrales ya avisados por presupuesto y periodo. Permite ejecutar el vigilante cada hora sin repetir.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Gasto del periodo en curso
-- ─────────────────────────────────────────────────────────────────────────────

/**
 * Consumo del mes en curso por presupuesto.
 *
 * Devuelve además la cobertura de tarifas: si solo el 40 % de las llamadas
 * tiene precio, el gasto real es mayor y el aviso llegará tarde. Es un dato que
 * el mensaje debe llevar, no una nota al pie.
 */
CREATE OR REPLACE VIEW telemetry.v_budget_status
WITH (security_invoker = true) AS
SELECT
  b.id                AS budget_id,
  b.organization_id,
  b.scope,
  b.ai_system_id,
  b.amount,
  b.currency,
  b.alert_at_pct,
  to_char(now(), 'YYYY-MM')          AS period_key,
  coalesce(sum(r.cost_total), 0)     AS spent,
  coalesce(sum(r.calls), 0)          AS calls,
  coalesce(sum(r.calls_costed), 0)   AS calls_costed,
  CASE WHEN b.amount > 0
       THEN round(coalesce(sum(r.cost_total), 0) / b.amount * 100, 1)
       ELSE 0 END                    AS pct
FROM telemetry.cost_budgets b
LEFT JOIN telemetry.rollup_daily r
       ON r.organization_id = b.organization_id
      AND r.day >= date_trunc('month', now())::date
      AND (b.scope = 'organization' OR r.ai_system_id = b.ai_system_id)
WHERE b.is_active
GROUP BY b.id, b.organization_id, b.scope, b.ai_system_id, b.amount, b.currency, b.alert_at_pct;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE telemetry.cost_budgets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry.cost_budget_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cost_budgets_select ON telemetry.cost_budgets;
CREATE POLICY cost_budgets_select ON telemetry.cost_budgets
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS cost_budgets_insert ON telemetry.cost_budgets;
CREATE POLICY cost_budgets_insert ON telemetry.cost_budgets
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS cost_budgets_update ON telemetry.cost_budgets;
CREATE POLICY cost_budgets_update ON telemetry.cost_budgets
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS cost_budgets_delete ON telemetry.cost_budgets;
CREATE POLICY cost_budgets_delete ON telemetry.cost_budgets
  FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS cost_budget_alerts_select ON telemetry.cost_budget_alerts;
CREATE POLICY cost_budget_alerts_select ON telemetry.cost_budget_alerts
  FOR SELECT USING (
    budget_id IN (
      SELECT id FROM telemetry.cost_budgets
       WHERE organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON telemetry.cost_budgets       TO authenticated;
GRANT SELECT                         ON telemetry.cost_budget_alerts TO authenticated;
GRANT SELECT                         ON telemetry.v_budget_status    TO authenticated;
GRANT ALL ON telemetry.cost_budgets       TO service_role;
GRANT ALL ON telemetry.cost_budget_alerts TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Nota sobre las señales
--
-- No hace falta migración en fluxion.signals: `signal_type` es texto libre
-- justamente para que un módulo nuevo no exija tocar el esquema.
--
-- El vigilante emitirá `source_module = 'telemetry'`,
-- `signal_type = 'cost.budget_threshold'` y un `dedupe_key` con la forma
-- `budget:<id>:<periodo>:<umbral>`, de modo que la señal es idempotente por sí
-- misma aunque cost_budget_alerts fallara.
-- ─────────────────────────────────────────────────────────────────────────────
