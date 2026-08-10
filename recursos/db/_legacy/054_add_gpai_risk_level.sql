-- =============================================================================
-- MIGRACIÓN 054: Añadir 'gpai' al CHECK constraint de risk_level en
--               classification_events y ampliar RLS fix de 053.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 1: Ampliar el CHECK constraint de risk_level para incluir 'gpai'
-- El constraint fue creado inline en la definición de la tabla (053), por lo
-- que el nombre es generado por PG. Usamos una búsqueda segura.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT conname INTO cname
    FROM pg_constraint
   WHERE conrelid = 'fluxion.classification_events'::regclass
     AND contype   = 'c'
     AND pg_get_constraintdef(oid) LIKE '%risk_level%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE fluxion.classification_events DROP CONSTRAINT %I', cname);
  END IF;
END$$;

ALTER TABLE fluxion.classification_events
  ADD CONSTRAINT classification_events_risk_level_check
  CHECK (risk_level IN ('prohibited', 'high', 'limited', 'minimal', 'gpai'));

-- -----------------------------------------------------------------------------
-- PASO 2: Corregir RLS de 053 — las políticas usaban profiles.id = auth.uid()
--         pero auth.uid() corresponde a profiles.user_id, no profiles.id.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "org_isolation_classification_events" ON fluxion.classification_events;
CREATE POLICY "org_isolation_classification_events"
  ON fluxion.classification_events
  FOR ALL
  USING (organization_id = (
    SELECT organization_id FROM fluxion.profiles
    WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "org_isolation_classification_diffs" ON fluxion.classification_diffs;
CREATE POLICY "org_isolation_classification_diffs"
  ON fluxion.classification_diffs
  FOR ALL
  USING (organization_id = (
    SELECT organization_id FROM fluxion.profiles
    WHERE user_id = auth.uid()
  ));
