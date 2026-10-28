-- ============================================================================
-- Plan de tratamiento: la tarea sigue a la opción de la acción
-- ============================================================================
--   Revisión del 2026-10-28: la tarea de una acción se crea al decidir la
--   opción (B03), pero luego solo seguía al estado, al responsable y a la
--   fecha. Dos casos sin cubrir:
--     - si la opción cambia (de Mitigar a Transferir…), la tarea conservaba
--       el título «Mitigar: …»;
--     - si la acción pasa a Aceptar, la tarea quedaba abierta, aunque aceptar
--       un riesgo no es una tarea (va por la aceptación y sus revisiones).
--
--   Ahora, al cambiar la opción:
--     - a Aceptar (o sin opción): la tarea abierta se cancela;
--     - a otra opción: se actualiza el título y, si estaba cancelada por haber
--       pasado a Aceptar, se reabre con el estado de la acción.
--   La cancelación no se propaga a la acción (solo se propaga «hecha», B07).
--
-- Idempotente: la función se reemplaza; el trigger no cambia.
-- ============================================================================

CREATE OR REPLACE FUNCTION fluxion.trg_treatment_action_sync_task() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_assignee  uuid;
  v_mode_name text;
  v_title     text;
BEGIN
  IF NEW.task_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Aceptar no es una tarea: se cancela la que hubiera abierta.
  IF NEW.option IS DISTINCT FROM OLD.option AND (NEW.option IS NULL OR NEW.option = 'aceptar') THEN
    UPDATE fluxion.tasks SET status = 'cancelled', completed_at = NULL
     WHERE id = NEW.task_id AND status NOT IN ('done', 'cancelled');
    RETURN NEW;
  END IF;
  IF NEW.option IS NULL OR NEW.option = 'aceptar' THEN
    RETURN NEW;
  END IF;

  IF NEW.status   IS DISTINCT FROM OLD.status
  OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
  OR NEW.due_date IS DISTINCT FROM OLD.due_date
  OR NEW.option   IS DISTINCT FROM OLD.option
  THEN
    -- owner_id guarda auth.users.id; la tarea necesita el perfil (profiles.id).
    SELECT p.id INTO v_assignee
    FROM fluxion.profiles p
    WHERE p.user_id = NEW.owner_id
      AND p.organization_id = NEW.organization_id
    LIMIT 1;

    IF NEW.option IS DISTINCT FROM OLD.option THEN
      SELECT fm.name INTO v_mode_name
      FROM fluxion.fmea_items fi
      JOIN compliance.failure_modes fm ON fm.id = fi.failure_mode_id
      WHERE fi.id = NEW.fmea_item_id;

      -- Mismo título que al crearla (trg_treatment_action_create_task).
      v_title := left(CASE NEW.option
        WHEN 'mitigar'    THEN 'Mitigar: '
        WHEN 'transferir' THEN 'Transferir: '
        WHEN 'evitar'     THEN 'Evitar: '
        WHEN 'diferir'    THEN 'Diferir: '
        ELSE                   'Acción: '
      END || COALESCE(v_mode_name, 'modo de fallo'), 300);
    END IF;

    UPDATE fluxion.tasks SET
      title        = COALESCE(v_title, title),
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
