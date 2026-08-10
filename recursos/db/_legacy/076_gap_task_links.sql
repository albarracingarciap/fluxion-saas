-- ============================================================================
-- FLUXION — 076: tabla task_gap_links + source_type 'gap_group'
-- ============================================================================
-- Habilita la integración bidireccional entre el módulo de gaps y el de tareas:
--   · source_type 'gap_group' para tareas-paraguas que cubren un grupo entero
--   · task_gap_links relaciona cualquier tarea gap/gap_group con los gaps individuales
--     que cubre, permitiendo lookup inverso (gap → tarea) y cierre tracking
-- ============================================================================

-- 1. Extender el CHECK constraint de source_type para incluir 'gap_group'
ALTER TABLE fluxion.tasks
  DROP CONSTRAINT IF EXISTS tasks_source_type_check;

ALTER TABLE fluxion.tasks
  ADD CONSTRAINT tasks_source_type_check
  CHECK (source_type IN (
    'manual',
    'treatment_action',
    'gap',
    'evaluation',
    'fmea_item',
    'gap_group'
  ));

-- 2. Tabla de vínculos gap ↔ tarea
CREATE TABLE fluxion.task_gap_links (
  task_id       uuid  NOT NULL REFERENCES fluxion.tasks(id) ON DELETE CASCADE,
  gap_key       text  NOT NULL,   -- UnifiedGapRecord.key (clave estable compuesta)
  group_key     text,             -- GapGroupRecord.group_id (solo para tareas paraguas)
  gap_layer     text  NOT NULL,
  gap_source_id uuid,             -- UnifiedGapRecord.id (UUID del registro origen)
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, gap_key)
);

CREATE INDEX task_gap_links_gap_source_id_idx ON fluxion.task_gap_links (gap_source_id);
CREATE INDEX task_gap_links_group_key_idx     ON fluxion.task_gap_links (group_key);
CREATE INDEX task_gap_links_task_id_idx       ON fluxion.task_gap_links (task_id);

-- 3. RLS
ALTER TABLE fluxion.task_gap_links ENABLE ROW LEVEL SECURITY;

-- Visible si la tarea vinculada es visible para el usuario (hereda RLS de tasks)
CREATE POLICY "task_gap_links_select" ON fluxion.task_gap_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fluxion.tasks t
      WHERE t.id = task_gap_links.task_id
    )
  );

CREATE POLICY "task_gap_links_insert" ON fluxion.task_gap_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM fluxion.tasks t
      WHERE t.id = task_gap_links.task_id
    )
  );

CREATE POLICY "task_gap_links_delete" ON fluxion.task_gap_links
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM fluxion.tasks t
      WHERE t.id = task_gap_links.task_id
    )
  );

-- 4. Grants
GRANT SELECT, INSERT, DELETE ON fluxion.task_gap_links TO authenticated;
GRANT SELECT                  ON fluxion.task_gap_links TO anon;
