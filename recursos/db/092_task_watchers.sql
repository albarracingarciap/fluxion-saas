-- ============================================================================
-- FLUXION — Seguidores de tareas (watchers)
-- Usuarios que reciben notificaciones sobre cambios en una tarea concreta.
-- Auto-watchers: creador y asignado se añaden al crear/asignar una tarea.
-- Manual: cualquier miembro puede seguir/dejar de seguir.
-- ============================================================================

CREATE TABLE fluxion.task_watchers (
  task_id     uuid        NOT NULL REFERENCES fluxion.tasks(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES fluxion.profiles(id) ON DELETE CASCADE,
  source      text        NOT NULL DEFAULT 'manual'
              CHECK (source IN ('auto', 'manual')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

COMMENT ON TABLE fluxion.task_watchers IS
  'Seguidores de una tarea. source=auto: creador/asignado añadido automáticamente. '
  'source=manual: el usuario optó por seguir la tarea.';

-- ─── ÍNDICES ─────────────────────────────────────────────────────────────────

-- Consulta principal: "tareas que sigo" desde un perfil
CREATE INDEX idx_task_watchers_user
  ON fluxion.task_watchers(user_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.task_watchers ENABLE ROW LEVEL SECURITY;

-- Miembros de la org ven quién sigue sus tareas
CREATE POLICY "task_watchers_select"
  ON fluxion.task_watchers FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM fluxion.tasks
      WHERE organization_id IN (
        SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Cualquier miembro puede añadir watchers a tareas de su org
CREATE POLICY "task_watchers_insert"
  ON fluxion.task_watchers FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT id FROM fluxion.tasks
      WHERE organization_id IN (
        SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Solo el propio usuario puede eliminarse a sí mismo, o admin puede eliminar cualquiera
CREATE POLICY "task_watchers_delete"
  ON fluxion.task_watchers FOR DELETE
  USING (
    user_id IN (SELECT id FROM fluxion.profiles WHERE user_id = auth.uid())
    OR task_id IN (
      SELECT t.id FROM fluxion.tasks t
      JOIN fluxion.profiles p ON p.organization_id = t.organization_id
      WHERE p.user_id = auth.uid()
        AND p.role IN ('org_admin', 'sgai_manager', 'caio')
    )
  );

-- ─── GRANTS ──────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, DELETE ON fluxion.task_watchers TO authenticated;
GRANT ALL                     ON fluxion.task_watchers TO service_role;
