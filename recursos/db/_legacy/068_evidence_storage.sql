-- recursos/db/068_evidence_storage.sql
--
-- Crea el bucket privado 'evidence-files' y las políticas de Storage
-- para que los miembros de una organización puedan subir y leer
-- únicamente los archivos de su propia organización.
--
-- Estructura de paths:  {organization_id}/{evidence_id}/{filename}
-- Ej: a1b2c3d4-…/e5f6a7b8-…/politica-ia-v2.pdf

-- ─── Bucket ────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence-files',
  'evidence-files',
  false,
  20971520,  -- 20 MB
  ARRAY[
    'application/pdf',
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ─── Políticas Storage ──────────────────────────────────────────────────────
-- Los paths tienen la forma  {org_id}/{evidence_id}/{filename}
-- (storage.foldername(name))[1]  → primer segmento = org_id

-- SELECT: cualquier miembro autenticado de la organización propietaria
CREATE POLICY "evidence_files_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'evidence-files'
    AND EXISTS (
      SELECT 1
      FROM fluxion.profiles p
      WHERE p.user_id = auth.uid()
        AND p.organization_id::text = (storage.foldername(name))[1]
    )
  );

-- INSERT: miembros con rol de gestión
CREATE POLICY "evidence_files_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'evidence-files'
    AND EXISTS (
      SELECT 1
      FROM fluxion.profiles p
      WHERE p.user_id = auth.uid()
        AND p.organization_id::text = (storage.foldername(name))[1]
        AND p.role IN (
          'org_admin', 'sgai_manager', 'caio', 'dpo',
          'system_owner', 'risk_analyst', 'compliance_analyst'
        )
    )
  );

-- UPDATE: solo quien subió el archivo o roles de administración
CREATE POLICY "evidence_files_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'evidence-files'
    AND EXISTS (
      SELECT 1
      FROM fluxion.profiles p
      WHERE p.user_id = auth.uid()
        AND p.organization_id::text = (storage.foldername(name))[1]
        AND p.role IN ('org_admin', 'sgai_manager', 'caio', 'dpo')
    )
  );

-- DELETE: roles de administración
CREATE POLICY "evidence_files_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'evidence-files'
    AND EXISTS (
      SELECT 1
      FROM fluxion.profiles p
      WHERE p.user_id = auth.uid()
        AND p.organization_id::text = (storage.foldername(name))[1]
        AND p.role IN ('org_admin', 'sgai_manager', 'caio', 'dpo')
    )
  );
