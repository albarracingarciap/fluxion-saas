-- ============================================================================
-- Supervisión humana documentada y formación (B24)
-- ============================================================================
--   Informe del flujo de trabajo (docs/producto/informe-flujo-trabajo-ia.md,
--   2.3): el responsable del despliegue encomienda la supervisión humana a
--   personas con la competencia, la formación y la autoridad necesarias (AI
--   Act, Art. 26.2), que pueden no usar, anular o revertir la salida y detener
--   el sistema (Art. 14.4), y la organización garantiza la alfabetización en IA
--   de su personal (Art. 4). Hasta ahora solo constaba quién supervisa (B23b).
--
--   Decisiones del responsable (2026-10-27):
--     - la formación se registra por persona (`member_trainings`), con la
--       evidencia que la acredita (registro de formación, EVT-PRO-02), que pasa
--       por la revisión de evidencias;
--     - la supervisión está documentada cuando el responsable tiene anotadas su
--       competencia y su autoridad y una formación válida, y el sistema tiene
--       descritas sus medidas de vigilancia. El suplente se documenta igual,
--       pero no cuenta;
--     - la alfabetización en IA se muestra en Usuarios, sin bloquear.
--
-- Idempotente.
-- ============================================================================

-- ── 1. Formaciones por persona ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.member_trainings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES fluxion.profiles(id) ON DELETE CASCADE,
  -- ai_literacy: alfabetización en IA (Art. 4); system_oversight: supervisión de un sistema (Art. 26.2).
  kind            text NOT NULL CHECK (kind IN ('ai_literacy', 'system_oversight')),
  ai_system_id    uuid REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  title           text NOT NULL CHECK (length(btrim(title)) > 0),
  provider        text,
  completed_at    date NOT NULL,
  expires_at      date,
  -- Registro de formación que la acredita (biblioteca de evidencias).
  evidence_id     uuid REFERENCES fluxion.system_evidences(id) ON DELETE SET NULL,
  created_by      uuid REFERENCES fluxion.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_trainings_sistema CHECK (kind <> 'system_oversight' OR ai_system_id IS NOT NULL),
  CONSTRAINT member_trainings_fechas CHECK (expires_at IS NULL OR expires_at >= completed_at)
);

CREATE INDEX IF NOT EXISTS idx_member_trainings_profile ON fluxion.member_trainings (profile_id);
CREATE INDEX IF NOT EXISTS idx_member_trainings_org ON fluxion.member_trainings (organization_id);

COMMENT ON TABLE fluxion.member_trainings IS
  'Formación de cada miembro: alfabetización en IA (AI Act, Art. 4) o supervisión de un sistema (Art. 26.2), con la evidencia que la acredita (B24).';

ALTER TABLE fluxion.member_trainings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_trainings_select ON fluxion.member_trainings;
CREATE POLICY member_trainings_select ON fluxion.member_trainings
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

-- La registra la propia persona, el Administrador o el Responsable del SGAI.
DROP POLICY IF EXISTS member_trainings_write ON fluxion.member_trainings;
CREATE POLICY member_trainings_write ON fluxion.member_trainings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM fluxion.profiles p
       WHERE p.user_id = auth.uid()
         AND p.organization_id = member_trainings.organization_id
         AND (p.id = member_trainings.profile_id
              OR p.roles && ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role])
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM fluxion.profiles p
       WHERE p.user_id = auth.uid()
         AND p.organization_id = member_trainings.organization_id
         AND (p.id = member_trainings.profile_id
              OR p.roles && ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role])
    )
    AND EXISTS (
      SELECT 1 FROM fluxion.profiles t
       WHERE t.id = member_trainings.profile_id
         AND t.organization_id = member_trainings.organization_id
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.member_trainings TO authenticated;
GRANT ALL ON fluxion.member_trainings TO service_role;


-- ── 2. Documentación de la supervisión por sistema y persona ───────────────

CREATE TABLE IF NOT EXISTS fluxion.system_oversight_documentation (
  ai_system_id        uuid NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  profile_id          uuid NOT NULL REFERENCES fluxion.profiles(id) ON DELETE CASCADE,
  organization_id     uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  -- Competencia para supervisar este sistema (conocimiento del sistema, del dominio, de sus límites).
  competence          text,
  -- Puede no usar, anular o revertir la salida y detener el sistema (Art. 14.4.d y e).
  authority_confirmed boolean NOT NULL DEFAULT false,
  authority_notes     text,
  updated_by          uuid REFERENCES fluxion.profiles(id),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ai_system_id, profile_id)
);

COMMENT ON TABLE fluxion.system_oversight_documentation IS
  'Competencia y autoridad de cada persona que supervisa un sistema (AI Act, Art. 26.2 y 14.4). Va con la persona: si cambia el responsable, la del anterior se conserva (B24).';

ALTER TABLE fluxion.system_oversight_documentation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_oversight_documentation_select ON fluxion.system_oversight_documentation;
CREATE POLICY system_oversight_documentation_select ON fluxion.system_oversight_documentation
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

-- La documentan quienes cambian los responsables del sistema (B23b).
DROP POLICY IF EXISTS system_oversight_documentation_write ON fluxion.system_oversight_documentation;
CREATE POLICY system_oversight_documentation_write ON fluxion.system_oversight_documentation
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM fluxion.profiles p
       WHERE p.user_id = auth.uid()
         AND p.organization_id = system_oversight_documentation.organization_id
         AND p.roles && ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'system_owner'::fluxion.org_role]
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM fluxion.profiles p
       WHERE p.user_id = auth.uid()
         AND p.organization_id = system_oversight_documentation.organization_id
         AND p.roles && ARRAY['org_admin'::fluxion.org_role, 'sgai_manager'::fluxion.org_role, 'system_owner'::fluxion.org_role]
    )
    AND EXISTS (
      SELECT 1 FROM fluxion.ai_systems s
       WHERE s.id = system_oversight_documentation.ai_system_id
         AND s.organization_id = system_oversight_documentation.organization_id
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.system_oversight_documentation TO authenticated;
GRANT ALL ON fluxion.system_oversight_documentation TO service_role;


-- ── 3. Medidas de vigilancia del sistema ───────────────────────────────────

ALTER TABLE fluxion.ai_systems
  ADD COLUMN IF NOT EXISTS oversight_measures text;

COMMENT ON COLUMN fluxion.ai_systems.oversight_measures IS
  'Medidas de vigilancia de la supervisión humana: qué se revisa, cuándo y cómo se interviene (AI Act, Art. 14 y 26.1). B24.';
