-- ============================================================================
-- FLUXION — Comentarios en tareas
-- Permite a los miembros del workspace comentar en tareas y mencionar @usuarios.
-- Los comentarios usan soft-delete (deleted_at) para preservar el hilo.
-- ============================================================================

CREATE TABLE fluxion.task_comments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid        NOT NULL REFERENCES fluxion.tasks(id) ON DELETE CASCADE,
  author_id   uuid        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  body        text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  mentions    uuid[]      NOT NULL DEFAULT '{}',  -- profile IDs mencionados
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  edited_at   timestamptz,
  deleted_at  timestamptz  -- soft delete
);

COMMENT ON TABLE fluxion.task_comments IS
  'Comentarios por tarea. Soft-delete: deleted_at != NULL oculta el cuerpo pero preserva el hilo.';

COMMENT ON COLUMN fluxion.task_comments.mentions IS
  'Array de profiles.id mencionados con @usuario en el cuerpo del comentario.';

-- ─── ÍNDICES ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_task_comments_task
  ON fluxion.task_comments(task_id, created_at)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_task_comments_author
  ON fluxion.task_comments(author_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_task_comments_mentions
  ON fluxion.task_comments USING GIN (mentions)
  WHERE deleted_at IS NULL;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.task_comments ENABLE ROW LEVEL SECURITY;

-- Cualquier miembro de la org puede leer comentarios de sus tareas
CREATE POLICY "task_comments_select"
  ON fluxion.task_comments FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM fluxion.tasks
      WHERE organization_id IN (
        SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Cualquier miembro puede insertar
CREATE POLICY "task_comments_insert"
  ON fluxion.task_comments FOR INSERT
  WITH CHECK (
    author_id IN (SELECT id FROM fluxion.profiles WHERE user_id = auth.uid())
    AND task_id IN (
      SELECT id FROM fluxion.tasks
      WHERE organization_id IN (
        SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Solo el autor puede editar su propio comentario
CREATE POLICY "task_comments_update"
  ON fluxion.task_comments FOR UPDATE
  USING (
    author_id IN (SELECT id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

-- ─── GRANTS ──────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON fluxion.task_comments TO authenticated;
GRANT ALL                     ON fluxion.task_comments TO service_role;
