-- ============================================================================
-- FLUXION — Adjuntos de tareas
-- Almacena metadatos de archivos subidos a Supabase Storage.
-- Bucket: task-attachments  (crear en Storage con RLS activado)
-- Path:   {organization_id}/{task_id}/{attachment_id}-{filename}
-- Tamaño máx recomendado: 25 MB por archivo
-- Tipos permitidos: pdf, imágenes (jpg/png/webp), Office (docx/xlsx/pptx), txt, csv
-- ============================================================================

CREATE TABLE fluxion.task_attachments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       uuid        NOT NULL REFERENCES fluxion.tasks(id) ON DELETE CASCADE,
  uploader_id   uuid        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  file_name     text        NOT NULL,
  storage_path  text        NOT NULL,
  file_size     bigint,
  mime_type     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz           -- soft delete
);

COMMENT ON TABLE fluxion.task_attachments IS
  'Metadatos de adjuntos vinculados a una tarea. '
  'El archivo físico vive en Storage bucket task-attachments. '
  'Soft-delete: deleted_at != NULL, el archivo se puede purgar de Storage por separado.';

COMMENT ON COLUMN fluxion.task_attachments.storage_path IS
  'Path completo dentro del bucket: {org_id}/{task_id}/{attachment_id}-{filename}';

-- ─── ÍNDICES ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_task_attachments_task
  ON fluxion.task_attachments(task_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_task_attachments_uploader
  ON fluxion.task_attachments(uploader_id)
  WHERE deleted_at IS NULL;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_attachments_select"
  ON fluxion.task_attachments FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM fluxion.tasks
      WHERE organization_id IN (
        SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "task_attachments_insert"
  ON fluxion.task_attachments FOR INSERT
  WITH CHECK (
    uploader_id IN (SELECT id FROM fluxion.profiles WHERE user_id = auth.uid())
    AND task_id IN (
      SELECT id FROM fluxion.tasks
      WHERE organization_id IN (
        SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Solo soft-delete via UPDATE (deleted_at); solo uploader o admin
CREATE POLICY "task_attachments_update"
  ON fluxion.task_attachments FOR UPDATE
  USING (
    uploader_id IN (SELECT id FROM fluxion.profiles WHERE user_id = auth.uid())
    OR task_id IN (
      SELECT t.id FROM fluxion.tasks t
      JOIN fluxion.profiles p ON p.organization_id = t.organization_id
      WHERE p.user_id = auth.uid()
        AND p.role IN ('org_admin', 'sgai_manager', 'caio')
    )
  );

-- ─── GRANTS ──────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON fluxion.task_attachments TO authenticated;
GRANT ALL                     ON fluxion.task_attachments TO service_role;

-- ─── NOTA: Storage bucket ────────────────────────────────────────────────────
-- Crear manualmente en Supabase Dashboard > Storage:
--   Nombre:  task-attachments
--   Público: NO
--   RLS:     habilitado
-- Política de Storage (Objects table):
--   SELECT: bucket_id = 'task-attachments' AND auth.role() = 'authenticated'
--   INSERT: bucket_id = 'task-attachments' AND auth.role() = 'authenticated'
--   DELETE: bucket_id = 'task-attachments' AND auth.role() = 'authenticated'
