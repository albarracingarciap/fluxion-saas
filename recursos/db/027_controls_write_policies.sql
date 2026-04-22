GRANT USAGE ON SCHEMA fluxion TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fluxion.controls TO authenticated;

DROP POLICY IF EXISTS "controls_select" ON fluxion.controls;
CREATE POLICY "controls_select"
  ON fluxion.controls FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "controls_insert" ON fluxion.controls;
CREATE POLICY "controls_insert"
  ON fluxion.controls FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.controls.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "controls_update" ON fluxion.controls;
CREATE POLICY "controls_update"
  ON fluxion.controls FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.controls.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "controls_delete" ON fluxion.controls;
CREATE POLICY "controls_delete"
  ON fluxion.controls FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.controls.organization_id
        AND role IN ('admin', 'editor')
    )
  );
