-- ============================================================================
-- Cese del uso de una práctica prohibida y clasificación del proveedor (B27)
-- ============================================================================
--   Parciales del informe del flujo de trabajo (docs/producto/informe-flujo-
--   trabajo-ia.md, fase 1):
--     1.2 una práctica prohibida no se puede usar: hace falta la tarea de cese
--         del uso, no solo el bloqueo de Producción y Piloto (B18b);
--     1.3 el responsable del despliegue puede discrepar de la clasificación del
--         proveedor (por ejemplo, si este aplica la excepción del Art. 6.3), y
--         conviene que quede constancia (fase 4).
--
--   Decisiones del responsable (2026-10-28):
--     - la tarea «Cesar el uso» se crea sola mientras el sistema sea práctica
--       prohibida y no esté Retirado, y se completa sola al retirarlo o si deja
--       de serlo tras reclasificarlo;
--     - se registra el nivel que declara el proveedor; si no coincide con el
--       nuestro, la discrepancia exige un motivo y puede constar cuándo se
--       comunicó al proveedor.
--
-- Idempotente.
-- ============================================================================

-- ── 1. Clasificación declarada por el proveedor ────────────────────────────

ALTER TABLE fluxion.ai_systems
  -- prohibited, high, high_art63 (alto riesgo del Anexo III que el proveedor
  -- considera no de alto riesgo por el Art. 6.3), limited, minimal.
  ADD COLUMN IF NOT EXISTS provider_declared_level text,
  ADD COLUMN IF NOT EXISTS provider_classification_notes text,
  ADD COLUMN IF NOT EXISTS provider_disagreement_reason text,
  ADD COLUMN IF NOT EXISTS provider_disagreement_notified_at date,
  ADD COLUMN IF NOT EXISTS provider_classification_updated_at timestamptz;

ALTER TABLE fluxion.ai_systems DROP CONSTRAINT IF EXISTS ai_systems_provider_declared_level_check;
ALTER TABLE fluxion.ai_systems ADD CONSTRAINT ai_systems_provider_declared_level_check
  CHECK (provider_declared_level IS NULL
         OR provider_declared_level IN ('prohibited', 'high', 'high_art63', 'limited', 'minimal'));

COMMENT ON COLUMN fluxion.ai_systems.provider_declared_level IS
  'Nivel AI Act que declara el proveedor (B27). high_art63: el proveedor lo considera no de alto riesgo por el Art. 6.3.';
COMMENT ON COLUMN fluxion.ai_systems.provider_disagreement_reason IS
  'Por qué la organización discrepa de la clasificación del proveedor; obligatorio si no coinciden (B27).';

-- ── 2. Tareas: admitir origen 'cease_use' ──────────────────────────────────

ALTER TABLE fluxion.tasks DROP CONSTRAINT IF EXISTS tasks_source_type_check;
ALTER TABLE fluxion.tasks ADD CONSTRAINT tasks_source_type_check
  CHECK (source_type IN (
    'manual', 'treatment_action', 'gap', 'evaluation',
    'fmea_item', 'gap_group', 'signal', 'incident', 'authority_request', 'reevaluation',
    'annual_report', 'cease_use'
  ));
