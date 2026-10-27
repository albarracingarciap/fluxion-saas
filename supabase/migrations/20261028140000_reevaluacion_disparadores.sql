-- ============================================================================
-- Disparadores de reevaluación (B21a)
-- ============================================================================
--   Plan de resolución de gaps, B21 (GAP-32, decisión 63) e informe del flujo
--   de trabajo (3.4): la fecha de próxima revisión, un incidente grave, un
--   cambio de supuestos AI Act en la ficha y la actualización del catálogo
--   deben abrir una reevaluación del sistema. Hasta ahora no avisaba nada.
--
--   Se reaprovecha `reevaluation_triggers`, que existía sin uso.
--
--   Decisiones del responsable (2026-10-28):
--     - una sola tarea «Reevaluar sistema» abierta por sistema: un disparador
--       nuevo se añade a ella;
--     - cada disparador pide reevaluar según su tipo (`scope`): incidente grave
--       y cambio de supuestos, el FMEA y la FRIA y la AISIA si aplican;
--       revisión del FMEA vencida, el FMEA; catálogo actualizado, la
--       clasificación. Se resuelve al aprobarse lo que pide;
--     - un disparador abierto quita la condición «Vigente» de la etapa.
--
--   Los disparadores los registra la aplicación con service role, por
--   `fluxion.reevaluation_register`, que crea o reutiliza la tarea.
--
-- Idempotente.
-- ============================================================================

-- ── 1. Columnas nuevas ─────────────────────────────────────────────────────

ALTER TABLE fluxion.reevaluation_triggers
  -- Disparador concreto: incidente_grave, supuestos_aiact, revision_fmea, catalogo.
  ADD COLUMN IF NOT EXISTS trigger_key text,
  -- Qué hay que reevaluar: fmea, fria, aisia, clasificacion.
  ADD COLUMN IF NOT EXISTS scope       text[] NOT NULL DEFAULT '{}',
  -- Qué lo originó (id del incidente, de la evaluación, versión de reglas…): evita duplicados.
  ADD COLUMN IF NOT EXISTS source_ref  text,
  ADD COLUMN IF NOT EXISTS task_id     uuid REFERENCES fluxion.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS detected_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution  text,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES fluxion.profiles(id) ON DELETE SET NULL;

-- state: detectado (abierto), resuelto (aprobado lo que pedía) o descartado (con motivo).
ALTER TABLE fluxion.reevaluation_triggers DROP CONSTRAINT IF EXISTS reevaluation_triggers_state_check;
ALTER TABLE fluxion.reevaluation_triggers ADD CONSTRAINT reevaluation_triggers_state_check
  CHECK (state IN ('detectado', 'resuelto', 'descartado')) NOT VALID;

ALTER TABLE fluxion.reevaluation_triggers DROP CONSTRAINT IF EXISTS reevaluation_triggers_scope_check;
ALTER TABLE fluxion.reevaluation_triggers ADD CONSTRAINT reevaluation_triggers_scope_check
  CHECK (scope <@ ARRAY['fmea', 'fria', 'aisia', 'clasificacion']::text[]) NOT VALID;

-- Un mismo disparador (sistema, tipo y origen) solo puede estar abierto una vez.
CREATE UNIQUE INDEX IF NOT EXISTS uq_reevaluation_triggers_abierto
  ON fluxion.reevaluation_triggers (system_id, trigger_key, COALESCE(source_ref, ''))
  WHERE state = 'detectado';
CREATE INDEX IF NOT EXISTS idx_reevaluation_triggers_org ON fluxion.reevaluation_triggers (organization_id, state);

COMMENT ON TABLE fluxion.reevaluation_triggers IS
  'Disparadores de reevaluación de un sistema (decisión 63, B21a): qué lo disparó, qué hay que reevaluar (scope) y la tarea «Reevaluar sistema».';

-- ── 2. RLS: leen los miembros; escribe la aplicación con service role ──────

ALTER TABLE fluxion.reevaluation_triggers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reevaluation_triggers_select ON fluxion.reevaluation_triggers;
CREATE POLICY reevaluation_triggers_select ON fluxion.reevaluation_triggers
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );
REVOKE INSERT, UPDATE, DELETE ON fluxion.reevaluation_triggers FROM authenticated;
GRANT SELECT ON fluxion.reevaluation_triggers TO authenticated;
GRANT ALL ON fluxion.reevaluation_triggers TO service_role;

-- ── 3. Tareas: admitir origen 'reevaluation' ───────────────────────────────

ALTER TABLE fluxion.tasks DROP CONSTRAINT IF EXISTS tasks_source_type_check;
ALTER TABLE fluxion.tasks ADD CONSTRAINT tasks_source_type_check
  CHECK (source_type IN (
    'manual', 'treatment_action', 'gap', 'evaluation',
    'fmea_item', 'gap_group', 'signal', 'incident', 'authority_request', 'reevaluation'
  ));

-- ── 4. Registrar un disparador ─────────────────────────────────────────────
--   Crea el disparador si no está ya abierto y lo asocia a la tarea
--   «Reevaluar sistema» abierta del sistema; si no hay, la crea (origen
--   `reevaluation`, `source_id` = sistema, asignada al Responsable del
--   sistema). Devuelve el id del disparador.

CREATE OR REPLACE FUNCTION fluxion.reevaluation_register(
  p_org         uuid,
  p_system      uuid,
  p_type        fluxion.reevaluation_trigger_type,
  p_key         text,
  p_scope       text[],
  p_source_ref  text,
  p_description text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = fluxion, public
AS $$
DECLARE
  v_id    uuid;
  v_task  uuid;
  v_name  text;
  v_owner uuid;
BEGIN
  SELECT name, owner_profile_id INTO v_name, v_owner
    FROM fluxion.ai_systems WHERE id = p_system AND organization_id = p_org;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Sistema no encontrado en la organización';
  END IF;

  SELECT id INTO v_id FROM fluxion.reevaluation_triggers
   WHERE system_id = p_system AND trigger_key = p_key
     AND COALESCE(source_ref, '') = COALESCE(p_source_ref, '') AND state = 'detectado';
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  SELECT id INTO v_task FROM fluxion.tasks
   WHERE organization_id = p_org AND source_type = 'reevaluation' AND source_id = p_system
     AND status NOT IN ('done', 'cancelled')
   ORDER BY created_at DESC LIMIT 1;

  IF v_task IS NULL THEN
    INSERT INTO fluxion.tasks (organization_id, system_id, title, description, priority, source_type, source_id, assignee_id)
    VALUES (p_org, p_system, left('Reevaluar sistema · ' || v_name, 300), p_description, 'high', 'reevaluation', p_system, v_owner)
    RETURNING id INTO v_task;
  ELSE
    UPDATE fluxion.tasks
       SET description = CASE WHEN COALESCE(description, '') = '' THEN p_description
                              ELSE description || E'\n' || p_description END
     WHERE id = v_task;
  END IF;

  INSERT INTO fluxion.reevaluation_triggers
    (organization_id, system_id, trigger_type, trigger_key, scope, source_ref, description, task_id, state)
  VALUES (p_org, p_system, p_type, p_key, p_scope, p_source_ref, p_description, v_task, 'detectado')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION fluxion.reevaluation_register(uuid, uuid, fluxion.reevaluation_trigger_type, text, text[], text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION fluxion.reevaluation_register(uuid, uuid, fluxion.reevaluation_trigger_type, text, text[], text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION fluxion.reevaluation_register(uuid, uuid, fluxion.reevaluation_trigger_type, text, text[], text, text) TO service_role;
