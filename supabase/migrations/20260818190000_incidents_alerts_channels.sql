-- ============================================================================
-- Avisos de incidentes: canales de chat y control del reloj
-- ============================================================================
-- El plazo del artículo 73 no sirve de nada si nadie lo mira. Estas tres tablas
-- son lo que convierte una fecha en una alarma:
--
--   notification_channels     dónde avisar (Slack, Teams)
--   channel_deliveries        qué se envió y si llegó
--   incident_deadline_alerts  qué umbral ya se avisó, para no repetir
--
-- El registro de entregas no es opcional. Un aviso que se pierde en silencio es
-- peor que no tener avisos: la organización cree que la avisarían y no es cierto.
-- La tabla `webhooks` que existe desde abril no lleva registro de intentos —
-- esta sí.
-- ============================================================================

-- ── Canales ─────────────────────────────────────────────────────────────────

CREATE TYPE fluxion.channel_type AS ENUM ('slack', 'teams');

CREATE TABLE fluxion.notification_channels (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  channel_type    fluxion.channel_type NOT NULL,
  name            text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),

  -- La URL de un webhook entrante de Slack o Teams ES una credencial: quien la
  -- tiene puede publicar en ese canal. Va cifrada en Vault, nunca en claro.
  secret_id       uuid,

  -- Eventos a los que está suscrito. Vacío = todos.
  events          text[]      NOT NULL DEFAULT '{}',

  is_active       boolean     NOT NULL DEFAULT true,
  last_success_at timestamptz,
  last_error_at   timestamptz,
  last_error      text,

  created_by      uuid        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_channel_name UNIQUE (organization_id, name)
);

COMMENT ON TABLE fluxion.notification_channels IS
  'Canales de chat a los que Fluxion envía avisos. Distinto de fluxion.webhooks, '
  'que es para integraciones genéricas firmadas con HMAC.';

CREATE INDEX idx_channels_org ON fluxion.notification_channels (organization_id, is_active);

CREATE TRIGGER trg_channels_updated_at
  BEFORE UPDATE ON fluxion.notification_channels
  FOR EACH ROW EXECUTE FUNCTION fluxion.update_updated_at();

-- ── Envoltorios de Vault para la URL del canal ──────────────────────────────
-- Mismo patrón que los conectores: por canal, no por id de secreto, para que
-- estas funciones no puedan leer cualquier secreto del Vault.

CREATE OR REPLACE FUNCTION fluxion.channel_secret_set(
  p_channel_id uuid,
  p_value      text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = fluxion, vault, public
AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  SELECT secret_id INTO v_secret_id
  FROM fluxion.notification_channels WHERE id = p_channel_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'canal % inexistente', p_channel_id;
  END IF;

  IF v_secret_id IS NULL THEN
    v_secret_id := vault.create_secret(
      p_value,
      'channel:' || p_channel_id::text,
      'URL de webhook de canal de Fluxion'
    );
    UPDATE fluxion.notification_channels SET secret_id = v_secret_id WHERE id = p_channel_id;
  ELSE
    PERFORM vault.update_secret(v_secret_id, p_value);
  END IF;

  RETURN v_secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION fluxion.channel_secret_get(p_channel_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = fluxion, vault, public
AS $$
DECLARE
  v_secret_id uuid;
  v_value     text;
BEGIN
  SELECT secret_id INTO v_secret_id
  FROM fluxion.notification_channels WHERE id = p_channel_id;

  IF v_secret_id IS NULL THEN RETURN NULL; END IF;

  SELECT decrypted_secret INTO v_value FROM vault.decrypted_secrets WHERE id = v_secret_id;
  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION fluxion.channel_secret_cleanup()
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

CREATE TRIGGER trg_channel_secret_cleanup
  AFTER DELETE ON fluxion.notification_channels
  FOR EACH ROW EXECUTE FUNCTION fluxion.channel_secret_cleanup();

REVOKE ALL ON FUNCTION fluxion.channel_secret_set(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION fluxion.channel_secret_get(uuid)       FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fluxion.channel_secret_set(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION fluxion.channel_secret_get(uuid)       TO service_role;

-- ── Registro de entregas ────────────────────────────────────────────────────

CREATE TABLE fluxion.channel_deliveries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  channel_id      uuid        REFERENCES fluxion.notification_channels(id) ON DELETE SET NULL,

  event_type      text        NOT NULL,   -- 'incident.created', 'incident.deadline_50'…
  subject_type    text,                   -- 'incident'
  subject_id      uuid,

  payload         jsonb       NOT NULL DEFAULT '{}',

  status          text        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sent', 'failed', 'abandoned')),
  attempts        integer     NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  http_status     integer,
  last_error      text,
  sent_at         timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE fluxion.channel_deliveries IS
  'Un intento de envío por fila. Los pendientes se reintentan en la siguiente '
  'pasada del cron; tras varios fallos pasan a abandoned y quedan a la vista.';

-- Consulta del cron: lo que queda por entregar
CREATE INDEX idx_deliveries_pending
  ON fluxion.channel_deliveries (organization_id, created_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX idx_deliveries_subject
  ON fluxion.channel_deliveries (subject_type, subject_id, created_at DESC);

-- ── Control de umbrales del reloj ───────────────────────────────────────────
-- Sin esto, un cron horario avisaría cada hora del mismo plazo.

CREATE TABLE fluxion.incident_deadline_alerts (
  incident_id uuid        NOT NULL REFERENCES fluxion.ai_incidents(id) ON DELETE CASCADE,

  -- 'half'    · consumido el 50 % del plazo
  -- 'urgent'  · consumido el 80 %
  -- 'overdue' · vencido sin notificar
  threshold   text        NOT NULL CHECK (threshold IN ('half', 'urgent', 'overdue')),

  sent_at     timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (incident_id, threshold)
);

COMMENT ON TABLE fluxion.incident_deadline_alerts IS
  'Idempotencia de los avisos del reloj: un umbral se avisa una sola vez por '
  'incidente. Mismo principio que dedupe_key en las señales.';

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.notification_channels    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.channel_deliveries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.incident_deadline_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY channels_select ON fluxion.notification_channels
  FOR SELECT USING (
    organization_id IN (
      SELECT profiles.organization_id FROM fluxion.profiles
      WHERE profiles.user_id = auth.uid()
    )
  );

-- Configurar dónde se avisa es administración.
CREATE POLICY channels_write ON fluxion.notification_channels
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

-- El registro de entregas es evidencia: se lee, no se toca.
CREATE POLICY deliveries_select ON fluxion.channel_deliveries
  FOR SELECT USING (
    organization_id IN (
      SELECT profiles.organization_id FROM fluxion.profiles
      WHERE profiles.user_id = auth.uid()
    )
  );

CREATE POLICY deadline_alerts_select ON fluxion.incident_deadline_alerts
  FOR SELECT USING (
    incident_id IN (
      SELECT i.id FROM fluxion.ai_incidents i
      JOIN fluxion.profiles p ON p.organization_id = i.organization_id
      WHERE p.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.notification_channels    TO authenticated;
GRANT SELECT                          ON fluxion.channel_deliveries       TO authenticated;
GRANT SELECT                          ON fluxion.incident_deadline_alerts TO authenticated;

GRANT ALL ON fluxion.notification_channels    TO service_role;
GRANT ALL ON fluxion.channel_deliveries       TO service_role;
GRANT ALL ON fluxion.incident_deadline_alerts TO service_role;
