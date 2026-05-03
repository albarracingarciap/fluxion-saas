-- 096_kanban_wip_limits.sql
-- Añade límites WIP (Work In Progress) por columna Kanban a la organización.
-- Formato: { "in_progress": 5, "in_review": 3 }
-- Valor 0 o ausencia = sin límite.

ALTER TABLE fluxion.organizations
  ADD COLUMN IF NOT EXISTS kanban_wip_limits jsonb NOT NULL DEFAULT '{}';

COMMENT ON COLUMN fluxion.organizations.kanban_wip_limits IS
  'WIP limits per Kanban column. Keys = TaskStatus values. 0 or missing = no limit.';
