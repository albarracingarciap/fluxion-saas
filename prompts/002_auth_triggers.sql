-- =========================================================================
-- FLUXION SAAS — REGISTRO Y AUTO-PROVISIONAMIENTO (TRIGGERS)
-- =========================================================================
-- Instrucciones: Ejecuta este SQL en el Editor de Supabase. 
-- Esto asegura que CUALQUIER registro genere automáticamente un tenant.

CREATE OR REPLACE FUNCTION fluxion.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  pending_invite RECORD;
BEGIN
  -- 1. Crear el perfil obligatoriamente
  INSERT INTO fluxion.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );

  -- 2. Comprobar si este email fue invitado por un admin
  SELECT * INTO pending_invite 
  FROM fluxion.invitations 
  WHERE email = NEW.email AND accepted_at IS NULL 
  LIMIT 1;

  IF pending_invite.id IS NOT NULL THEN
    -- Está invitado: Lo vinculamos a la empresa que lo invitó con el rol especificado
    INSERT INTO fluxion.organization_members (organization_id, user_id, role)
    VALUES (pending_invite.organization_id, NEW.id, pending_invite.role);
    
    -- Marcamos la invitación como consumida
    UPDATE fluxion.invitations SET accepted_at = now() WHERE id = pending_invite.id;
  ELSE
    -- 3. Registro normal (No hay invitación). Creamos una empresa de inicio.
    INSERT INTO fluxion.organizations (name, slug)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'organization_name', 'Mi Organización'),
      'org-' || substr(gen_random_uuid()::text, 1, 8)
    )
    RETURNING id INTO new_org_id;

    -- 4. Le damos permisos de Administrador Supremo en su nueva empresa
    INSERT INTO fluxion.organization_members (organization_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enganchamos la función al ciclo de vida de Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE fluxion.handle_new_user();
