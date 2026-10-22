-- ============================================================================
-- Cuestionario preliminar: clasificación preliminar guardada (B13b)
-- ============================================================================
-- RN-V12: al completar el cuestionario se guarda una copia del resultado del
-- motor único (lib/ai-act) con la versión de las reglas y las obligaciones
-- sugeridas. Durante la edición, el panel «Clasificación preliminar» la
-- recalcula en cada cambio sin guardarla.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS.
-- ============================================================================

ALTER TABLE fluxion.preliminary_questionnaires
  ADD COLUMN IF NOT EXISTS classification jsonb;

COMMENT ON COLUMN fluxion.preliminary_questionnaires.classification IS
  'Clasificación preliminar al completar (B13b, RN-V12): {result: AiActResult con fundamento, avisos y rulesVersion, obligations: [{code, label}], computed_at}.';
