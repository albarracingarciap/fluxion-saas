-- ============================================================================
-- FLUXION — Activity log por tarea
-- Registro cronológico de cambios en una tarea: estado, asignado, fecha límite,
-- prioridad, comentarios y adjuntos. Distinto de fluxion.audit_log (global/admin).
-- Alimentado desde server actions (no trigger), con service_role.
-- ============================================================================

CREATE TABLE fluxion.task_activity_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid        NOT NULL REFERENCES fluxion.tasks(id) ON DELETE CASCADE,
  actor_id    uuid        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  -- Valores: created | status_changed | assignee_changed | due_date_changed |
  --          priority_changed | title_changed | comment_added | comment_edited |
  --          attachment_added | attachment_deleted | watcher_added
  action      text        NOT NULL,
  field       text,
  old_value   jsonb,
  new_value   jsonb,
  metadata    jsonb,       -- datos extra (ej. nombre del archivo adjunto)
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE fluxion.task_activity_log IS
  'Timeline de actividad por tarea. Solo lectura desde el cliente; '
  'se inserta únicamente via service_role desde server actions.';

-- ─── ÍNDICES ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_task_activity_task
  ON fluxion.task_activity_log(task_id, created_at DESC);

CREATE INDEX idx_task_activity_actor
  ON fluxion.task_activity_log(actor_id)
  WHERE actor_id IS NOT NULL;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.task_activity_log ENABLE ROW LEVEL SECURITY;

-- Miembros de la org pueden leer el log de sus tareas (solo lectura)
CREATE POLICY "task_activity_select"
  ON fluxion.task_activity_log FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM fluxion.tasks
      WHERE organization_id IN (
        SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- ─── GRANTS ──────────────────────────────────────────────────────────────────

GRANT SELECT ON fluxion.task_activity_log TO authenticated;
GRANT ALL    ON fluxion.task_activity_log TO service_role;
