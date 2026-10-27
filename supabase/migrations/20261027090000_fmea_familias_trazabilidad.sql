-- ============================================================================
-- FMEA por familias: trazabilidad por modo (B14, F-05)
-- ============================================================================
--   La estimación por familia rellena O, D y S de todos los modos de la familia
--   sin dejar rastro en el historial del modo: en el expediente no se sabía de
--   dónde salía cada valor. Se añaden tres tipos de evento al historial:
--
--     family_estimated   el modo hereda la estimación de una o varias familias
--                        (al aplicarla, cambiarla o volver a ella);
--     family_withdrawn   se retiró la estimación que lo cubría y vuelve a pendiente;
--     family_exception   se retocó a mano un modo que heredaba de una familia:
--                        pasa a ajuste manual y la familia ya no lo modifica.
--
-- Idempotente.
-- ============================================================================

ALTER TABLE fluxion.fmea_item_history
  DROP CONSTRAINT IF EXISTS fmea_item_history_event_type_check;

ALTER TABLE fluxion.fmea_item_history
  ADD CONSTRAINT fmea_item_history_event_type_check CHECK (event_type = ANY (ARRAY[
    'evaluated', 'skipped', 'second_review_approved', 'second_review_rejected',
    'family_estimated', 'family_withdrawn', 'family_exception'
  ]::text[]));

COMMENT ON COLUMN fluxion.fmea_item_history.event_type IS
  'evaluated, skipped, second_review_approved, second_review_rejected; y por la estimación por familia: family_estimated, family_withdrawn, family_exception (B14).';
