-- ============================================================================
-- Conectores: configuración y estado
-- ============================================================================
-- Hasta ahora el conector de MLflow se configuraba en variables de entorno de
-- Dokploy. Eso sirve para el operador de la plataforma, no para el cliente: no
-- puede cambiar la URL de su MLflow, ni ver si la sincronización va bien, ni
-- saber cuándo fue la última.
--
-- Con esto la configuración pasa a la aplicación y el estado se hace visible.
-- En el entorno del contenedor solo quedan las credenciales de arranque
-- (FLUXION_API_URL y FLUXION_API_KEY), que por necesidad no pueden estar en la
-- base de datos a la que sirven para acceder.
--
-- IMPORTANTE: esta migración debe aplicarse con `supabase_admin` (que es lo que
-- hace /root/migrate.sh). Las funciones envoltorio de Vault son SECURITY
-- DEFINER y necesitan a ese propietario para poder leer vault.decrypted_secrets.
-- ============================================================================

-- ── Conexiones ──────────────────────────────────────────────────────────────

CREATE TABLE fluxion.connector_connections (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  connector_type        text        NOT NULL CHECK (connector_type IN ('mlflow')),
  name                  text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  base_url              text        NOT NULL,

  auth_type             text        NOT NULL DEFAULT 'none'
                          CHECK (auth_type IN ('none', 'basic')),
  username              text,
  -- Referencia a vault.secrets. La contraseña NUNCA se guarda aquí en claro ni
  -- se devuelve por la API de configuración salvo al propio conector.
  secret_id             uuid,

  poll_interval_seconds integer     NOT NULL DEFAULT 900 CHECK (poll_interval_seconds >= 60),
  is_active             boolean     NOT NULL DEFAULT true,

  -- Desnormalizado para pintar el estado sin subconsulta en cada render
  last_sync_at          timestamptz,
  last_sync_status      text        CHECK (last_sync_status IN ('ok', 'error', 'partial')),

  created_by            uuid        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_connector_name UNIQUE (organization_id, connector_type, name)
);

COMMENT ON TABLE fluxion.connector_connections IS
  'Instancias externas con las que sincroniza un conector. Una organización '
  'puede tener varias del mismo tipo; el conector las atiende todas.';

CREATE INDEX idx_connector_connections_org
  ON fluxion.connector_connections (organization_id, connector_type);

CREATE TRIGGER trg_connector_connections_updated_at
  BEFORE UPDATE ON fluxion.connector_connections
  FOR EACH ROW EXECUTE FUNCTION fluxion.update_updated_at();

-- ── Historial de sincronizaciones ───────────────────────────────────────────

CREATE TABLE fluxion.connector_sync_runs (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid        NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  connection_id      uuid        REFERENCES fluxion.connector_connections(id) ON DELETE CASCADE,
  connector_type     text        NOT NULL,

  started_at         timestamptz NOT NULL,
  finished_at        timestamptz NOT NULL DEFAULT now(),
  status             text        NOT NULL CHECK (status IN ('ok', 'error', 'partial')),

  -- Entidades principales vistas en el origen (modelos, repositorios…).
  -- Los contadores propios de cada conector van en `details`.
  objects_seen       integer     NOT NULL DEFAULT 0,
  signals_published  integer     NOT NULL DEFAULT 0,
  signals_duplicated integer     NOT NULL DEFAULT 0,
  signals_rejected   integer     NOT NULL DEFAULT 0,

  details            jsonb       NOT NULL DEFAULT '{}',
  error_message      text,

  created_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE fluxion.connector_sync_runs IS
  'Una fila por pasada de un conector. Es lo que permite responder "¿está '
  'funcionando?" sin entrar en los logs del contenedor.';

CREATE INDEX idx_connector_runs_connection
  ON fluxion.connector_sync_runs (connection_id, started_at DESC);

CREATE INDEX idx_connector_runs_org
  ON fluxion.connector_sync_runs (organization_id, started_at DESC);

-- ── Envoltorios de Vault ────────────────────────────────────────────────────
-- Se exponen por conexión y no por id de secreto a propósito: así estas
-- funciones no pueden usarse para leer cualquier secreto del Vault, solo el que
-- pertenece a una conexión concreta.

CREATE OR REPLACE FUNCTION fluxion.connector_secret_set(
  p_connection_id uuid,
  p_value         text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = fluxion, vault, public
AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  SELECT secret_id INTO v_secret_id
  FROM fluxion.connector_connections
  WHERE id = p_connection_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'conexión % inexistente', p_connection_id;
  END IF;

  IF v_secret_id IS NULL THEN
    v_secret_id := vault.create_secret(
      p_value,
      'connector:' || p_connection_id::text,
      'Credencial de conector de Fluxion'
    );
    UPDATE fluxion.connector_connections
    SET secret_id = v_secret_id
    WHERE id = p_connection_id;
  ELSE
    PERFORM vault.update_secret(v_secret_id, p_value);
  END IF;

  RETURN v_secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION fluxion.connector_secret_get(
  p_connection_id uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = fluxion, vault, public
AS $$
DECLARE
  v_secret_id uuid;
  v_value     text;
BEGIN
  SELECT secret_id INTO v_secret_id
  FROM fluxion.connector_connections
  WHERE id = p_connection_id;

  IF v_secret_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_value
  FROM vault.decrypted_secrets
  WHERE id = v_secret_id;

  RETURN v_value;
END;
$$;

-- Al borrar una conexión, su secreto no debe quedar huérfano en el Vault.
CREATE OR REPLACE FUNCTION fluxion.connector_secret_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = fluxion, vault, public
AS $$
BEGIN
  IF OLD.secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = OLD.secret_id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_connector_secret_cleanup
  AFTER DELETE ON fluxion.connector_connections
  FOR EACH ROW EXECUTE FUNCTION fluxion.connector_secret_cleanup();

-- Solo el backend puede tocar secretos. Ni `anon` ni `authenticated`: la
-- interfaz escribe la contraseña a través de una server action con service_role,
-- y nunca necesita leerla de vuelta.
REVOKE ALL ON FUNCTION fluxion.connector_secret_set(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION fluxion.connector_secret_get(uuid)       FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fluxion.connector_secret_set(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION fluxion.connector_secret_get(uuid)       TO service_role;

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.connector_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.connector_sync_runs   ENABLE ROW LEVEL SECURITY;

CREATE POLICY connector_connections_select ON fluxion.connector_connections
  FOR SELECT USING (
    organization_id IN (
      SELECT profiles.organization_id FROM fluxion.profiles
      WHERE profiles.user_id = auth.uid()
    )
  );

-- Configurar una integración externa es una acción de administración.
CREATE POLICY connector_connections_write ON fluxion.connector_connections
  FOR ALL USING (
    organization_id IN (
      SELECT profiles.organization_id FROM fluxion.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = ANY (ARRAY[
          'org_admin'::fluxion.org_role,
          'sgai_manager'::fluxion.org_role
        ])
    )
  );

CREATE POLICY connector_sync_runs_select ON fluxion.connector_sync_runs
  FOR SELECT USING (
    organization_id IN (
      SELECT profiles.organization_id FROM fluxion.profiles
      WHERE profiles.user_id = auth.uid()
    )
  );

-- Sin política de INSERT: las pasadas solo las reporta el conector con su clave
-- API, escribiendo con service_role.

GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.connector_connections TO authenticated;
GRANT SELECT                          ON fluxion.connector_sync_runs   TO authenticated;
GRANT ALL ON fluxion.connector_connections TO service_role;
GRANT ALL ON fluxion.connector_sync_runs   TO service_role;
