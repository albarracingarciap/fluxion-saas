-- ============================================================================
-- FLUXION — Notificaciones in-app
-- Tabla genérica para notificaciones in-app. Diseñada para ser extensible
-- a otros módulos (evaluaciones, gaps, planes) más allá de tareas.
-- Inserción solo via service_role desde server actions.
-- ============================================================================

CREATE TABLE fluxion.notifications (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id     uuid        NOT NULL REFERENCES fluxion.profiles(id) ON DELETE CASCADE,
  organization_id  uuid        NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  -- Tipo de evento: task_assigned | mention | comment_added | status_changed |
  --                 attachment_added | task_overdue | plan_pending_approval |
  --                 plan_decision | review_due | evidence_expiring
  type             text        NOT NULL,

  title            text        NOT NULL,
  body             text,
  link_url         text,

  -- Referencia al recurso relacionado (extensible)
  related_task_id  uuid        REFERENCES fluxion.tasks(id) ON DELETE SET NULL,

  metadata         jsonb,
  read_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE fluxion.notifications IS
  'Notificaciones in-app para miembros del workspace. '
  'Genérica: type distingue el módulo origen. '
  'Solo service_role puede insertar — los clientes solo leen y marcan como leídas.';

-- ─── ÍNDICES ─────────────────────────────────────────────────────────────────

-- Consulta principal: "mis notificaciones ordenadas por fecha"
CREATE INDEX idx_notifications_recipient
  ON fluxion.notifications(recipient_id, created_at DESC);

-- Consulta rápida de badge: "¿cuántas no leídas tengo?"
CREATE INDEX idx_notifications_unread
  ON fluxion.notifications(recipient_id)
  WHERE read_at IS NULL;

-- Trazabilidad: todas las notificaciones de una tarea
CREATE INDEX idx_notifications_task
  ON fluxion.notifications(related_task_id)
  WHERE related_task_id IS NOT NULL;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.notifications ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo ve sus propias notificaciones
CREATE POLICY "notifications_select"
  ON fluxion.notifications FOR SELECT
  USING (
    recipient_id IN (SELECT id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

-- El propio usuario puede marcar como leída (UPDATE read_at)
CREATE POLICY "notifications_update"
  ON fluxion.notifications FOR UPDATE
  USING (
    recipient_id IN (SELECT id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

-- ─── GRANTS ──────────────────────────────────────────────────────────────────

GRANT SELECT, UPDATE ON fluxion.notifications TO authenticated;
GRANT ALL             ON fluxion.notifications TO service_role;
