-- ============================================================================
-- Corrección de RLS: profiles.id = auth.uid()  →  profiles.user_id = auth.uid()
-- ============================================================================
-- PROBLEMA
-- Tres políticas comparaban `profiles.id` (clave primaria del perfil) con
-- `auth.uid()` (id del usuario en auth.users). Son UUID distintos, así que la
-- subconsulta nunca devolvía nada y la política no dejaba ver ninguna fila.
--
-- Efectos observados:
--   · El banner de alertas de caducidad en /evidencias nunca aparecía, aunque
--     el cron escribiera las alertas correctamente. La página envuelve la
--     consulta en un try/catch, así que no había ni error: cero filas y punto.
--   · Las alertas tampoco se podían descartar (política de UPDATE).
--   · El historial de ciclo de vida del SoA era invisible para los miembros de
--     la organización. Eso es trazabilidad exigible en ISO 42001.
--
-- El resto del esquema usa el patrón correcto (`user_id = auth.uid()`, o el
-- helper fluxion.auth_user_org_id()). Estas tres eran la excepción.
--
-- Se mantiene la forma con subconsulta IN en lugar de auth_user_org_id()
-- porque profiles admite varias filas por usuario — UNIQUE (user_id,
-- organization_id) — y el helper devuelve solo una con LIMIT 1.
-- ============================================================================

-- ── fluxion.evidence_expiry_alerts ──────────────────────────────────────────

DROP POLICY IF EXISTS evidence_expiry_alerts_select ON fluxion.evidence_expiry_alerts;

CREATE POLICY evidence_expiry_alerts_select
  ON fluxion.evidence_expiry_alerts
  FOR SELECT
  USING (
    organization_id IN (
      SELECT profiles.organization_id
      FROM fluxion.profiles
      WHERE profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS evidence_expiry_alerts_update ON fluxion.evidence_expiry_alerts;

CREATE POLICY evidence_expiry_alerts_update
  ON fluxion.evidence_expiry_alerts
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT profiles.organization_id
      FROM fluxion.profiles
      WHERE profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (dismissed = true);

-- ── fluxion.soa_lifecycle_log ───────────────────────────────────────────────

DROP POLICY IF EXISTS "Members can read their org SoA lifecycle log" ON fluxion.soa_lifecycle_log;

CREATE POLICY "Members can read their org SoA lifecycle log"
  ON fluxion.soa_lifecycle_log
  FOR SELECT
  USING (
    organization_id IN (
      SELECT profiles.organization_id
      FROM fluxion.profiles
      WHERE profiles.user_id = auth.uid()
    )
  );
