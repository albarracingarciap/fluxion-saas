-- ============================================================================
-- FLUXION — Alertas de caducidad de evidencias
-- Tabla idempotente: el cron diario inserta una alerta por (evidence_id, alert_type)
-- y no vuelve a crearla si ya existe para ese par en los últimos 24 h.
-- ============================================================================

CREATE TABLE IF NOT EXISTS fluxion.evidence_expiry_alerts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  evidence_id     UUID        NOT NULL REFERENCES fluxion.system_evidences(id) ON DELETE CASCADE,
  alert_type      TEXT        NOT NULL CHECK (alert_type IN ('expiry_30d', 'expiry_7d', 'expired')),
  evidence_title  TEXT        NOT NULL,
  expires_at      DATE        NOT NULL,
  dismissed       BOOLEAN     NOT NULL DEFAULT false,
  dismissed_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  dismissed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Una sola alerta activa por evidencia y tipo (se deduplica por día en el cron)
  CONSTRAINT uq_evidence_expiry_alert UNIQUE (evidence_id, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_evidence_expiry_alerts_org
  ON fluxion.evidence_expiry_alerts(organization_id, dismissed, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_expiry_alerts_evidence
  ON fluxion.evidence_expiry_alerts(evidence_id);

ALTER TABLE fluxion.evidence_expiry_alerts ENABLE ROW LEVEL SECURITY;

-- SELECT: miembros de la organización
DROP POLICY IF EXISTS "evidence_expiry_alerts_select" ON fluxion.evidence_expiry_alerts;
CREATE POLICY "evidence_expiry_alerts_select"
  ON fluxion.evidence_expiry_alerts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE id = auth.uid()
    )
  );

-- INSERT: service_role only (cron)
DROP POLICY IF EXISTS "evidence_expiry_alerts_insert" ON fluxion.evidence_expiry_alerts;
CREATE POLICY "evidence_expiry_alerts_insert"
  ON fluxion.evidence_expiry_alerts FOR INSERT
  WITH CHECK (false); -- bloqueado para usuarios; el cron usa service_role (bypass RLS)

-- UPDATE: miembros pueden descartar (dismissed = true)
DROP POLICY IF EXISTS "evidence_expiry_alerts_update" ON fluxion.evidence_expiry_alerts;
CREATE POLICY "evidence_expiry_alerts_update"
  ON fluxion.evidence_expiry_alerts FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (dismissed = true); -- solo se puede marcar como dismissed

GRANT ALL ON fluxion.evidence_expiry_alerts TO service_role;
GRANT SELECT, UPDATE ON fluxion.evidence_expiry_alerts TO authenticated;

COMMENT ON TABLE fluxion.evidence_expiry_alerts IS
  'Alertas generadas por el cron diario para evidencias que caducan en 7 o 30 días.';
