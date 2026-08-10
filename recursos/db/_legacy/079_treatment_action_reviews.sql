-- ============================================================================
-- FLUXION — 079: revisiones periódicas de aceptaciones y diferimientos
-- ============================================================================
-- Bloque 7 — cierre del ciclo de revisión de acciones con opción 'aceptar'
-- o 'diferir'. Al llegar review_due_date, la acción queda visible para
-- re-evaluación obligatoria exigida por AI Act Art. 9 (gestión de riesgos
-- continua) e ISO 42001 cláusula 6.1.2 (tratamiento de riesgos recurrente).
--
--  1) Columnas nuevas en treatment_actions:
--       last_reviewed_at  — cuándo se realizó la última revisión
--       review_count      — número de revisiones realizadas hasta la fecha
--
--  2) Tabla treatment_action_reviews:
--       Registro append-only de cada revisión: quién, cuándo, qué decisión,
--       nueva fecha de revisión y justificación.
--
--  3) Vista treatment_actions_pending_review:
--       Acciones con review_due_date vencida o próxima (≤ 30 días) que
--       siguen activas. Usada por el dashboard y el módulo de revisiones.
-- ============================================================================


-- ─── 1) Extender treatment_actions ───────────────────────────────────────────

ALTER TABLE fluxion.treatment_actions
  ADD COLUMN IF NOT EXISTS last_reviewed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS review_count      int NOT NULL DEFAULT 0;

COMMENT ON COLUMN fluxion.treatment_actions.last_reviewed_at IS
  'Timestamp de la última revisión periódica. NULL si nunca se ha revisado.';

COMMENT ON COLUMN fluxion.treatment_actions.review_count IS
  'Número de revisiones periódicas realizadas sobre esta acción.';

-- Índice para consultas de revisiones pendientes por organización y fecha
CREATE INDEX IF NOT EXISTS idx_treatment_actions_review_due
  ON fluxion.treatment_actions(organization_id, review_due_date)
  WHERE review_due_date IS NOT NULL
    AND status NOT IN ('cancelled', 'completed');


-- ─── 2) treatment_action_reviews ─────────────────────────────────────────────

CREATE TABLE fluxion.treatment_action_reviews (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  action_id           uuid        NOT NULL
                        REFERENCES fluxion.treatment_actions(id) ON DELETE CASCADE,
  plan_id             uuid        NOT NULL
                        REFERENCES fluxion.treatment_plans(id) ON DELETE CASCADE,
  organization_id     uuid        NOT NULL
                        REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  reviewed_at         timestamptz NOT NULL DEFAULT now(),
  reviewed_by         uuid        REFERENCES fluxion.profiles(id),

  -- Decisión tomada en la revisión
  decision            text        NOT NULL
                        CHECK (decision IN (
                          'reaffirmed',
                          'changed_to_mitigate',
                          'changed_to_transfer',
                          'changed_to_avoid',
                          'escalated'
                        )),

  -- Nueva fecha de revisión (null si se cierra el ciclo o se cambia opción)
  new_review_due_date date,

  -- Justificación obligatoria (>= 80 caracteres, validada en app layer)
  justification       text        NOT NULL
);

COMMENT ON TABLE fluxion.treatment_action_reviews IS
  'Registro de revisiones periódicas de acciones aceptadas o diferidas. '
  'Cada fila documenta la decisión tomada al vencer review_due_date.';

COMMENT ON COLUMN fluxion.treatment_action_reviews.decision IS
  'reaffirmed: se mantiene la aceptación/diferimiento con nueva fecha. '
  'changed_to_*: se cambia la opción de tratamiento. '
  'escalated: se eleva al comité de alta dirección.';


-- Índices
CREATE INDEX idx_treatment_action_reviews_action
  ON fluxion.treatment_action_reviews(action_id, reviewed_at DESC);

CREATE INDEX idx_treatment_action_reviews_plan
  ON fluxion.treatment_action_reviews(plan_id, reviewed_at DESC);

CREATE INDEX idx_treatment_action_reviews_org
  ON fluxion.treatment_action_reviews(organization_id, reviewed_at DESC);


-- RLS
ALTER TABLE fluxion.treatment_action_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treatment_action_reviews_select"
  ON fluxion.treatment_action_reviews FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "treatment_action_reviews_insert"
  ON fluxion.treatment_action_reviews FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON fluxion.treatment_action_reviews TO authenticated;
GRANT SELECT         ON fluxion.treatment_action_reviews TO anon;


-- ─── 3) Vista treatment_actions_pending_review ───────────────────────────────
-- Acciones con review_due_date vencida o próxima (≤ 30 días) y estado activo.
-- "upcoming" window de 30 días para que el owner pueda preparar la revisión.

CREATE OR REPLACE VIEW fluxion.treatment_actions_pending_review AS
  SELECT
    ta.*,
    (current_date - ta.review_due_date)                       AS days_overdue,
    CASE
      WHEN ta.review_due_date < current_date  THEN 'overdue'
      WHEN ta.review_due_date = current_date  THEN 'due_today'
      ELSE                                         'upcoming'
    END                                                       AS review_urgency
  FROM fluxion.treatment_actions ta
  WHERE ta.option IN ('aceptar', 'diferir')
    AND ta.review_due_date IS NOT NULL
    AND ta.review_due_date <= (current_date + interval '30 days')
    AND ta.status NOT IN ('cancelled', 'completed');

COMMENT ON VIEW fluxion.treatment_actions_pending_review IS
  'Acciones aceptadas o diferidas cuya review_due_date vence en los próximos '
  '30 días o ya ha vencido, con estado activo.';

GRANT SELECT ON fluxion.treatment_actions_pending_review TO authenticated;
GRANT SELECT ON fluxion.treatment_actions_pending_review TO anon;
