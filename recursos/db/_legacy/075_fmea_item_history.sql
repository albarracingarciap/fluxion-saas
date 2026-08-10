-- ============================================================================
-- FLUXION — 075: trazabilidad por modo FMEA
-- ============================================================================
-- Registra cada cambio explícito sobre un fmea_item (confirmación, posposición,
-- segunda revisión). Permite auditar quién cambió qué, cuándo y con qué delta
-- de valores O, D y S_actual.
-- ============================================================================

CREATE TABLE fluxion.fmea_item_history (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  item_id                   uuid        NOT NULL
                              REFERENCES fluxion.fmea_items(id) ON DELETE CASCADE,
  evaluation_id             uuid        NOT NULL
                              REFERENCES fluxion.fmea_evaluations(id) ON DELETE CASCADE,
  organization_id           uuid        NOT NULL
                              REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  -- Actor (denormalizado para lectura rápida sin JOIN)
  actor_user_id             uuid,
  actor_name                text,

  -- Tipo de evento
  event_type                text        NOT NULL
                              CHECK (event_type IN (
                                'evaluated',
                                'skipped',
                                'second_review_approved',
                                'second_review_rejected'
                              )),

  -- Deltas de valores (null = sin cambio o no aplica)
  prev_o                    smallint,
  new_o                     smallint,
  prev_d                    smallint,
  new_d                     smallint,
  prev_s_actual             smallint,
  new_s_actual              smallint,

  -- Deltas de estado
  prev_status               text,
  new_status                text,
  prev_second_review_status text,
  new_second_review_status  text,

  -- Justificación o nota de revisión snapshot
  notes                     text,

  changed_at                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE fluxion.fmea_item_history IS
  'Registro de trazabilidad por modo de fallo FMEA. Cada fila representa un '
  'cambio explícito de estado o valores realizado por un usuario.';

-- ─── ÍNDICES ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_fmea_item_history_item
  ON fluxion.fmea_item_history(item_id);

CREATE INDEX idx_fmea_item_history_eval
  ON fluxion.fmea_item_history(evaluation_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.fmea_item_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fmea_item_history_select"
  ON fluxion.fmea_item_history FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "fmea_item_history_insert"
  ON fluxion.fmea_item_history FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON fluxion.fmea_item_history TO authenticated;
GRANT SELECT         ON fluxion.fmea_item_history TO anon;
