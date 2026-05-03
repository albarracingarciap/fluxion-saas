-- 100: task_recurrences + task_recurrence_runs + motor de recurrencia
-- PREREQUISITO: activar la extensión pg_cron en Supabase Dashboard → Extensions → pg_cron
-- (o ejecutar: CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;)

-- ─── Tablas ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.task_recurrences (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES fluxion.organizations(id)  ON DELETE CASCADE,
  template_id      uuid        REFERENCES fluxion.task_templates(id)          ON DELETE SET NULL,
  -- Datos de la tarea generada (soporta {{date}}, {{month}}, {{year}}, {{quarter}} en title)
  title            text        NOT NULL,
  description      text,
  priority         text        NOT NULL DEFAULT 'medium'
                               CHECK (priority IN ('low','medium','high','critical')),
  system_id        uuid        REFERENCES fluxion.ai_systems(id)              ON DELETE SET NULL,
  assignee_id      uuid        REFERENCES fluxion.profiles(id)                ON DELETE SET NULL,
  tags             text[]      NOT NULL DEFAULT '{}',
  -- Programación
  frequency        text        NOT NULL
                               CHECK (frequency IN ('daily','weekly','biweekly','monthly','quarterly','annually')),
  day_of_week      integer     CHECK (day_of_week BETWEEN 0 AND 6),   -- 0=Lun … 6=Dom (para weekly)
  day_of_month     integer     CHECK (day_of_month BETWEEN 1 AND 31), -- para monthly/annually
  month_of_year    integer     CHECK (month_of_year BETWEEN 1 AND 12),-- para annually
  due_offset_days  integer     NOT NULL DEFAULT 7,  -- días hasta vencimiento desde creación
  active           boolean     NOT NULL DEFAULT true,
  last_run_at      timestamptz,
  next_run_at      timestamptz,
  created_by       uuid        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_recurrences_org    ON fluxion.task_recurrences (organization_id);
CREATE INDEX IF NOT EXISTS idx_task_recurrences_active ON fluxion.task_recurrences (active, next_run_at)
  WHERE active = true;

-- Historial de ejecuciones (una fila por tarea generada)
CREATE TABLE IF NOT EXISTS fluxion.task_recurrence_runs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recurrence_id  uuid        NOT NULL REFERENCES fluxion.task_recurrences(id) ON DELETE CASCADE,
  task_id        uuid        REFERENCES fluxion.tasks(id) ON DELETE SET NULL,
  scheduled_for  date        NOT NULL,
  triggered_by   text        NOT NULL DEFAULT 'cron' CHECK (triggered_by IN ('cron','manual')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurrence_runs_rec ON fluxion.task_recurrence_runs (recurrence_id, created_at DESC);

-- updated_at automático para task_recurrences
CREATE OR REPLACE FUNCTION fluxion.set_task_recurrences_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS task_recurrences_updated_at ON fluxion.task_recurrences;
CREATE TRIGGER task_recurrences_updated_at
  BEFORE UPDATE ON fluxion.task_recurrences
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_task_recurrences_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.task_recurrences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.task_recurrence_runs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_recurrences_all ON fluxion.task_recurrences
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY task_recurrence_runs_select ON fluxion.task_recurrence_runs
  FOR SELECT USING (
    recurrence_id IN (
      SELECT id FROM fluxion.task_recurrences
      WHERE organization_id = (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
    )
  );

-- ─── Función auxiliar: calcular next_run_at ──────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.compute_next_run(
  p_frequency    text,
  p_day_of_week  int,   -- 0=Lun … 6=Dom
  p_day_of_month int,
  p_month_of_year int,
  p_from         timestamptz DEFAULT now()
) RETURNS timestamptz
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_result        timestamptz;
  v_date          date;
  v_current_isodow int;
  v_target_isodow  int;
  v_days_until     int;
  v_base_year      int;
  v_base_month     int;
  v_days_in_month  int;
  v_target_day     int;
BEGIN
  CASE p_frequency

    WHEN 'daily' THEN
      -- Mañana a las 08:00 UTC
      v_result := date_trunc('day', p_from) + interval '1 day 8 hours';

    WHEN 'weekly' THEN
      -- Próxima ocurrencia del día de la semana (sin contar hoy)
      -- ISODOW: 1=Lun … 7=Dom; p_day_of_week: 0=Lun … 6=Dom
      v_current_isodow := EXTRACT(ISODOW FROM p_from::date)::int;
      v_target_isodow  := CASE WHEN p_day_of_week = 6 THEN 7 ELSE COALESCE(p_day_of_week, 0) + 1 END;
      v_days_until     := (v_target_isodow - v_current_isodow + 7) % 7;
      IF v_days_until = 0 THEN v_days_until := 7; END IF;
      v_result := (p_from::date + v_days_until)::timestamptz + interval '8 hours';

    WHEN 'biweekly' THEN
      -- Exactamente 14 días desde from
      v_result := date_trunc('day', p_from) + interval '14 days 8 hours';

    WHEN 'monthly' THEN
      -- Próxima ocurrencia del día del mes
      v_base_year  := EXTRACT(YEAR  FROM p_from)::int;
      v_base_month := EXTRACT(MONTH FROM p_from)::int;
      v_days_in_month := DATE_PART('days',
        make_date(v_base_year, v_base_month, 1) + interval '1 month - 1 day'
      )::int;
      v_target_day := LEAST(COALESCE(p_day_of_month, 1), v_days_in_month);
      v_date := make_date(v_base_year, v_base_month, v_target_day);
      IF v_date <= p_from::date THEN
        -- Siguiente mes
        IF v_base_month = 12 THEN
          v_base_year  := v_base_year + 1;
          v_base_month := 1;
        ELSE
          v_base_month := v_base_month + 1;
        END IF;
        v_days_in_month := DATE_PART('days',
          make_date(v_base_year, v_base_month, 1) + interval '1 month - 1 day'
        )::int;
        v_target_day := LEAST(COALESCE(p_day_of_month, 1), v_days_in_month);
        v_date := make_date(v_base_year, v_base_month, v_target_day);
      END IF;
      v_result := v_date::timestamptz + interval '8 hours';

    WHEN 'quarterly' THEN
      -- 3 meses desde from, día 1 del mes resultante
      v_result := date_trunc('month', p_from) + interval '3 months 8 hours';

    WHEN 'annually' THEN
      -- Próxima ocurrencia de mes+día
      v_base_year := EXTRACT(YEAR FROM p_from)::int;
      v_target_day := LEAST(COALESCE(p_day_of_month, 1), 28);
      v_date := make_date(v_base_year, COALESCE(p_month_of_year, 1), v_target_day);
      IF v_date <= p_from::date THEN
        v_date := make_date(v_base_year + 1, COALESCE(p_month_of_year, 1), v_target_day);
      END IF;
      v_result := v_date::timestamptz + interval '8 hours';

    ELSE
      v_result := date_trunc('day', p_from) + interval '1 day 8 hours';

  END CASE;

  RETURN v_result;
END;
$$;

-- ─── Función: inicializar next_run_at al crear una recurrencia ────────────────

CREATE OR REPLACE FUNCTION fluxion.init_recurrence_next_run()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.next_run_at IS NULL THEN
    NEW.next_run_at := fluxion.compute_next_run(
      NEW.frequency, NEW.day_of_week, NEW.day_of_month, NEW.month_of_year, now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_recurrences_init_next_run ON fluxion.task_recurrences;
CREATE TRIGGER task_recurrences_init_next_run
  BEFORE INSERT ON fluxion.task_recurrences
  FOR EACH ROW EXECUTE FUNCTION fluxion.init_recurrence_next_run();

-- ─── Función: procesar recurrencias pendientes ────────────────────────────────
-- Ejecutada por pg_cron cada hora. SECURITY DEFINER para eludir RLS.

CREATE OR REPLACE FUNCTION fluxion.process_task_recurrences()
RETURNS integer    -- nº de tareas creadas
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec          record;
  new_task_id  uuid;
  v_title      text;
  v_due_date   date;
  v_created    int := 0;
BEGIN
  FOR rec IN
    SELECT r.*,
           p.id AS creator_profile_id
    FROM   fluxion.task_recurrences r
    LEFT JOIN fluxion.profiles p ON p.id = r.created_by
    WHERE  r.active = true
      AND  r.next_run_at <= now()
  LOOP
    -- Sustituir variables en el título
    v_title := rec.title;
    v_title := replace(v_title, '{{date}}',    to_char(now() AT TIME ZONE 'UTC', 'DD/MM/YYYY'));
    v_title := replace(v_title, '{{month}}',   to_char(now() AT TIME ZONE 'UTC', 'MM/YYYY'));
    v_title := replace(v_title, '{{year}}',    to_char(now() AT TIME ZONE 'UTC', 'YYYY'));
    v_title := replace(v_title, '{{quarter}}', 'Q' || EXTRACT(QUARTER FROM now())::text
                                               || ' ' || EXTRACT(YEAR FROM now())::text);

    v_due_date := now()::date + rec.due_offset_days;

    -- Crear tarea
    INSERT INTO fluxion.tasks (
      organization_id, system_id, title, description,
      status, priority, source_type, source_id,
      assignee_id, created_by, due_date, tags
    ) VALUES (
      rec.organization_id, rec.system_id, v_title, rec.description,
      'todo', rec.priority, 'manual', NULL,
      rec.assignee_id, rec.creator_profile_id, v_due_date, rec.tags
    )
    RETURNING id INTO new_task_id;

    -- Si la recurrencia tiene plantilla, copiar el checklist
    IF rec.template_id IS NOT NULL THEN
      INSERT INTO fluxion.task_checklist_items (task_id, label, position)
      SELECT new_task_id,
             (item_val ->> 'label')::text,
             ((row_number() OVER ()) * 10)::integer
      FROM   fluxion.task_templates t,
             jsonb_array_elements(t.checklist) AS item_val
      WHERE  t.id = rec.template_id;
    END IF;

    -- Registrar ejecución
    INSERT INTO fluxion.task_recurrence_runs (recurrence_id, task_id, scheduled_for, triggered_by)
    VALUES (rec.id, new_task_id, rec.next_run_at::date, 'cron');

    -- Actualizar timestamps y calcular próxima ejecución
    UPDATE fluxion.task_recurrences
    SET  last_run_at = now(),
         next_run_at = fluxion.compute_next_run(
           rec.frequency, rec.day_of_week, rec.day_of_month, rec.month_of_year, now()
         )
    WHERE id = rec.id;

    v_created := v_created + 1;
  END LOOP;

  RETURN v_created;
END;
$$;

-- Solo postgres (y pg_cron) pueden llamar a esta función
REVOKE EXECUTE ON FUNCTION fluxion.process_task_recurrences() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION fluxion.process_task_recurrences() TO postgres;

-- ─── pg_cron: ejecutar cada hora (minuto 5) ──────────────────────────────────
-- NOTA: requiere la extensión pg_cron habilitada en Supabase Dashboard.
-- Si pg_cron no está disponible, esta sección puede comentarse sin afectar al resto.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Eliminar job previo si existía
    PERFORM cron.unschedule('process-task-recurrences')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-task-recurrences');

    -- Registrar nuevo job: cada hora en el minuto 5
    PERFORM cron.schedule(
      'process-task-recurrences',
      '5 * * * *',
      'SELECT fluxion.process_task_recurrences()'
    );
  END IF;
END;
$$;
