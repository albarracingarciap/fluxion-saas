-- 094_tasks_position.sql
-- Agrega columna `position` a fluxion.tasks para ordenación Kanban.
-- Estrategia: gap inicial de 1024 por tarjeta (rebalance cuando gap < 2).

ALTER TABLE fluxion.tasks
  ADD COLUMN IF NOT EXISTS position bigint;

-- Inicializar position para filas existentes usando ROW_NUMBER agrupado
-- por status, de forma que cada columna Kanban tenga su propio orden.
UPDATE fluxion.tasks t
SET position = sub.rn * 1024
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at) AS rn
  FROM fluxion.tasks
) sub
WHERE t.id = sub.id;

-- Las nuevas filas sin position explícito recibirán un valor alto por defecto
-- en la capa de aplicación; aquí dejamos el DEFAULT en null para que el
-- backend lo calcule: MAX(position) + 1024 dentro del mismo status.

-- Índice para ordenación eficiente en queries Kanban
CREATE INDEX IF NOT EXISTS idx_tasks_status_position
  ON fluxion.tasks (organization_id, status, position NULLS LAST);
