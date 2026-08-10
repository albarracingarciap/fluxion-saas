-- 098: task_checklist_items
-- Ítems de checklist vinculados a tareas individuales

CREATE TABLE IF NOT EXISTS fluxion.task_checklist_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      uuid        NOT NULL REFERENCES fluxion.tasks(id) ON DELETE CASCADE,
  label        text        NOT NULL,
  completed    boolean     NOT NULL DEFAULT false,
  completed_by uuid        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  position     integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_checklist_task_id ON fluxion.task_checklist_items (task_id);

-- updated_at automático
CREATE OR REPLACE FUNCTION fluxion.set_task_checklist_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS task_checklist_items_updated_at ON fluxion.task_checklist_items;
CREATE TRIGGER task_checklist_items_updated_at
  BEFORE UPDATE ON fluxion.task_checklist_items
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_task_checklist_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.task_checklist_items ENABLE ROW LEVEL SECURITY;

-- Política única: los miembros de la organización gestionan los ítems
-- de las tareas que pertenecen a su organización
CREATE POLICY task_checklist_items_all ON fluxion.task_checklist_items
  FOR ALL USING (
    task_id IN (
      SELECT id FROM fluxion.tasks
      WHERE organization_id = (
        SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
      )
    )
  );
