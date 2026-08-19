-- ─────────────────────────────────────────────────────────────────────────────
-- C1 · Renders: el fichero entregable
--
-- Hasta ahora el expediente era una pantalla. Esto es el fichero que se le
-- entrega a una autoridad o a un organismo notificado, con su huella, y que
-- sobrevive a que se le retire el acceso a la aplicación.
--
-- Inmutable por diseño: regenerar produce una fila nueva. Un entregable
-- regulatorio que se puede editar después no es un entregable.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.document_renders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  document_id      uuid NOT NULL REFERENCES fluxion.documents(id) ON DELETE CASCADE,

  format           text NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'html')),
  template_key     text NOT NULL,
  template_version integer NOT NULL,

  -- El estado completo (derivado + redactado) que produjo estos bytes.
  snapshot_id      uuid REFERENCES fluxion.system_report_snapshots(id) ON DELETE SET NULL,

  storage_backend  text NOT NULL DEFAULT 's3' CHECK (storage_backend IN ('supabase', 's3')),
  storage_bucket   text NOT NULL,
  storage_path     text NOT NULL,
  checksum_sha256  text NOT NULL,
  byte_size        bigint NOT NULL,

  -- Apartados obligatorios sin cubrir en el momento de generar. Un render de un
  -- expediente incompleto es legítimo —sirve para enseñar el avance— pero tiene
  -- que decirlo de sí mismo.
  gaps             jsonb NOT NULL DEFAULT '[]'::jsonb,
  document_status  text NOT NULL,

  evidence_id      uuid REFERENCES fluxion.system_evidences(id) ON DELETE SET NULL,
  rendered_by      uuid REFERENCES fluxion.profiles(id),
  rendered_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_renders_document
  ON fluxion.document_renders (document_id, rendered_at DESC);

COMMENT ON COLUMN fluxion.document_renders.checksum_sha256 IS
  'Huella del PDF entregado. Permite demostrar que el fichero que tiene un auditor es el que se generó.';

-- ── Inmutabilidad ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.document_renders_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'document_renders es inmutable: genera un render nuevo';
END;
$$;

DROP TRIGGER IF EXISTS trg_document_renders_no_update ON fluxion.document_renders;
CREATE TRIGGER trg_document_renders_no_update
  BEFORE UPDATE ON fluxion.document_renders
  FOR EACH ROW EXECUTE FUNCTION fluxion.document_renders_immutable();

-- ── Tipos de snapshot admitidos ──────────────────────────────────────────────
-- system_report_snapshots.report_type es texto libre; se documenta el valor
-- nuevo para que no se invente otro la próxima vez.
COMMENT ON COLUMN fluxion.system_report_snapshots.report_type IS
  'technical_dossier | gap_report | annex_iv | model_card | fria | dpia';

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.document_renders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_renders_select ON fluxion.document_renders;
CREATE POLICY document_renders_select ON fluxion.document_renders
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS document_renders_insert ON fluxion.document_renders;
CREATE POLICY document_renders_insert ON fluxion.document_renders
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

-- Sin UPDATE ni DELETE, ni siquiera para el dueño. El trigger lo impediría de
-- todos modos; no concederlo evita la conversación.
GRANT SELECT, INSERT ON fluxion.document_renders TO authenticated;
GRANT ALL ON fluxion.document_renders TO service_role;
