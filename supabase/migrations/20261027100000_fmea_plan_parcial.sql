-- ============================================================================
-- FMEA: plan parcial sobre los modos críticos (B14b, DP-08)
-- ============================================================================
--   Una evaluación se puede enviar a aprobación cuando están evaluados los modos
--   de severidad 8 o más y todos los de sus familias causales. El resto queda
--   pendiente para una segunda ronda, que se hace en la versión siguiente.
--
--   `deferred_items_count` guarda cuántos modos quedaron para la segunda ronda
--   al enviar: 0 en un envío completo. Lo ven el aprobador y la barra de
--   versiones.
--
-- Idempotente.
-- ============================================================================

ALTER TABLE fluxion.fmea_evaluations
  ADD COLUMN IF NOT EXISTS deferred_items_count integer NOT NULL DEFAULT 0;

ALTER TABLE fluxion.fmea_evaluations
  DROP CONSTRAINT IF EXISTS chk_fmea_evaluations_deferred_items_count;
ALTER TABLE fluxion.fmea_evaluations
  ADD CONSTRAINT chk_fmea_evaluations_deferred_items_count CHECK (deferred_items_count >= 0);

COMMENT ON COLUMN fluxion.fmea_evaluations.deferred_items_count IS
  'Modos sin evaluar que quedaron para la segunda ronda al enviar un plan parcial (DP-08, B14b). 0 = envío completo.';
