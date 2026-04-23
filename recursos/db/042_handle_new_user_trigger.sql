-- ============================================================================
-- FLUXION — 042: Trigger handle_new_user para nuevo modelo de profiles
-- ============================================================================
-- Reescribe fluxion.handle_new_user() para el nuevo esquema:
--   - profiles.id es UUID propio (ya no es auth.users.id)
--   - profiles.user_id referencia auth.users.id
--   - profiles.organization_id está embebido directamente
--   - profiles.role usa org_role ENUM
--   - invitations.status reemplaza al check de accepted_at IS NULL
-- ============================================================================

CREATE OR REPLACE FUNCTION fluxion.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id      UUID;
  pending_invite  RECORD;
  user_full_name  TEXT;
BEGIN
  -- Construir full_name desde los metadatos del usuario
  user_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(
      CONCAT(
        NEW.raw_user_meta_data->>'first_name',
        ' ',
        NEW.raw_user_meta_data->>'last_name'
      )
    ), ''),
    NEW.email
  );

  -- Buscar invitación pendiente para este email
  SELECT * INTO pending_invite
  FROM fluxion.invitations
  WHERE email = NEW.email AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF pending_invite.id IS NOT NULL THEN
    -- Usuario invitado: crear perfil en la org que lo invitó con el rol asignado
    INSERT INTO fluxion.profiles (user_id, organization_id, full_name, role)
    VALUES (NEW.id, pending_invite.organization_id, user_full_name, pending_invite.role);

    -- Marcar invitación como aceptada
    UPDATE fluxion.invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = pending_invite.id;

  ELSE
    -- Registro directo: crear organización y perfil como org_admin
    INSERT INTO fluxion.organizations (name, slug)
    VALUES (
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'organization_name'), ''), 'Mi Organización'),
      'org-' || substr(gen_random_uuid()::text, 1, 8)
    )
    RETURNING id INTO new_org_id;

    INSERT INTO fluxion.profiles (user_id, organization_id, full_name, role)
    VALUES (NEW.id, new_org_id, user_full_name, 'org_admin');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE fluxion.handle_new_user();
