-- 088 · API Keys y Webhooks
-- API Keys: autenticación machine-to-machine con scope y expiración.
-- Webhooks: notificaciones push a sistemas externos por tipo de evento.

-- ── API Keys ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.api_keys (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  key_prefix      text        NOT NULL,   -- primeros 12 caracteres, visible en UI
  key_hash        text        NOT NULL,   -- SHA-256 de la clave completa
  scopes          text[]      NOT NULL DEFAULT '{}',
  expires_at      timestamptz,            -- NULL = no expira
  created_by      uuid        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  last_used_at    timestamptz,
  revoked_at      timestamptz,            -- NULL = activa
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org
  ON fluxion.api_keys (organization_id, created_at DESC);

ALTER TABLE fluxion.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org admins can manage api keys"
  ON fluxion.api_keys
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid() AND role = 'org_admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid() AND role = 'org_admin'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.api_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.api_keys TO service_role;

COMMENT ON TABLE fluxion.api_keys IS
  'Claves API para acceso machine-to-machine. La clave completa nunca se almacena, solo su hash SHA-256.';

-- ── Webhooks ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.webhooks (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  url             text        NOT NULL,
  secret          text        NOT NULL,   -- secreto HMAC para verificar firma (mostrado solo en creación)
  events          text[]      NOT NULL DEFAULT '{}',
  is_active       boolean     NOT NULL DEFAULT true,
  created_by      uuid        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  last_triggered_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org
  ON fluxion.webhooks (organization_id, created_at DESC);

ALTER TABLE fluxion.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org admins can manage webhooks"
  ON fluxion.webhooks
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid() AND role = 'org_admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid() AND role = 'org_admin'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.webhooks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.webhooks TO service_role;

COMMENT ON TABLE fluxion.webhooks IS
  'Endpoints de notificación push. El secreto HMAC se usa para firmar el payload (X-Fluxion-Signature).';
