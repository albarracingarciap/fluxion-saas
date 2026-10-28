-- ============================================================================
-- Revisión por la dirección: recordatorio anual (B20c)
-- ============================================================================
--   DP-09 (detalle del 2026-10-28): la revisión por la dirección (ISO/IEC
--   42001, §9.3) es una sesión del comité Revisión por la Dirección con el
--   orden del día de §9.3.2 y se celebra al menos una vez al año. Si pasan 12
--   meses sin celebrarla (o no se ha celebrado nunca), el cron diario crea la
--   tarea «Celebrar la revisión por la dirección», de origen
--   `management_review`, en las organizaciones con ISO 42001 entre sus marcos
--   aplicables o con el comité constituido. Se completa al cerrar la sesión.
--
-- Idempotente.
-- ============================================================================

ALTER TABLE fluxion.tasks DROP CONSTRAINT IF EXISTS tasks_source_type_check;
ALTER TABLE fluxion.tasks ADD CONSTRAINT tasks_source_type_check CHECK (source_type IN (
  'manual', 'treatment_action', 'gap', 'evaluation', 'fmea_item', 'gap_group', 'signal', 'incident',
  'authority_request', 'reevaluation', 'annual_report', 'cease_use', 'committee_session', 'management_review'
));
