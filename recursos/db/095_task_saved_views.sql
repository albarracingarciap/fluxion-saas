-- 095_task_saved_views.sql
-- Vistas guardadas de tareas: filtros, orden y agrupación persistidos por usuario u org.

CREATE TABLE IF NOT EXISTS fluxion.task_saved_views (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  owner_id        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  name            text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  -- 'personal' = solo visible para owner_id; 'shared' = visible para toda la org
  scope           text        NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'shared')),
  filters         jsonb       NOT NULL DEFAULT '{}',
  sort            jsonb       NOT NULL DEFAULT '{}',
  grouping        text        CHECK (grouping IN ('status', 'priority', 'assignee', 'system', 'due_date')),
  is_default      boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Solo una vista default por scope por usuario dentro de una org
CREATE UNIQUE INDEX IF NOT EXISTS uq_task_saved_views_default_personal
  ON fluxion.task_saved_views (organization_id, owner_id)
  WHERE is_default = true AND scope = 'personal';

CREATE UNIQUE INDEX IF NOT EXISTS uq_task_saved_views_default_shared
  ON fluxion.task_saved_views (organization_id)
  WHERE is_default = true AND scope = 'shared';

CREATE INDEX IF NOT EXISTS idx_task_saved_views_org_owner
  ON fluxion.task_saved_views (organization_id, owner_id);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER trg_task_saved_views_updated_at
  BEFORE UPDATE ON fluxion.task_saved_views
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE fluxion.task_saved_views ENABLE ROW LEVEL SECURITY;

-- Ver: personales propias + compartidas de la org
CREATE POLICY "task_saved_views_select" ON fluxion.task_saved_views
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
    )
    AND (
      scope = 'shared'
      OR owner_id = auth.uid()
    )
  );

-- Insertar: miembro activo de la org
CREATE POLICY "task_saved_views_insert" ON fluxion.task_saved_views
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
    )
    AND owner_id = auth.uid()
  );

-- Modificar/borrar: solo el owner
CREATE POLICY "task_saved_views_update" ON fluxion.task_saved_views
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "task_saved_views_delete" ON fluxion.task_saved_views
  FOR DELETE USING (owner_id = auth.uid());

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.task_saved_views TO authenticated;
GRANT ALL ON fluxion.task_saved_views TO service_role;
