-- ============================================================================
-- Identificación biométrica remota en diferido (B21c)
-- ============================================================================
--   Informe del flujo de trabajo (docs/producto/informe-flujo-trabajo-ia.md,
--   3.5): el responsable del despliegue de un sistema de identificación
--   biométrica remota en diferido presenta informes anuales a las autoridades
--   de vigilancia del mercado y de protección de datos (AI Act, Art. 26.10).
--   El supuesto (Anexo III, punto 1.a) estaba en el cuestionario, pero nada
--   distinguía el uso en diferido del de tiempo real ni recordaba el informe.
--
--   Decisión del responsable (2026-10-28): campo nuevo en la ficha; solo con
--   él marcado se crea la tarea anual del informe.
--
-- Idempotente.
-- ============================================================================

ALTER TABLE fluxion.ai_systems
  ADD COLUMN IF NOT EXISTS post_remote_biometric_id boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN fluxion.ai_systems.post_remote_biometric_id IS
  'Identificación biométrica remota en diferido (AI Act, Art. 26.10): solo tiene sentido en alto riesgo del Anexo III, punto 1.a, como responsable del despliegue. Activa la tarea anual del informe (B21c).';

-- Tareas: admitir origen 'annual_report' (informe anual del Art. 26.10).
ALTER TABLE fluxion.tasks DROP CONSTRAINT IF EXISTS tasks_source_type_check;
ALTER TABLE fluxion.tasks ADD CONSTRAINT tasks_source_type_check
  CHECK (source_type IN (
    'manual', 'treatment_action', 'gap', 'evaluation',
    'fmea_item', 'gap_group', 'signal', 'incident', 'authority_request', 'reevaluation',
    'annual_report'
  ));
