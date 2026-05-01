-- ============================================================================
-- FLUXION — 078: auditoría inmutable de planes de tratamiento
-- ============================================================================
-- Bloque 5 — Snapshots + auditoría de decisiones.
--
-- Crea dos tablas append-only que garantizan trazabilidad inmutable del plan
-- de tratamiento, requerida por AI Act Art. 12 (logging) y la cláusula 7.5
-- de ISO 42001 (información documentada).
--
--   1) fluxion.treatment_plan_snapshots
--      Captura el estado completo del plan + todas sus acciones en cada
--      transición formal de estado (envío a aprobación, aprobación, rechazo,
--      inicio, cierre, reemplazo).
--
--   2) fluxion.treatment_action_events
--      Registra decisiones granulares sobre acciones individuales: cambios de
--      opción, owner, due_date, S_residual_target, registro de S_residual
--      achieved, aceptación de slippage, etc.
--
-- Ambas tablas son append-only: las policies sólo permiten SELECT e INSERT.
-- La ausencia deliberada de policies de UPDATE/DELETE bloquea cualquier
-- modificación posterior, incluso desde código.
-- ============================================================================


-- ─── 1) treatment_plan_snapshots ─────────────────────────────────────────────

CREATE TABLE fluxion.treatment_plan_snapshots (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  plan_id           uuid        NOT NULL
                      REFERENCES fluxion.treatment_plans(id) ON DELETE CASCADE,
  organization_id   uuid        NOT NULL
                      REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  -- Disparador del snapshot: identifica la transición de estado capturada
  trigger           text        NOT NULL
                      CHECK (trigger IN (
                        'submitted_for_review',
                        'approved',
                        'rejected',
                        'started',
                        'closed',
                        'superseded'
                      )),

  -- Actor (denormalizado para lectura rápida sin JOIN)
  actor_user_id     uuid,
  actor_name        text,

  captured_at       timestamptz NOT NULL DEFAULT now(),

  -- Estado completo del plan en el momento de la captura
  -- (status, zone_at_creation, ai_act_floor, deadline, approval_level,
  --  approver_id, approval_minutes_ref, residual_risk_notes, etc.)
  plan_state        jsonb       NOT NULL,

  -- Array con todas las treatment_actions del plan y su estado en ese momento
  -- (option, owner_id, due_date, s_residual_target, s_residual_achieved,
  --  status, completion_notes, etc.)
  actions_state     jsonb       NOT NULL DEFAULT '[]'::jsonb,

  -- Metadatos contextuales: justificación del aprobador, comentario del rechazo,
  -- referencia al acta del comité, etc.
  metadata          jsonb       NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE fluxion.treatment_plan_snapshots IS
  'Snapshots inmutables del plan de tratamiento en cada transición de estado. '
  'Append-only: las policies sólo permiten SELECT e INSERT. '
  'Soporta auditoría AI Act Art. 12 / ISO 42001 cl. 7.5.';

COMMENT ON COLUMN fluxion.treatment_plan_snapshots.trigger IS
  'Transición que disparó la captura del snapshot.';

COMMENT ON COLUMN fluxion.treatment_plan_snapshots.plan_state IS
  'Snapshot completo de la fila treatment_plans en el momento de la captura.';

COMMENT ON COLUMN fluxion.treatment_plan_snapshots.actions_state IS
  'Snapshot de todas las treatment_actions asociadas al plan.';


-- Índices
CREATE INDEX idx_treatment_plan_snapshots_plan
  ON fluxion.treatment_plan_snapshots(plan_id, captured_at DESC);

CREATE INDEX idx_treatment_plan_snapshots_org
  ON fluxion.treatment_plan_snapshots(organization_id, captured_at DESC);

CREATE INDEX idx_treatment_plan_snapshots_trigger
  ON fluxion.treatment_plan_snapshots(plan_id, trigger);


-- RLS — append-only
ALTER TABLE fluxion.treatment_plan_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treatment_plan_snapshots_select"
  ON fluxion.treatment_plan_snapshots FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "treatment_plan_snapshots_insert"
  ON fluxion.treatment_plan_snapshots FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
    )
  );

-- (Sin policies de UPDATE/DELETE: append-only por construcción)

GRANT SELECT, INSERT ON fluxion.treatment_plan_snapshots TO authenticated;
GRANT SELECT         ON fluxion.treatment_plan_snapshots TO anon;


-- ─── 2) treatment_action_events ──────────────────────────────────────────────

CREATE TABLE fluxion.treatment_action_events (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  plan_id           uuid        NOT NULL
                      REFERENCES fluxion.treatment_plans(id) ON DELETE CASCADE,
  action_id         uuid        NOT NULL
                      REFERENCES fluxion.treatment_actions(id) ON DELETE CASCADE,
  organization_id   uuid        NOT NULL
                      REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  -- Tipo de decisión registrada
  event_type        text        NOT NULL
                      CHECK (event_type IN (
                        'option_selected',
                        'owner_changed',
                        'duedate_changed',
                        'residual_target_changed',
                        'residual_achieved_recorded',
                        'slippage_accepted',
                        'task_status_changed',
                        'closed'
                      )),

  -- Actor (denormalizado)
  actor_user_id     uuid,
  actor_name        text,

  occurred_at       timestamptz NOT NULL DEFAULT now(),

  -- Estado relevante antes y después del evento
  -- (sólo los campos afectados; null en alguno indica "sin valor previo")
  before_state      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  after_state       jsonb       NOT NULL DEFAULT '{}'::jsonb,

  justification     text
);

COMMENT ON TABLE fluxion.treatment_action_events IS
  'Registro append-only de decisiones sobre acciones de tratamiento. '
  'Captura quién cambió qué, cuándo y con qué justificación. '
  'Append-only: sin policies de UPDATE/DELETE.';

COMMENT ON COLUMN fluxion.treatment_action_events.event_type IS
  'Tipo de decisión: selección de opción, cambio de owner/due_date, '
  'registro de residual, aceptación de slippage, etc.';


-- Índices
CREATE INDEX idx_treatment_action_events_plan
  ON fluxion.treatment_action_events(plan_id, occurred_at DESC);

CREATE INDEX idx_treatment_action_events_action
  ON fluxion.treatment_action_events(action_id, occurred_at DESC);

CREATE INDEX idx_treatment_action_events_org
  ON fluxion.treatment_action_events(organization_id, occurred_at DESC);

CREATE INDEX idx_treatment_action_events_type
  ON fluxion.treatment_action_events(plan_id, event_type);


-- RLS — append-only
ALTER TABLE fluxion.treatment_action_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treatment_action_events_select"
  ON fluxion.treatment_action_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "treatment_action_events_insert"
  ON fluxion.treatment_action_events FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
    )
  );

-- (Sin policies de UPDATE/DELETE: append-only por construcción)

GRANT SELECT, INSERT ON fluxion.treatment_action_events TO authenticated;
GRANT SELECT         ON fluxion.treatment_action_events TO anon;
