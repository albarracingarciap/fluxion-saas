-- ============================================================================
-- Plan de tratamiento: tareas de las acciones (B03)
-- ============================================================================
-- Tres problemas en los triggers que enlazan las acciones del plan con sus
-- tareas (`R2`):
--
-- 1. La tarea solo se creaba al INSERTAR una acción con opción. Las acciones se
--    crean sin opción (al enviar el FMEA) y la opción se decide después con un
--    UPDATE, así que nunca se creaba ninguna tarea.
-- 2. `tasks.assignee_id` referencia `profiles.id`, pero se le asignaba
--    `treatment_actions.owner_id`, que guarda `auth.users.id`. En cuanto el
--    trigger se ejecutara, el INSERT de la tarea fallaría por la clave foránea y
--    arrastraría el guardado de la acción. Lo mismo en el trigger que sincroniza
--    acción y tarea.
-- 3. No había forma de recuperar las tareas de las acciones ya decididas.
--
-- Esta migración:
--   · traduce owner_id (auth.users.id) al perfil de la organización en ambos
--     triggers;
--   · crea la tarea también cuando se decide la opción (UPDATE OF option);
--   · genera las tareas que faltan en las acciones ya decididas y abiertas.
--
-- Idempotente: las funciones se reemplazan, el trigger se recrea y el relleno
-- solo afecta a acciones sin tarea.
-- ============================================================================


-- ── 1. Creación de la tarea ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.trg_treatment_action_create_task() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_system_id   uuid;
  v_mode_name   text;
  v_task_title  text;
  v_task_id     uuid;
  v_priority    fluxion.task_priority;
  v_assignee    uuid;
BEGIN
  -- Sin opción, con opción 'aceptar' o con tarea ya creada: nada que hacer.
  IF NEW.option IS NULL OR NEW.option = 'aceptar' OR NEW.task_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT system_id INTO v_system_id
  FROM fluxion.treatment_plans
  WHERE id = NEW.plan_id;

  SELECT fm.name INTO v_mode_name
  FROM fluxion.fmea_items fi
  JOIN compliance.failure_modes fm ON fm.id = fi.failure_mode_id
  WHERE fi.id = NEW.fmea_item_id;

  v_task_title := CASE NEW.option
    WHEN 'mitigar'    THEN 'Mitigar: '
    WHEN 'transferir' THEN 'Transferir: '
    WHEN 'evitar'     THEN 'Evitar: '
    WHEN 'diferir'    THEN 'Diferir: '
    ELSE                   'Acción: '
  END || COALESCE(v_mode_name, 'modo de fallo');

  v_priority := fluxion.s_actual_to_task_priority(NEW.s_actual_at_creation);

  -- owner_id guarda auth.users.id; la tarea necesita el perfil (profiles.id).
  SELECT p.id INTO v_assignee
  FROM fluxion.profiles p
  WHERE p.user_id = NEW.owner_id
    AND p.organization_id = NEW.organization_id
  LIMIT 1;

  INSERT INTO fluxion.tasks (
    organization_id,
    system_id,
    title,
    description,
    status,
    priority,
    source_type,
    source_id,
    assignee_id,
    due_date
  ) VALUES (
    NEW.organization_id,
    v_system_id,
    left(v_task_title, 300),
    NEW.evidence_description,
    fluxion.action_status_to_task_status(NEW.status),
    v_priority,
    'treatment_action',
    NEW.id,
    v_assignee,
    NEW.due_date
  )
  RETURNING id INTO v_task_id;

  NEW.task_id := v_task_id;

  RETURN NEW;
END;
$$;


-- ── 2. Sincronización acción → tarea ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.trg_treatment_action_sync_task() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_assignee uuid;
BEGIN
  IF NEW.task_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status   IS DISTINCT FROM OLD.status
  OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
  OR NEW.due_date IS DISTINCT FROM OLD.due_date
  THEN
    -- owner_id guarda auth.users.id; la tarea necesita el perfil (profiles.id).
    SELECT p.id INTO v_assignee
    FROM fluxion.profiles p
    WHERE p.user_id = NEW.owner_id
      AND p.organization_id = NEW.organization_id
    LIMIT 1;

    UPDATE fluxion.tasks SET
      status       = fluxion.action_status_to_task_status(NEW.status),
      assignee_id  = v_assignee,
      due_date     = NEW.due_date,
      completed_at = CASE
                       WHEN NEW.status IN ('completed', 'accepted')
                         THEN COALESCE(completed_at, now())
                       ELSE NULL
                     END
    WHERE id = NEW.task_id;
  END IF;

  RETURN NEW;
END;
$$;


-- ── 3. Crear la tarea al decidir la opción ───────────────────────────────────

DROP TRIGGER IF EXISTS trg_treatment_action_create_task_on_decision ON fluxion.treatment_actions;

CREATE TRIGGER trg_treatment_action_create_task_on_decision
  BEFORE UPDATE OF option ON fluxion.treatment_actions
  FOR EACH ROW
  WHEN (NEW.task_id IS NULL AND NEW.option IS NOT NULL AND NEW.option <> 'aceptar'::fluxion.treatment_option)
  EXECUTE FUNCTION fluxion.trg_treatment_action_create_task();


-- ── 4. Tareas que faltan en acciones ya decididas ────────────────────────────
--
-- Reasignar la opción a sí misma dispara el trigger anterior. Solo acciones
-- abiertas: las cerradas, canceladas o aceptadas no necesitan tarea.

UPDATE fluxion.treatment_actions
   SET option = option
 WHERE task_id IS NULL
   AND option IS NOT NULL
   AND option <> 'aceptar'::fluxion.treatment_option
   AND status NOT IN ('completed', 'cancelled', 'accepted');
