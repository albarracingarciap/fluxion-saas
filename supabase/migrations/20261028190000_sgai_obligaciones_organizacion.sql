-- ============================================================================
-- Sistema de gestión ISO/IEC 42001: obligaciones de la organización (B20a)
-- ============================================================================
--   DP-09 (decidida el 2026-10-20): las 10 obligaciones ISO del catálogo se
--   aplican a nivel de organización, con sesiones de comité y acta (B20b y
--   B20c). GAP-12 y GAP-31.
--
--   Decisiones del responsable (2026-10-28):
--     - las obligaciones estaban codificadas como controles del Anexo A
--       (ISO42001-A61, «A.6.1»…) cuando son cláusulas del sistema de gestión:
--       se corrigen la cláusula y el código. Nada las usaba aún;
--     - vista propia (ISO 42001 › Sistema de gestión) con estado,
--       responsable, evidencias y propuestas de estado cuando hay datos.
--
--   Correspondencia aprobada:
--     ISO42001-A61  → ISO42001-6.2    §6.2   Objetivos del sistema de gestión de IA
--     ISO42001-A62  → ISO42001-6.1.4  §6.1.4 Evaluación de impacto de la IA
--     ISO42001-A71  → ISO42001-7.1    §7.1   Recursos del SGAI
--     ISO42001-A72  → ISO42001-7.2    §7.2   Competencia y formación
--     ISO42001-A81  → ISO42001-8.1    §8.1   Planificación y control operacional
--     ISO42001-A82  → ISO42001-8.2    §8.2   Evaluación de riesgos de IA
--     ISO42001-A91  → ISO42001-9.1    §9.1   Seguimiento, medición y análisis
--     ISO42001-A92  → ISO42001-9.2    §9.2   Auditoría interna
--     ISO42001-A93  → ISO42001-9.3    §9.3   Revisión por la dirección
--     ISO42001-A101 → ISO42001-10.2   §10.2  No conformidad y acción correctiva
--
-- Idempotente.
-- ============================================================================

-- ── 1. Códigos y cláusulas del catálogo ────────────────────────────────────

UPDATE compliance.obligations o
   SET code = v.nuevo, article = v.clausula
  FROM (VALUES
    ('ISO42001-A61',  'ISO42001-6.2',   '§6.2'),
    ('ISO42001-A62',  'ISO42001-6.1.4', '§6.1.4'),
    ('ISO42001-A71',  'ISO42001-7.1',   '§7.1'),
    ('ISO42001-A72',  'ISO42001-7.2',   '§7.2'),
    ('ISO42001-A81',  'ISO42001-8.1',   '§8.1'),
    ('ISO42001-A82',  'ISO42001-8.2',   '§8.2'),
    ('ISO42001-A91',  'ISO42001-9.1',   '§9.1'),
    ('ISO42001-A92',  'ISO42001-9.2',   '§9.2'),
    ('ISO42001-A93',  'ISO42001-9.3',   '§9.3'),
    ('ISO42001-A101', 'ISO42001-10.2',  '§10.2')
  ) AS v(viejo, nuevo, clausula)
 WHERE o.code = v.viejo;


-- ── 2. Obligaciones de la organización ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.organization_obligations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  obligation_code  text NOT NULL,
  -- Las cláusulas del sistema de gestión no se excluyen: son requisitos de la norma.
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  -- auth.users.id, como el resto de responsables (patrón P1).
  owner_user_id    uuid,
  due_date         date,
  notes            text,
  resolution_notes text,
  resolved_at      timestamptz,
  resolved_by      uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_obligations_uq UNIQUE (organization_id, obligation_code)
);

COMMENT ON TABLE fluxion.organization_obligations IS
  'Obligaciones de la organización: las cláusulas del sistema de gestión de ISO/IEC 42001 (DP-09, B20a).';

CREATE TABLE IF NOT EXISTS fluxion.organization_obligation_evidences (
  obligation_id   uuid NOT NULL REFERENCES fluxion.organization_obligations(id) ON DELETE CASCADE,
  evidence_id     uuid NOT NULL REFERENCES fluxion.system_evidences(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (obligation_id, evidence_id)
);

-- Leen los miembros; escriben el Administrador, el Responsable del SGAI y el
-- Analista de cumplimiento.
ALTER TABLE fluxion.organization_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.organization_obligation_evidences ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['organization_obligations', 'organization_obligation_evidences'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON fluxion.%I', t || '_select', t);
    EXECUTE format($p$CREATE POLICY %I ON fluxion.%I FOR SELECT USING (
      organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()))$p$, t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON fluxion.%I', t || '_write', t);
    EXECUTE format($p$CREATE POLICY %I ON fluxion.%I FOR ALL USING (
      EXISTS (SELECT 1 FROM fluxion.profiles p
               WHERE p.user_id = auth.uid() AND p.organization_id = %I.organization_id
                 AND p.roles && ARRAY['org_admin', 'sgai_manager', 'compliance_analyst']::fluxion.org_role[]))
    WITH CHECK (
      EXISTS (SELECT 1 FROM fluxion.profiles p
               WHERE p.user_id = auth.uid() AND p.organization_id = %I.organization_id
                 AND p.roles && ARRAY['org_admin', 'sgai_manager', 'compliance_analyst']::fluxion.org_role[]))$p$,
      t || '_write', t, t, t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON fluxion.%I TO service_role', t);
  END LOOP;
END $$;

-- La evidencia vinculada es de la misma organización.
CREATE OR REPLACE FUNCTION fluxion.organization_obligation_evidence_check()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM fluxion.organization_obligations o WHERE o.id = NEW.obligation_id AND o.organization_id = NEW.organization_id)
     OR NOT EXISTS (SELECT 1 FROM fluxion.system_evidences e WHERE e.id = NEW.evidence_id AND e.organization_id = NEW.organization_id) THEN
    RAISE EXCEPTION 'La obligación y la evidencia deben ser de la misma organización';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organization_obligation_evidence_check ON fluxion.organization_obligation_evidences;
CREATE TRIGGER trg_organization_obligation_evidence_check
  BEFORE INSERT OR UPDATE ON fluxion.organization_obligation_evidences
  FOR EACH ROW EXECUTE FUNCTION fluxion.organization_obligation_evidence_check();
