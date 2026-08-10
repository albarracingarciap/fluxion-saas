-- ============================================================================
-- FLUXION — FMEA manual phase 1
-- ============================================================================

ALTER TABLE fluxion.fmea_evaluations
  ADD COLUMN IF NOT EXISTS cached_zone TEXT;

ALTER TABLE fluxion.fmea_evaluations
  DROP CONSTRAINT IF EXISTS chk_fmea_evaluations_cached_zone;

ALTER TABLE fluxion.fmea_evaluations
  ADD CONSTRAINT chk_fmea_evaluations_cached_zone
  CHECK (
    cached_zone IS NULL
    OR cached_zone IN ('zona_i', 'zona_ii', 'zona_iii', 'zona_iv')
  );

ALTER TABLE fluxion.fmea_items
  ALTER COLUMN o_value DROP NOT NULL,
  ALTER COLUMN o_value DROP DEFAULT,
  ALTER COLUMN d_real_value DROP NOT NULL,
  ALTER COLUMN d_real_value DROP DEFAULT,
  ALTER COLUMN s_actual DROP NOT NULL;

ALTER TABLE fluxion.fmea_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS requires_second_review BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS skipped_at TIMESTAMPTZ;

ALTER TABLE fluxion.fmea_items
  DROP CONSTRAINT IF EXISTS chk_fmea_items_status;

ALTER TABLE fluxion.fmea_items
  ADD CONSTRAINT chk_fmea_items_status
  CHECK (status IN ('pending', 'evaluated', 'skipped'));

UPDATE fluxion.fmea_items
SET
  status = CASE
    WHEN s_actual IS NULL THEN 'pending'
    ELSE 'evaluated'
  END,
  requires_second_review = CASE
    WHEN s_actual IS NOT NULL AND (s_default_frozen - s_actual) >= 3 THEN true
    ELSE false
  END
WHERE status IS DISTINCT FROM CASE
  WHEN s_actual IS NULL THEN 'pending'
  ELSE 'evaluated'
END
OR requires_second_review IS DISTINCT FROM CASE
  WHEN s_actual IS NOT NULL AND (s_default_frozen - s_actual) >= 3 THEN true
  ELSE false
END;

CREATE INDEX IF NOT EXISTS idx_fmea_evaluations_system_state
  ON fluxion.fmea_evaluations(system_id, state, version DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fmea_items_unique_mode
  ON fluxion.fmea_items(evaluation_id, failure_mode_id);

DROP TRIGGER IF EXISTS trg_fmea_evaluations_updated_at ON fluxion.fmea_evaluations;
CREATE TRIGGER trg_fmea_evaluations_updated_at
  BEFORE UPDATE ON fluxion.fmea_evaluations
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();

DROP TRIGGER IF EXISTS trg_fmea_items_updated_at ON fluxion.fmea_items;
CREATE TRIGGER trg_fmea_items_updated_at
  BEFORE UPDATE ON fluxion.fmea_items
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();

GRANT USAGE ON SCHEMA fluxion TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fluxion.fmea_evaluations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fluxion.fmea_items TO authenticated;

DROP POLICY IF EXISTS "fmea_evaluations_insert" ON fluxion.fmea_evaluations;
CREATE POLICY "fmea_evaluations_insert"
  ON fluxion.fmea_evaluations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.fmea_evaluations.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "fmea_evaluations_update" ON fluxion.fmea_evaluations;
CREATE POLICY "fmea_evaluations_update"
  ON fluxion.fmea_evaluations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.fmea_evaluations.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "fmea_evaluations_delete" ON fluxion.fmea_evaluations;
CREATE POLICY "fmea_evaluations_delete"
  ON fluxion.fmea_evaluations FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.fmea_evaluations.organization_id
        AND role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "fmea_items_select" ON fluxion.fmea_items;
CREATE POLICY "fmea_items_select"
  ON fluxion.fmea_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.fmea_evaluations
      WHERE id = fluxion.fmea_items.evaluation_id
        AND organization_id IN (
          SELECT organization_id
          FROM fluxion.organization_members
          WHERE user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "fmea_items_insert" ON fluxion.fmea_items;
CREATE POLICY "fmea_items_insert"
  ON fluxion.fmea_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM fluxion.fmea_evaluations
      WHERE id = fluxion.fmea_items.evaluation_id
        AND organization_id IN (
          SELECT organization_id
          FROM fluxion.organization_members
          WHERE user_id = auth.uid()
            AND role IN ('admin', 'editor', 'dpo', 'technical')
        )
    )
  );

DROP POLICY IF EXISTS "fmea_items_update" ON fluxion.fmea_items;
CREATE POLICY "fmea_items_update"
  ON fluxion.fmea_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.fmea_evaluations
      WHERE id = fluxion.fmea_items.evaluation_id
        AND organization_id IN (
          SELECT organization_id
          FROM fluxion.organization_members
          WHERE user_id = auth.uid()
            AND role IN ('admin', 'editor', 'dpo', 'technical')
        )
    )
  );

DROP POLICY IF EXISTS "fmea_items_delete" ON fluxion.fmea_items;
CREATE POLICY "fmea_items_delete"
  ON fluxion.fmea_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.fmea_evaluations
      WHERE id = fluxion.fmea_items.evaluation_id
        AND organization_id IN (
          SELECT organization_id
          FROM fluxion.organization_members
          WHERE user_id = auth.uid()
            AND role IN ('admin', 'editor')
        )
    )
  );

COMMENT ON COLUMN fluxion.fmea_evaluations.cached_zone IS 'Zona FMEA cacheada solo al guardar borrador o enviar a revisión. La fuente de verdad siguen siendo los S_actual.';
COMMENT ON COLUMN fluxion.fmea_items.status IS 'Estado operativo del item durante la evaluación manual: pending, evaluated o skipped.';
COMMENT ON COLUMN fluxion.fmea_items.requires_second_review IS 'Se activa cuando el evaluador reduce el prior en 3 o más puntos y exige segunda revisión antes de aprobar.';
