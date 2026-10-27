-- ============================================================================
-- Avisos de plazo de los requerimientos de la autoridad (B25e)
-- ============================================================================
--   Decisión del responsable (2026-10-28, TODO 295): los requerimientos
--   necesitan avisos de plazo propios, como el reloj del Art. 73 de los
--   incidentes, además de la tarea «Responder…».
--
--   El cron /api/cron/authority-request-deadlines avisa una vez por umbral:
--     soon    · quedan 5 días o menos para el plazo
--     overdue · plazo vencido sin responder
--   Esta tabla guarda qué umbral se avisó, para no repetir (mismo principio
--   que incident_deadline_alerts). Solo la usa el cron, con service role.
--
-- Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS fluxion.authority_request_deadline_alerts (
  request_id uuid        NOT NULL REFERENCES fluxion.authority_requests(id) ON DELETE CASCADE,
  threshold  text        NOT NULL CHECK (threshold IN ('soon', 'overdue')),
  -- Plazo avisado: si cambia el plazo, el umbral se puede volver a avisar.
  due_at     date        NOT NULL,
  sent_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, threshold, due_at)
);

COMMENT ON TABLE fluxion.authority_request_deadline_alerts IS
  'Idempotencia de los avisos de plazo de los requerimientos de la autoridad: un umbral se avisa una vez por plazo (B25e).';

ALTER TABLE fluxion.authority_request_deadline_alerts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON fluxion.authority_request_deadline_alerts TO service_role;
