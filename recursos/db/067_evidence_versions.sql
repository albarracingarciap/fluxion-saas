-- recursos/db/067_evidence_versions.sql
--
-- Historial de versiones de evidencias.
-- Cada vez que se editan metadatos o cambia el estado de revisión se
-- guarda un snapshot de los campos mutables junto con quién lo cambió.
--
-- No se usa trigger porque las server actions corren como service role
-- y auth.uid() no está disponible en ese contexto. El snapshot lo
-- inserta la capa de aplicación desde updateSystemEvidence y
-- reviewSystemEvidence en actions.ts.

CREATE TABLE IF NOT EXISTS fluxion.system_evidence_versions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id    UUID        NOT NULL
                             REFERENCES fluxion.system_evidences(id)
                             ON DELETE CASCADE,
  changed_by     UUID        REFERENCES fluxion.profiles(id)
                             ON DELETE SET NULL,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- tipo de cambio para etiqueta UI
  change_type    TEXT        NOT NULL
                             CHECK (change_type IN (
                               'edit', 'review_requested',
                               'approved', 'rejected', 'reopened', 'created'
                             )),

  -- snapshot de todos los campos mutables en el momento del cambio
  title          TEXT        NOT NULL,
  description    TEXT,
  evidence_type  TEXT        NOT NULL,
  status         TEXT        NOT NULL,
  external_url   TEXT,
  version        TEXT,
  issued_at      TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,
  validation_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_system_evidence_versions_evidence_id
  ON fluxion.system_evidence_versions(evidence_id, changed_at DESC);

-- ─── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.system_evidence_versions ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier miembro de la organización propietaria de la evidencia
CREATE POLICY "evidence_versions_select"
  ON fluxion.system_evidence_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.system_evidences se
      JOIN fluxion.profiles p ON p.organization_id = se.organization_id
      WHERE se.id = system_evidence_versions.evidence_id
        AND p.user_id = auth.uid()
    )
  );

-- INSERT / UPDATE / DELETE: solo service role (las server actions lo hacen
-- directamente; no se expone nunca desde el cliente)
