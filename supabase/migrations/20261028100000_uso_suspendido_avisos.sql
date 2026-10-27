-- ============================================================================
-- Uso suspendido y avisos a terceros (B25a)
-- ============================================================================
--   Informe del flujo de trabajo (docs/producto/informe-flujo-trabajo-ia.md,
--   3.1): si el responsable del despliegue tiene motivos para considerar que
--   el uso conforme a las instrucciones puede dar lugar a un riesgo (Art.
--   79.1), informa sin demora indebida al proveedor o distribuidor y a la
--   autoridad de vigilancia del mercado, y suspende el uso (AI Act, Art. 26.5).
--
--   Decisiones del responsable (2026-10-28):
--     - la suspensión es una marca aparte: el sistema conserva su estado
--       (Producción, Piloto…) y se levanta con «Reanudar uso». Cada suspensión
--       queda como una fila, con su historial;
--     - los avisos a terceros son una lista por destinatario (proveedor,
--       importador, distribuidor, autoridad), con fecha, referencia y
--       evidencia. La misma tabla sirve a los incidentes (B25b).
--
--   Fluxion no envía los avisos: deja constancia de que se hicieron.
--
-- Idempotente.
-- ============================================================================

-- ── 1. Suspensiones del uso ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.system_use_suspensions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  ai_system_id    uuid NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  suspended_at    date NOT NULL,
  reason          text NOT NULL CHECK (length(btrim(reason)) > 0),
  -- Incidente que la motiva, si lo hay.
  incident_id     uuid REFERENCES fluxion.ai_incidents(id) ON DELETE SET NULL,
  suspended_by    uuid REFERENCES fluxion.profiles(id),
  resumed_at      date,
  resume_notes    text,
  resumed_by      uuid REFERENCES fluxion.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT system_use_suspensions_fechas CHECK (resumed_at IS NULL OR resumed_at >= suspended_at)
);

-- Una sola suspensión activa por sistema.
CREATE UNIQUE INDEX IF NOT EXISTS uq_system_use_suspensions_activa
  ON fluxion.system_use_suspensions (ai_system_id) WHERE resumed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_system_use_suspensions_org ON fluxion.system_use_suspensions (organization_id);

COMMENT ON TABLE fluxion.system_use_suspensions IS
  'Suspensiones del uso de un sistema por el responsable del despliegue (AI Act, Art. 26.5). Activa mientras resumed_at es NULL (B25a).';

ALTER TABLE fluxion.system_use_suspensions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_use_suspensions_select ON fluxion.system_use_suspensions;
CREATE POLICY system_use_suspensions_select ON fluxion.system_use_suspensions
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

-- La suspenden y la levantan quienes cambian los responsables del sistema (B23b).
DROP POLICY IF EXISTS system_use_suspensions_write ON fluxion.system_use_suspensions;
CREATE POLICY system_use_suspensions_write ON fluxion.system_use_suspensions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM fluxion.profiles p
       WHERE p.user_id = auth.uid()
         AND p.organization_id = system_use_suspensions.organization_id
         AND p.roles && ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'system_owner'::fluxion.org_role]
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM fluxion.profiles p
       WHERE p.user_id = auth.uid()
         AND p.organization_id = system_use_suspensions.organization_id
         AND p.roles && ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'system_owner'::fluxion.org_role]
    )
    AND EXISTS (
      SELECT 1 FROM fluxion.ai_systems s
       WHERE s.id = system_use_suspensions.ai_system_id
         AND s.organization_id = system_use_suspensions.organization_id
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.system_use_suspensions TO authenticated;
GRANT ALL ON fluxion.system_use_suspensions TO service_role;


-- ── 2. Avisos a terceros ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.external_notices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  -- De qué es el aviso: una suspensión del uso (B25a) o un incidente (B25b).
  suspension_id   uuid REFERENCES fluxion.system_use_suspensions(id) ON DELETE CASCADE,
  incident_id     uuid REFERENCES fluxion.ai_incidents(id) ON DELETE CASCADE,
  recipient       text NOT NULL CHECK (recipient IN ('provider', 'importer', 'distributor', 'authority')),
  -- Quién: nombre del proveedor, de la autoridad…
  recipient_name  text,
  notified_at     date NOT NULL,
  channel         text,
  reference       text,
  -- Constancia del aviso (biblioteca de evidencias).
  evidence_id     uuid REFERENCES fluxion.system_evidences(id) ON DELETE SET NULL,
  notes           text,
  created_by      uuid REFERENCES fluxion.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT external_notices_objeto CHECK ((suspension_id IS NULL) <> (incident_id IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_external_notices_suspension ON fluxion.external_notices (suspension_id);
CREATE INDEX IF NOT EXISTS idx_external_notices_incident ON fluxion.external_notices (incident_id);
CREATE INDEX IF NOT EXISTS idx_external_notices_org ON fluxion.external_notices (organization_id);

COMMENT ON TABLE fluxion.external_notices IS
  'Avisos al proveedor, al importador, al distribuidor o a la autoridad por una suspensión del uso o un incidente (AI Act, Art. 26.5). Constancia: Fluxion no los envía (B25a).';

ALTER TABLE fluxion.external_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS external_notices_select ON fluxion.external_notices;
CREATE POLICY external_notices_select ON fluxion.external_notices
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

-- Los de una suspensión, quienes la gestionan; los de un incidente, quienes lo
-- clasifican y registran su notificación (roles de ai_incidents_update).
DROP POLICY IF EXISTS external_notices_write ON fluxion.external_notices;
CREATE POLICY external_notices_write ON fluxion.external_notices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM fluxion.profiles p
       WHERE p.user_id = auth.uid()
         AND p.organization_id = external_notices.organization_id
         AND p.roles && CASE WHEN external_notices.suspension_id IS NOT NULL
           THEN ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'system_owner'::fluxion.org_role]
           ELSE ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role,
                      'dpo'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]
         END
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM fluxion.profiles p
       WHERE p.user_id = auth.uid()
         AND p.organization_id = external_notices.organization_id
         AND p.roles && CASE WHEN external_notices.suspension_id IS NOT NULL
           THEN ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'system_owner'::fluxion.org_role]
           ELSE ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'caio'::fluxion.org_role,
                      'dpo'::fluxion.org_role, 'risk_analyst'::fluxion.org_role, 'compliance_analyst'::fluxion.org_role]
         END
    )
    AND (
      external_notices.suspension_id IS NULL OR EXISTS (
        SELECT 1 FROM fluxion.system_use_suspensions s
         WHERE s.id = external_notices.suspension_id
           AND s.organization_id = external_notices.organization_id
      )
    )
    AND (
      external_notices.incident_id IS NULL OR EXISTS (
        SELECT 1 FROM fluxion.ai_incidents i
         WHERE i.id = external_notices.incident_id
           AND i.organization_id = external_notices.organization_id
      )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.external_notices TO authenticated;
GRANT ALL ON fluxion.external_notices TO service_role;
