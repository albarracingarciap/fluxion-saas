-- ============================================================================
-- FLUXION — Modelo de tareas unificado
-- Tabla fluxion.tasks como fuente de verdad para el módulo Ejecución.
--
-- Relaciones:
--   tasks (N) ──→ (0..1) treatment_actions  (source_type = 'treatment_action')
--   tasks (N) ──→ (0..1) gaps               (source_type = 'gap')
--   tasks (N) ──→ (0..1) fmea_evaluations   (source_type = 'evaluation')
--   tasks (N) ──→ (1)    ai_systems
--
-- Automatización:
--   - Al insertar una treatment_action con option != 'aceptar' se crea
--     automáticamente una task vía trigger y se escribe task_id de vuelta.
--   - Al actualizar status de treatment_action se sincroniza el status task.
--   - Al marcar una task como done se completa la treatment_action si aplica.
-- ============================================================================

-- ─── ENUMs ───────────────────────────────────────────────────────────────────

CREATE TYPE fluxion.task_status AS ENUM (
  'todo',
  'in_progress',
  'blocked',
  'in_review',
  'done',
  'cancelled'
);

CREATE TYPE fluxion.task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- ─── TABLA fluxion.tasks ─────────────────────────────────────────────────────

CREATE TABLE fluxion.tasks (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  system_id         uuid        REFERENCES fluxion.ai_systems(id) ON DELETE SET NULL,

  title             text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  description       text,

  status            fluxion.task_status     NOT NULL DEFAULT 'todo',
  priority          fluxion.task_priority   NOT NULL DEFAULT 'medium',

  -- Origen de la tarea: manual, treatment_action, gap, evaluation
  source_type       text        NOT NULL DEFAULT 'manual'
                                CHECK (source_type IN ('manual', 'treatment_action', 'gap', 'evaluation')),
  source_id         uuid,

  assignee_id       uuid        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  created_by        uuid        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,

  due_date          date,
  completed_at      timestamptz,

  tags              text[]      NOT NULL DEFAULT '{}',

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE fluxion.tasks IS
  'Work items unificados para el módulo de Ejecución (Tareas + Kanban). '
  'Las tareas pueden originarse de forma manual o ser generadas automáticamente '
  'desde treatment_actions, gaps o evaluaciones.';

COMMENT ON COLUMN fluxion.tasks.source_type IS
  'Indica el módulo que originó la tarea. manual = creada directamente por el usuario.';

COMMENT ON COLUMN fluxion.tasks.source_id IS
  'UUID del registro origen (treatment_actions.id, gaps.id, fmea_evaluations.id). '
  'NULL para tareas manuales.';

-- ─── ÍNDICES ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_tasks_org
  ON fluxion.tasks(organization_id);

CREATE INDEX idx_tasks_system
  ON fluxion.tasks(system_id)
  WHERE system_id IS NOT NULL;

CREATE INDEX idx_tasks_assignee
  ON fluxion.tasks(assignee_id)
  WHERE assignee_id IS NOT NULL;

CREATE INDEX idx_tasks_status
  ON fluxion.tasks(organization_id, status);

CREATE INDEX idx_tasks_due_date_open
  ON fluxion.tasks(organization_id, due_date)
  WHERE status NOT IN ('done', 'cancelled') AND due_date IS NOT NULL;

CREATE INDEX idx_tasks_source
  ON fluxion.tasks(source_type, source_id)
  WHERE source_id IS NOT NULL;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select"
  ON fluxion.tasks FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_insert"
  ON fluxion.tasks FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND role IN (
          'org_admin', 'sgai_manager', 'caio', 'dpo',
          'system_owner', 'risk_analyst', 'compliance_analyst'
        )
    )
  );

CREATE POLICY "tasks_update"
  ON fluxion.tasks FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND role IN (
          'org_admin', 'sgai_manager', 'caio', 'dpo',
          'system_owner', 'risk_analyst', 'compliance_analyst'
        )
    )
  );

CREATE POLICY "tasks_delete"
  ON fluxion.tasks FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
      WHERE user_id = auth.uid()
        AND role IN ('org_admin', 'sgai_manager', 'caio')
    )
  );

-- ─── TRIGGER updated_at ──────────────────────────────────────────────────────

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON fluxion.tasks
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();

-- ─── BACKLINK: task_id en treatment_actions ──────────────────────────────────
-- Permite navegar rápidamente de una action a su task sin JOIN adicional.

ALTER TABLE fluxion.treatment_actions
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES fluxion.tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ta_task_id
  ON fluxion.treatment_actions(task_id)
  WHERE task_id IS NOT NULL;

-- ─── FUNCIÓN: mapear status de treatment_action → task_status ────────────────

CREATE OR REPLACE FUNCTION fluxion.action_status_to_task_status(
  p_action_status fluxion.treatment_action_status
) RETURNS fluxion.task_status LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_action_status
    WHEN 'pending'          THEN 'todo'::fluxion.task_status
    WHEN 'in_progress'      THEN 'in_progress'::fluxion.task_status
    WHEN 'evidence_pending' THEN 'in_review'::fluxion.task_status
    WHEN 'completed'        THEN 'done'::fluxion.task_status
    WHEN 'accepted'         THEN 'done'::fluxion.task_status
    WHEN 'cancelled'        THEN 'cancelled'::fluxion.task_status
    ELSE                         'todo'::fluxion.task_status
  END;
$$;

-- ─── FUNCIÓN: mapear s_actual → task_priority ────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.s_actual_to_task_priority(
  p_s_actual smallint
) RETURNS fluxion.task_priority LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_s_actual = 9 THEN 'critical'::fluxion.task_priority
    WHEN p_s_actual = 8 THEN 'high'::fluxion.task_priority
    WHEN p_s_actual >= 6 THEN 'medium'::fluxion.task_priority
    ELSE                      'low'::fluxion.task_priority
  END;
$$;

-- ─── TRIGGER: auto-crear task al insertar treatment_action ───────────────────

CREATE OR REPLACE FUNCTION fluxion.trg_treatment_action_create_task()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_system_id   uuid;
  v_mode_name   text;
  v_task_title  text;
  v_task_id     uuid;
  v_priority    fluxion.task_priority;
BEGIN
  -- Las acciones 'aceptar' no generan tarea activa
  IF NEW.option = 'aceptar' THEN
    RETURN NEW;
  END IF;

  -- Obtener system_id desde el plan
  SELECT system_id INTO v_system_id
  FROM fluxion.treatment_plans
  WHERE id = NEW.plan_id;

  -- Obtener nombre del modo de fallo desde el catálogo
  SELECT fm.name INTO v_mode_name
  FROM fluxion.fmea_items fi
  JOIN compliance.failure_modes fm ON fm.id = fi.failure_mode_id
  WHERE fi.id = NEW.fmea_item_id;

  -- Construir título descriptivo
  v_task_title := CASE NEW.option
    WHEN 'mitigar'    THEN 'Mitigar: '
    WHEN 'transferir' THEN 'Transferir: '
    WHEN 'evitar'     THEN 'Evitar: '
    WHEN 'diferir'    THEN 'Diferir: '
    ELSE                   'Acción: '
  END || COALESCE(v_mode_name, 'modo de fallo');

  -- Calcular prioridad según S_actual
  v_priority := fluxion.s_actual_to_task_priority(NEW.s_actual_at_creation);

  -- Crear la tarea
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
    v_task_title,
    NEW.evidence_description,
    fluxion.action_status_to_task_status(NEW.status),
    v_priority,
    'treatment_action',
    NEW.id,
    NEW.owner_id,
    NEW.due_date
  )
  RETURNING id INTO v_task_id;

  -- Escribir backlink en la propia fila (BEFORE trigger, podemos mutar NEW)
  NEW.task_id := v_task_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_treatment_action_create_task
  BEFORE INSERT ON fluxion.treatment_actions
  FOR EACH ROW
  WHEN (NEW.option <> 'aceptar')
  EXECUTE FUNCTION fluxion.trg_treatment_action_create_task();

-- ─── TRIGGER: sincronizar status/assignee/due_date al actualizar action ───────

CREATE OR REPLACE FUNCTION fluxion.trg_treatment_action_sync_task()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.task_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Sync solo si cambiaron campos relevantes
  IF NEW.status        IS DISTINCT FROM OLD.status
  OR NEW.owner_id      IS DISTINCT FROM OLD.owner_id
  OR NEW.due_date      IS DISTINCT FROM OLD.due_date
  THEN
    UPDATE fluxion.tasks SET
      status       = fluxion.action_status_to_task_status(NEW.status),
      assignee_id  = NEW.owner_id,
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

CREATE TRIGGER trg_treatment_action_sync_task
  AFTER UPDATE ON fluxion.treatment_actions
  FOR EACH ROW
  EXECUTE FUNCTION fluxion.trg_treatment_action_sync_task();

-- ─── TRIGGER: al completar una task manual, propagar al source ───────────────

CREATE OR REPLACE FUNCTION fluxion.trg_task_done_propagate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Solo actúa cuando el status cambia a 'done'
  IF NEW.status = 'done' AND OLD.status <> 'done' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());

    -- Propagar a treatment_action si es el source
    IF NEW.source_type = 'treatment_action' AND NEW.source_id IS NOT NULL THEN
      UPDATE fluxion.treatment_actions
      SET status = 'completed', completed_at = now()
      WHERE id = NEW.source_id
        AND status NOT IN ('completed', 'accepted', 'cancelled');
    END IF;
  END IF;

  -- Limpiar completed_at si se reabre
  IF NEW.status <> 'done' AND OLD.status = 'done' THEN
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_task_done_propagate
  BEFORE UPDATE ON fluxion.tasks
  FOR EACH ROW
  EXECUTE FUNCTION fluxion.trg_task_done_propagate();
