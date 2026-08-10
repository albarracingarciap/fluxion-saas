-- ============================================================================
-- fluxion.profiles.email — desnormalizado desde auth.users
-- ============================================================================
-- PROBLEMA
-- El módulo de tareas y el emisor de notificaciones consultan `profiles.email`
-- en 7 sitios, pero la columna nunca ha existido. PostgREST devolvía error, el
-- resultado quedaba en NULL y `getCtx()` retornaba null, que la interfaz
-- mostraba como "No autenticado".
--
-- Afectaba a: editar tareas, adjuntar y borrar ficheros de tareas, y el envío
-- de notificaciones. Crear tareas sí funcionaba porque `getOrgId()` solo pide
-- `organization_id`.
--
-- DECISIÓN
-- Se añade la columna en lugar de quitar el campo de las 7 consultas:
--   · El emisor de notificaciones necesita los correos en consultas de conjunto
--     (todos los seguidores de una tarea). Pedirlos a la API de administración
--     de auth usuario a usuario no escala.
--   · Es el mismo patrón que ya usa `audit_log.actor_email`.
--
-- La sincronización con auth.users se garantiza en alta (handle_new_user) y en
-- cambio de correo (nuevo trigger).
-- ============================================================================

ALTER TABLE fluxion.profiles ADD COLUMN IF NOT EXISTS email text;

COMMENT ON COLUMN fluxion.profiles.email IS
  'Correo del usuario, desnormalizado desde auth.users. Se mantiene sincronizado '
  'por fluxion.handle_new_user() en el alta y por fluxion.sync_profile_email() '
  'al cambiarlo. No editar a mano.';

-- ── Backfill de los perfiles existentes ─────────────────────────────────────

UPDATE fluxion.profiles p
SET    email = u.email
FROM   auth.users u
WHERE  u.id = p.user_id
  AND  p.email IS DISTINCT FROM u.email;

-- ── Alta: incluir el correo al crear el perfil ──────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
    -- Usuario invitado: perfil en la org que lo invitó, con el rol asignado
    INSERT INTO fluxion.profiles (user_id, organization_id, full_name, role, email)
    VALUES (NEW.id, pending_invite.organization_id, user_full_name, pending_invite.role, NEW.email);

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

    INSERT INTO fluxion.profiles (user_id, organization_id, full_name, role, email)
    VALUES (NEW.id, new_org_id, user_full_name, 'org_admin', NEW.email);
  END IF;

  RETURN NEW;
END;
$$;

-- ── Cambio de correo: mantener el perfil sincronizado ───────────────────────

CREATE OR REPLACE FUNCTION fluxion.sync_profile_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = fluxion, public
    AS $$
BEGIN
  UPDATE fluxion.profiles
  SET    email = NEW.email
  WHERE  user_id = NEW.id
    AND  email IS DISTINCT FROM NEW.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;

CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION fluxion.sync_profile_email();
