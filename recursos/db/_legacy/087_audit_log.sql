-- 087 · Registro de auditoría de actividad (audit_log)
-- Tabla central de trazabilidad ISO 42001: registra todas las acciones
-- relevantes realizadas por actores sobre recursos de la organización.

CREATE TABLE IF NOT EXISTS fluxion.audit_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  actor_id        uuid        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  actor_name      text,                         -- denormalizado: persiste aunque el actor sea eliminado
  actor_email     text,
  action          text        NOT NULL,          -- e.g. 'member.invited', 'org.settings_updated'
  target_type     text,                          -- 'member' | 'invitation' | 'organization' | 'committee' | 'session'
  target_id       text,                          -- UUID o identificador del recurso afectado
  target_label    text,                          -- nombre legible del recurso (email, nombre, etc.)
  metadata        jsonb,                         -- contexto adicional (prev_role, new_role, count, etc.)
  ip_address      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Índice principal: búsquedas por organización ordenadas por tiempo (paginación)
CREATE INDEX IF NOT EXISTS idx_audit_log_org_time
  ON fluxion.audit_log (organization_id, created_at DESC);

-- Índice secundario: filtrar por actor
CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON fluxion.audit_log (actor_id, created_at DESC);

-- Índice para filtrar por tipo de acción dentro de una org
CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON fluxion.audit_log (organization_id, action, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.audit_log ENABLE ROW LEVEL SECURITY;

-- Solo administradores de la organización pueden leer el log
CREATE POLICY "org admins can read audit log"
  ON fluxion.audit_log FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid() AND role = 'org_admin'
    )
  );

-- Las inserciones se hacen siempre desde server actions con service_role
-- (bypass de RLS), por lo que no se necesita política de INSERT para authenticated.

-- ── Grants ────────────────────────────────────────────────────────────────────

GRANT SELECT          ON fluxion.audit_log TO authenticated;
GRANT INSERT, SELECT  ON fluxion.audit_log TO service_role;

-- ── Comentarios ───────────────────────────────────────────────────────────────

COMMENT ON TABLE fluxion.audit_log IS
  'Registro de auditoría de actividad de la plataforma. Requerido por ISO 42001 cláusula 9.2 y A.6.2.6.';

COMMENT ON COLUMN fluxion.audit_log.action IS
  'Formato: <dominio>.<verbo> — e.g. member.invited, org.settings_updated, session.revoked';

COMMENT ON COLUMN fluxion.audit_log.actor_name IS
  'Nombre del actor en el momento del evento. Denormalizado para persistencia.';
