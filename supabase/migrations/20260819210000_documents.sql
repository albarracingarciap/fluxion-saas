-- ─────────────────────────────────────────────────────────────────────────────
-- C1 · Documentos regulatorios (instancia viva)
--
-- Un documento es la cumplimentación de una plantilla para un sistema concreto.
--
-- Decisión central: `content` guarda SOLO lo que ha escrito un humano. Todo lo
-- que se puede derivar del inventario, del FMEA o del historial se recompone al
-- leer. Si se copiase aquí, el expediente envejecería en paralelo a la realidad
-- y nadie sabría cuál de los dos miente.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  ai_system_id     uuid REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,

  template_key     text NOT NULL,
  template_version integer NOT NULL,

  title            text NOT NULL,
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'in_review', 'approved', 'superseded')),

  -- { "<ref>": { "text": "...", "author_id": uuid, "updated_at": "ts" } }
  content          jsonb NOT NULL DEFAULT '{}'::jsonb,

  approved_by      uuid REFERENCES fluxion.profiles(id),
  approved_at      timestamptz,
  created_by       uuid REFERENCES fluxion.profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- El Anexo IV documenta un sistema concreto; no existe "el Anexo IV de la
  -- organización". Otras plantillas (FRIA, DPIA) sí pueden ser de organización.
  CONSTRAINT chk_documents_system_scope
    CHECK (template_key <> 'annex_iv' OR ai_system_id IS NOT NULL)
);

-- Un solo expediente vivo por sistema y plantilla. Dos Anexos IV del mismo
-- sistema es la forma más rápida de entregar el que no era.
CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_system_template
  ON fluxion.documents (organization_id, ai_system_id, template_key)
  WHERE status <> 'superseded' AND ai_system_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_org_system
  ON fluxion.documents (organization_id, ai_system_id);

COMMENT ON COLUMN fluxion.documents.content IS
  'Solo las respuestas escritas por personas, indexadas por referencia legal (IV.2.g). Lo derivable se recompone al leer.';

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_select ON fluxion.documents;
CREATE POLICY documents_select ON fluxion.documents
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS documents_insert ON fluxion.documents;
CREATE POLICY documents_insert ON fluxion.documents
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS documents_update ON fluxion.documents;
CREATE POLICY documents_update ON fluxion.documents
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON fluxion.documents TO authenticated;
GRANT ALL ON fluxion.documents TO service_role;
