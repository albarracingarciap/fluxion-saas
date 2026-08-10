-- ============================================================================
-- FLUXION — 074: source_type 'fmea_item' para tareas de evaluación FMEA
-- ============================================================================
-- Extiende el CHECK constraint de fluxion.tasks para permitir source_type
-- = 'fmea_item', habilitando la delegación de modos de fallo individuales
-- como tareas asignables desde la vista de evaluación FMEA.
-- ============================================================================

-- Eliminar el constraint previo (generado inline en 072)
ALTER TABLE fluxion.tasks
  DROP CONSTRAINT IF EXISTS tasks_source_type_check;

-- Añadir constraint extendido con 'fmea_item'
ALTER TABLE fluxion.tasks
  ADD CONSTRAINT tasks_source_type_check
  CHECK (source_type IN ('manual', 'treatment_action', 'gap', 'evaluation', 'fmea_item'));
