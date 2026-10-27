-- ============================================================================
-- Requerimientos de la autoridad (B25d)
-- ============================================================================
--   Informe del flujo de trabajo (docs/producto/informe-flujo-trabajo-ia.md,
--   3.6 y fase 4): el responsable del despliegue coopera con las autoridades
--   (AI Act, Art. 26.12), que pueden pedir información sobre un sistema o
--   exigir medidas correctoras con un plazo. Hay que dejar constancia de qué
--   se pidió, para cuándo, qué se respondió y con qué evidencias.
--
--   Decisiones del responsable:
--     - decisión 4 (2026-10-27): objeto propio «Requerimiento», sin mezclarlo
--       con los incidentes ni con sus plazos del Art. 73;
--     - 2026-10-28: vive en una pestaña de Incidentes, con los mismos roles de
--       gobierno; también se ve en la ficha de cada sistema afectado.
--
--   Las tareas del requerimiento son tareas con origen `authority_request`.
--
-- Idempotente.
-- ============================================================================

-- ── 1. Requerimientos ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.authority_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  reference           text NOT NULL,   -- REQ-2026-001, legible para citarlo
  -- Autoridad que lo emite y su número de expediente.
  authority           text NOT NULL CHECK (length(btrim(authority)) > 0),
  authority_reference text,
  -- information: solicitud de información o documentación; corrective_measures:
  -- medidas correctoras; other: otro (inspección, acceso…).
  kind                text NOT NULL DEFAULT 'information'
                      CHECK (kind IN ('information', 'corrective_measures', 'other')),
  title               text NOT NULL CHECK (length(btrim(title)) > 0),
  description         text,
  received_at         date NOT NULL,
  due_at              date,
  status              text NOT NULL DEFAULT 'received'
                      CHECK (status IN ('received', 'in_progress', 'answered', 'closed')),
  response            text,
  responded_at        date,
  -- Incidente con el que guarda relación, si lo hay.
  incident_id         uuid REFERENCES fluxion.ai_incidents(id) ON DELETE SET NULL,
  owner_id            uuid REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  created_by          uuid REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  closed_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT authority_requests_reference_uq UNIQUE (organization_id, reference),
  CONSTRAINT authority_requests_plazo CHECK (due_at IS NULL OR due_at >= received_at),
  CONSTRAINT authority_requests_respuesta CHECK (status NOT IN ('answered', 'closed') OR responded_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_authority_requests_org ON fluxion.authority_requests (organization_id, status);

COMMENT ON TABLE fluxion.authority_requests IS
  'Requerimientos de una autoridad: información o medidas correctoras con plazo, respuesta y evidencias (AI Act, Art. 26.12; decisión 4, B25d).';

CREATE OR REPLACE FUNCTION fluxion.next_authority_request_reference(p_org uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_year text := to_char(now(), 'YYYY');
  v_next integer;
BEGIN
  SELECT COALESCE(MAX(split_part(reference, '-', 3)::integer), 0) + 1
    INTO v_next
    FROM fluxion.authority_requests
   WHERE organization_id = p_org
     AND reference LIKE 'REQ-' || v_year || '-%';
  RETURN 'REQ-' || v_year || '-' || lpad(v_next::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION fluxion.authority_requests_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND (NEW.reference IS NULL OR NEW.reference = '') THEN
    NEW.reference := fluxion.next_authority_request_reference(NEW.organization_id);
  END IF;
  NEW.updated_at := now();
  IF NEW.status = 'closed' AND NEW.closed_at IS NULL THEN
    NEW.closed_at := now();
  ELSIF NEW.status <> 'closed' THEN
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_authority_requests_before_write ON fluxion.authority_requests;
CREATE TRIGGER trg_authority_requests_before_write
  BEFORE INSERT OR UPDATE ON fluxion.authority_requests
  FOR EACH ROW EXECUTE FUNCTION fluxion.authority_requests_before_write();

-- La referencia la pone el trigger.
ALTER TABLE fluxion.authority_requests ALTER COLUMN reference SET DEFAULT '';


-- ── 2. Sistemas afectados y evidencias de la respuesta ─────────────────────

CREATE TABLE IF NOT EXISTS fluxion.authority_request_systems (
  request_id      uuid NOT NULL REFERENCES fluxion.authority_requests(id) ON DELETE CASCADE,
  ai_system_id    uuid NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  PRIMARY KEY (request_id, ai_system_id)
);
CREATE INDEX IF NOT EXISTS idx_authority_request_systems_system ON fluxion.authority_request_systems (ai_system_id);

CREATE TABLE IF NOT EXISTS fluxion.authority_request_evidences (
  request_id      uuid NOT NULL REFERENCES fluxion.authority_requests(id) ON DELETE CASCADE,
  evidence_id     uuid NOT NULL REFERENCES fluxion.system_evidences(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  PRIMARY KEY (request_id, evidence_id)
);


-- ── 3. RLS: leen todos los miembros; escriben los roles de gobierno ────────
--   Mismos roles que gestionan los incidentes (incidentes/actions.ts).

ALTER TABLE fluxion.authority_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.authority_request_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.authority_request_evidences ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['authority_requests', 'authority_request_systems', 'authority_request_evidences'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON fluxion.%I', t || '_select', t);
    EXECUTE format($p$CREATE POLICY %I ON fluxion.%I FOR SELECT USING (
      organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()))$p$, t || '_select', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON fluxion.%I', t || '_write', t);
    EXECUTE format($p$CREATE POLICY %I ON fluxion.%I FOR ALL USING (
      EXISTS (SELECT 1 FROM fluxion.profiles p
               WHERE p.user_id = auth.uid()
                 AND p.organization_id = %I.organization_id
                 AND p.roles && ARRAY['org_admin', 'sgai_manager', 'caio', 'dpo', 'risk_analyst', 'compliance_analyst']::fluxion.org_role[]))
    WITH CHECK (
      EXISTS (SELECT 1 FROM fluxion.profiles p
               WHERE p.user_id = auth.uid()
                 AND p.organization_id = %I.organization_id
                 AND p.roles && ARRAY['org_admin', 'sgai_manager', 'caio', 'dpo', 'risk_analyst', 'compliance_analyst']::fluxion.org_role[]))$p$,
      t || '_write', t, t, t);

    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON fluxion.%I TO service_role', t);
  END LOOP;
END $$;

-- Las filas de enlace pertenecen a requerimientos de la misma organización.
CREATE OR REPLACE FUNCTION fluxion.authority_request_link_check()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM fluxion.authority_requests r
                  WHERE r.id = NEW.request_id AND r.organization_id = NEW.organization_id) THEN
    RAISE EXCEPTION 'El requerimiento no pertenece a la organización';
  END IF;
  -- Condiciones anidadas: cada tabla solo tiene su columna de enlace.
  IF TG_TABLE_NAME = 'authority_request_systems' THEN
    IF NOT EXISTS (SELECT 1 FROM fluxion.ai_systems s WHERE s.id = NEW.ai_system_id AND s.organization_id = NEW.organization_id) THEN
      RAISE EXCEPTION 'El sistema no pertenece a la organización';
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM fluxion.system_evidences e WHERE e.id = NEW.evidence_id AND e.organization_id = NEW.organization_id) THEN
      RAISE EXCEPTION 'La evidencia no pertenece a la organización';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_authority_request_systems_check ON fluxion.authority_request_systems;
CREATE TRIGGER trg_authority_request_systems_check
  BEFORE INSERT OR UPDATE ON fluxion.authority_request_systems
  FOR EACH ROW EXECUTE FUNCTION fluxion.authority_request_link_check();

DROP TRIGGER IF EXISTS trg_authority_request_evidences_check ON fluxion.authority_request_evidences;
CREATE TRIGGER trg_authority_request_evidences_check
  BEFORE INSERT OR UPDATE ON fluxion.authority_request_evidences
  FOR EACH ROW EXECUTE FUNCTION fluxion.authority_request_link_check();


-- ── 4. Tareas: admitir origen 'authority_request' ──────────────────────────

ALTER TABLE fluxion.tasks DROP CONSTRAINT IF EXISTS tasks_source_type_check;
ALTER TABLE fluxion.tasks ADD CONSTRAINT tasks_source_type_check
  CHECK (source_type IN (
    'manual', 'treatment_action', 'gap', 'evaluation',
    'fmea_item', 'gap_group', 'signal', 'incident', 'authority_request'
  ));
