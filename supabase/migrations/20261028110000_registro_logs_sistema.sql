-- ============================================================================
-- Registro de logs por sistema (B25c)
-- ============================================================================
--   Informe del flujo de trabajo (docs/producto/informe-flujo-trabajo-ia.md,
--   3.3): el responsable del despliegue conserva los registros que el sistema
--   genera automáticamente, en la medida en que estén bajo su control, durante
--   al menos seis meses (AI Act, Art. 26.6).
--
--   Decisiones del responsable:
--     - decisión 5 (2026-10-27): registro declarativo por sistema (dónde están
--       los registros, quién los controla y cuánto se guardan); la integración
--       con las fuentes queda para más adelante;
--     - 2026-10-28: si los controla la organización y declara menos de seis
--       meses, se guarda y se avisa; no se bloquea.
--
-- Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS fluxion.system_log_retention (
  ai_system_id     uuid PRIMARY KEY REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  organization_id  uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  -- Quién controla los registros: la organización, el proveedor o ambos.
  controlled_by    text NOT NULL CHECK (controlled_by IN ('organization', 'provider', 'shared')),
  -- Dónde se guardan (plataforma, servicio, repositorio…).
  storage_location text,
  retention_months integer CHECK (retention_months > 0),
  -- Constancia de la conservación (biblioteca de evidencias).
  evidence_id      uuid REFERENCES fluxion.system_evidences(id) ON DELETE SET NULL,
  -- Última comprobación de que los registros se conservan como se declara.
  verified_at      date,
  notes            text,
  updated_by       uuid REFERENCES fluxion.profiles(id),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_log_retention_org ON fluxion.system_log_retention (organization_id);

COMMENT ON TABLE fluxion.system_log_retention IS
  'Registro declarativo de los logs de cada sistema: dónde están, quién los controla y cuántos meses se conservan (AI Act, Art. 26.6; decisión 5, B25c).';

ALTER TABLE fluxion.system_log_retention ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_log_retention_select ON fluxion.system_log_retention;
CREATE POLICY system_log_retention_select ON fluxion.system_log_retention
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

-- Lo declaran quienes cambian los responsables del sistema (B23b).
DROP POLICY IF EXISTS system_log_retention_write ON fluxion.system_log_retention;
CREATE POLICY system_log_retention_write ON fluxion.system_log_retention
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM fluxion.profiles p
       WHERE p.user_id = auth.uid()
         AND p.organization_id = system_log_retention.organization_id
         AND p.roles && ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'system_owner'::fluxion.org_role]
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM fluxion.profiles p
       WHERE p.user_id = auth.uid()
         AND p.organization_id = system_log_retention.organization_id
         AND p.roles && ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'system_owner'::fluxion.org_role]
    )
    AND EXISTS (
      SELECT 1 FROM fluxion.ai_systems s
       WHERE s.id = system_log_retention.ai_system_id
         AND s.organization_id = system_log_retention.organization_id
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.system_log_retention TO authenticated;
GRANT ALL ON fluxion.system_log_retention TO service_role;
