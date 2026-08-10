-- ── Trigger de auth ──────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fluxion.handle_new_user();

-- ── Buckets ──────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES
  ('evidence-files',     'evidence-files',     false, 26214400),
  ('task-attachments',   'task-attachments',   false, 26214400),
  ('organization-logos', 'organization-logos', true,   5242880),
  ('user-avatars',       'user-avatars',       true,   5242880)
ON CONFLICT (id) DO NOTHING;

-- ── evidence-files ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "evidence_files_read"   ON storage.objects;
DROP POLICY IF EXISTS "evidence_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "evidence_files_delete" ON storage.objects;

CREATE POLICY "evidence_files_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'evidence-files' AND (storage.foldername(name))[1] IN (
  SELECT organization_id::text FROM fluxion.profiles WHERE user_id = auth.uid()));

CREATE POLICY "evidence_files_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'evidence-files' AND (storage.foldername(name))[1] IN (
  SELECT organization_id::text FROM fluxion.profiles WHERE user_id = auth.uid()));

CREATE POLICY "evidence_files_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'evidence-files' AND (storage.foldername(name))[1] IN (
  SELECT organization_id::text FROM fluxion.profiles WHERE user_id = auth.uid()));

-- ── organization-logos ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "org_logos_read"   ON storage.objects;
DROP POLICY IF EXISTS "org_logos_insert" ON storage.objects;
DROP POLICY IF EXISTS "org_logos_update" ON storage.objects;

CREATE POLICY "org_logos_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'organization-logos');

CREATE POLICY "org_logos_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'organization-logos' AND (storage.foldername(name))[1] IN (
  SELECT organization_id::text FROM fluxion.profiles WHERE user_id = auth.uid()));

CREATE POLICY "org_logos_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'organization-logos' AND (storage.foldername(name))[1] IN (
  SELECT organization_id::text FROM fluxion.profiles WHERE user_id = auth.uid()))
WITH CHECK (bucket_id = 'organization-logos');

-- ── user-avatars ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "avatars_read"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;

CREATE POLICY "avatars_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'user-avatars');

CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'user-avatars');

-- task-attachments no lleva políticas: solo se accede con service_role.
