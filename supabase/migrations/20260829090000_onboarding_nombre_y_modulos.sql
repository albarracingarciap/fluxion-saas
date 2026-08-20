-- ============================================================================
-- Onboarding: nombre del perfil y modulos en prueba
-- ============================================================================
-- Dos huecos que solo se ven al dar de alta una organizacion desde cero. Se
-- vieron al estrenar la instancia propia, que es exactamente el recorrido de un
-- cliente nuevo.
--
-- 1. `handle_new_user` componia `full_name` a partir de los metadatos y dejaba
--    `first_name` y `last_name` a NULL. El topbar lee `full_name` y se veia
--    bien; el formulario de perfil lee los otros dos y salia vacio. El comment
--    de la columna ya pedia mantenerlos sincronizados: se pedia y no se hacia.
--
-- 2. Ninguna organizacion nacia con modulos. `organization_modules` solo se lee
--    desde la aplicacion, nunca se escribe, asi que un cliente que se registra
--    entra a una aplicacion donde la mitad de las funciones no aparecen — sin
--    ningun mensaje que lo explique. Se conceden en prueba, con fecha.
-- ============================================================================


-- ── 1 · Alta: guardar tambien nombre y apellidos ────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  new_org_id      UUID;
  pending_invite  RECORD;
  user_full_name  TEXT;
  user_first_name TEXT;
  user_last_name  TEXT;
BEGIN
  user_first_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), '');
  user_last_name  := NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), '');

  user_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(CONCAT(user_first_name, ' ', user_last_name)), ''),
    NEW.email
  );

  SELECT * INTO pending_invite
  FROM fluxion.invitations
  WHERE email = NEW.email AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF pending_invite.id IS NOT NULL THEN
    INSERT INTO fluxion.profiles (user_id, organization_id, full_name,
                                  first_name, last_name, role, email)
    VALUES (NEW.id, pending_invite.organization_id, user_full_name,
            user_first_name, user_last_name, pending_invite.role, NEW.email);

    UPDATE fluxion.invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = pending_invite.id;

  ELSE
    INSERT INTO fluxion.organizations (name, slug)
    VALUES (
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'organization_name'), ''), 'Mi Organización'),
      'org-' || substr(gen_random_uuid()::text, 1, 8)
    )
    RETURNING id INTO new_org_id;

    INSERT INTO fluxion.profiles (user_id, organization_id, full_name,
                                  first_name, last_name, role, email)
    VALUES (NEW.id, new_org_id, user_full_name,
            user_first_name, user_last_name, 'org_admin', NEW.email);
  END IF;

  RETURN NEW;
END;
$$;


-- Perfiles ya creados: los metadatos de auth.users tienen el dato exacto, asi
-- que no hace falta partir `full_name` por el primer espacio — que se
-- equivocaria con cualquier apellido compuesto.

UPDATE fluxion.profiles p
SET    first_name = NULLIF(TRIM(u.raw_user_meta_data->>'first_name'), ''),
       last_name  = NULLIF(TRIM(u.raw_user_meta_data->>'last_name'), '')
FROM   auth.users u
WHERE  u.id = p.user_id
  AND  p.first_name IS NULL
  AND  p.last_name  IS NULL
  AND  (u.raw_user_meta_data ? 'first_name' OR u.raw_user_meta_data ? 'last_name');


-- ── 2 · Modulos en prueba al crear la organizacion ──────────────────────────
--
-- La lista va en la funcion, no en una tabla de catalogo: cada modulo nuevo
-- exige una decision explicita sobre si entra en la prueba, y una migracion es
-- el sitio donde esa decision queda registrada.
--
-- 30 dias desde el alta. `licensed_until` en el pasado desactiva el modulo sin
-- borrar la fila, asi que la caducidad no necesita ningun proceso que la barra.

CREATE OR REPLACE FUNCTION fluxion.grant_trial_modules() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = fluxion, public
    AS $$
BEGIN
  INSERT INTO fluxion.organization_modules
              (organization_id, module_key, status, licensed_until)
  SELECT NEW.id, m.k, 'trial', (CURRENT_DATE + INTERVAL '30 days')::date
    FROM (VALUES ('connector-mlflow'), ('shadow-ai'), ('telemetry'),
                 ('doc-engine'), ('hitl')) AS m(k)
  ON CONFLICT (organization_id, module_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_organization_created_grant_trial ON fluxion.organizations;

CREATE TRIGGER on_organization_created_grant_trial
  AFTER INSERT ON fluxion.organizations
  FOR EACH ROW
  EXECUTE FUNCTION fluxion.grant_trial_modules();


-- Organizaciones ya existentes que se quedaron sin ningun modulo. Las que ya
-- tengan alguno no se tocan: puede ser una concesion deliberada.

INSERT INTO fluxion.organization_modules
            (organization_id, module_key, status, licensed_until)
SELECT o.id, m.k, 'trial', (CURRENT_DATE + INTERVAL '30 days')::date
  FROM fluxion.organizations o
  CROSS JOIN (VALUES ('connector-mlflow'), ('shadow-ai'), ('telemetry'),
                     ('doc-engine'), ('hitl')) AS m(k)
 WHERE NOT EXISTS (
         SELECT 1 FROM fluxion.organization_modules om
          WHERE om.organization_id = o.id
       )
ON CONFLICT (organization_id, module_key) DO NOTHING;
