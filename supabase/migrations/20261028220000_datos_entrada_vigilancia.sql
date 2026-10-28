-- ============================================================================
-- Datos de entrada y vigilancia del funcionamiento (B28)
-- ============================================================================
--   Documento de comprobación: «verificar la idoneidad de los datos de entrada
--   y los usos del sistema de IA y vigilar continuamente su funcionamiento».
--   AI Act, Art. 26.4 (datos de entrada pertinentes y suficientemente
--   representativos, en la medida en que el responsable del despliegue los
--   controle) y Art. 26.5 (vigilar el funcionamiento según las instrucciones e
--   informar al proveedor).
--
--   Decisiones del responsable (DP-12, 2026-10-28):
--     - fichas declarativas por sistema con verificaciones periódicas y
--       evidencias: informe de calidad o perfilado y/o muestra anonimizada,
--       nunca el dataset en bruto;
--     - verificación de los datos de entrada semestral y revisión del
--       funcionamiento trimestral, modificables por sistema;
--     - obligatorias en alto riesgo con la organización como responsable del
--       despliegue, opcionales en el resto;
--     - «Registro de monitorización» (EVT-TEC-04) para el Art. 26.5 y nuevo
--       tipo «Informe de calidad de datos de entrada» (EVT-TEC-06) para el
--       Art. 26.4;
--     - las señales automáticas como verificación, más adelante.
--
-- Idempotente.
-- ============================================================================

-- ── 1. Datos de entrada (Art. 26.4) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.system_input_data (
  ai_system_id     uuid PRIMARY KEY REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  organization_id  uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  -- Quién controla los datos de entrada: la organización, el proveedor o ambos.
  controlled_by    text NOT NULL CHECK (controlled_by IN ('organization', 'provider', 'shared')),
  -- Qué espera el sistema: tipo de datos, formato, rangos, población o casos previstos.
  expected_data    text,
  -- De dónde vienen los datos.
  sources          text,
  -- Controles de calidad y representatividad que aplica la organización.
  controls         text,
  verify_months    integer NOT NULL DEFAULT 6 CHECK (verify_months BETWEEN 1 AND 36),
  notes            text,
  updated_by       uuid REFERENCES fluxion.profiles(id),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE fluxion.system_input_data IS
  'Datos de entrada de cada sistema: quién los controla, qué espera el sistema, fuentes y controles (AI Act, Art. 26.4; DP-12, B28).';


-- ── 2. Plan de vigilancia del funcionamiento (Art. 26.5) ───────────────────

CREATE TABLE IF NOT EXISTS fluxion.system_monitoring_plan (
  ai_system_id     uuid PRIMARY KEY REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  organization_id  uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  -- Indicadores: [{id, name, threshold, source}] con source ∈ manual, senales,
  -- telemetria, supervision_humana.
  indicators       jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_months    integer NOT NULL DEFAULT 3 CHECK (review_months BETWEEN 1 AND 24),
  -- Responsable de la vigilancia (profiles.id).
  owner_profile_id uuid REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  notes            text,
  updated_by       uuid REFERENCES fluxion.profiles(id),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE fluxion.system_monitoring_plan IS
  'Plan de vigilancia del funcionamiento de cada sistema: indicadores, umbrales, fuente, frecuencia y responsable (AI Act, Art. 26.5; DP-12, B28).';


-- ── 3. Verificaciones y revisiones ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.system_operation_checks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_system_id     uuid NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  organization_id  uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  -- input_data: verificación de los datos de entrada; monitoring: revisión del funcionamiento.
  kind             text NOT NULL CHECK (kind IN ('input_data', 'monitoring')),
  period_start     date,
  checked_at       date NOT NULL,
  result           text NOT NULL CHECK (result IN ('conforme', 'desviaciones', 'no_conforme')),
  summary          text NOT NULL CHECK (char_length(btrim(summary)) > 0),
  -- Datos de la aplicación del periodo, generados al registrarla (revisión del funcionamiento).
  data_summary     text,
  actions          text,
  created_by       uuid REFERENCES fluxion.profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (period_start IS NULL OR period_start <= checked_at)
);

CREATE INDEX IF NOT EXISTS idx_system_operation_checks_system ON fluxion.system_operation_checks (ai_system_id, kind, checked_at DESC);

COMMENT ON TABLE fluxion.system_operation_checks IS
  'Verificaciones de los datos de entrada y revisiones del funcionamiento de cada sistema; no se modifican (DP-12, B28).';

CREATE TABLE IF NOT EXISTS fluxion.system_operation_check_evidences (
  check_id        uuid NOT NULL REFERENCES fluxion.system_operation_checks(id) ON DELETE CASCADE,
  evidence_id     uuid NOT NULL REFERENCES fluxion.system_evidences(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (check_id, evidence_id)
);


-- ── 4. RLS ─────────────────────────────────────────────────────────────────
-- Leen los miembros; escriben quienes declaran el registro de logs (B25c).

ALTER TABLE fluxion.system_input_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.system_monitoring_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.system_operation_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.system_operation_check_evidences ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['system_input_data', 'system_monitoring_plan', 'system_operation_checks', 'system_operation_check_evidences'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON fluxion.%I', t || '_select', t);
    EXECUTE format($p$CREATE POLICY %I ON fluxion.%I FOR SELECT USING (
      organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()))$p$, t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON fluxion.%I', t || '_write', t);
    EXECUTE format($p$CREATE POLICY %I ON fluxion.%I FOR ALL USING (
      EXISTS (SELECT 1 FROM fluxion.profiles p
               WHERE p.user_id = auth.uid() AND p.organization_id = %I.organization_id
                 AND p.roles && ARRAY['org_admin', 'sgai_manager', 'system_owner']::fluxion.org_role[]))
    WITH CHECK (
      EXISTS (SELECT 1 FROM fluxion.profiles p
               WHERE p.user_id = auth.uid() AND p.organization_id = %I.organization_id
                 AND p.roles && ARRAY['org_admin', 'sgai_manager', 'system_owner']::fluxion.org_role[]))$p$,
      t || '_write', t, t, t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON fluxion.%I TO service_role', t);
  END LOOP;
END $$;

-- Las verificaciones registradas no se modifican ni se borran: son el rastro.
REVOKE UPDATE, DELETE ON fluxion.system_operation_checks FROM authenticated;

-- Coherencia de organización: el sistema y las evidencias son de la misma.
CREATE OR REPLACE FUNCTION fluxion.system_operation_org_check()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'system_operation_check_evidences' THEN
    IF NOT EXISTS (SELECT 1 FROM fluxion.system_operation_checks c WHERE c.id = NEW.check_id AND c.organization_id = NEW.organization_id)
       OR NOT EXISTS (SELECT 1 FROM fluxion.system_evidences e WHERE e.id = NEW.evidence_id AND e.organization_id = NEW.organization_id) THEN
      RAISE EXCEPTION 'La verificación y la evidencia deben ser de la misma organización';
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM fluxion.ai_systems s WHERE s.id = NEW.ai_system_id AND s.organization_id = NEW.organization_id) THEN
      RAISE EXCEPTION 'El sistema no es de la organización';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['system_input_data', 'system_monitoring_plan', 'system_operation_checks', 'system_operation_check_evidences'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON fluxion.%I', 'trg_' || t || '_org', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON fluxion.%I FOR EACH ROW EXECUTE FUNCTION fluxion.system_operation_org_check()', 'trg_' || t || '_org', t);
  END LOOP;
END $$;


-- ── 5. Tipos de evidencia ──────────────────────────────────────────────────

INSERT INTO compliance.evidence_types (code, name, description, category)
SELECT 'EVT-TEC-06', 'Informe de calidad de datos de entrada',
       'Informe de calidad o perfilado de los datos de entrada, o muestra anonimizada, que acredita que son pertinentes y suficientemente representativos para la finalidad prevista (AI Act, Art. 26.4). No el dataset en bruto.',
       'técnica'
 WHERE NOT EXISTS (SELECT 1 FROM compliance.evidence_types WHERE code = 'EVT-TEC-06');

INSERT INTO compliance.obligation_evidence_types (obligation_id, evidence_type_id, requirement_level, notes)
SELECT o.id, et.id, 'recommended', v.notes
  FROM (VALUES
    ('AI-ACT-ART26-4', 'EVT-TEC-06', 'Verificación de los datos de entrada (DP-12)'),
    ('AI-ACT-ART26-5', 'EVT-TEC-04', 'Revisión del funcionamiento (DP-12)')
  ) AS v(obligation, evidence, notes)
  JOIN compliance.obligations o ON o.code = v.obligation
  JOIN compliance.evidence_types et ON et.code = v.evidence
 WHERE NOT EXISTS (
   SELECT 1 FROM compliance.obligation_evidence_types x WHERE x.obligation_id = o.id AND x.evidence_type_id = et.id
 );


-- ── 6. Tareas de verificación ──────────────────────────────────────────────

ALTER TABLE fluxion.tasks DROP CONSTRAINT IF EXISTS tasks_source_type_check;
ALTER TABLE fluxion.tasks ADD CONSTRAINT tasks_source_type_check CHECK (source_type IN (
  'manual', 'treatment_action', 'gap', 'evaluation', 'fmea_item', 'gap_group', 'signal', 'incident',
  'authority_request', 'reevaluation', 'annual_report', 'cease_use', 'committee_session', 'management_review',
  'operation_check'
));
