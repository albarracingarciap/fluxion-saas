-- 101: grants para tablas nuevas del módulo de tareas (095-100)
-- Las tablas creadas a partir de 095 no heredaron los privileges de roles de Supabase.

-- ─── Tablas nuevas ────────────────────────────────────────────────────────────

GRANT ALL ON fluxion.task_saved_views        TO anon, authenticated, service_role;
GRANT ALL ON fluxion.task_templates          TO anon, authenticated, service_role;
GRANT ALL ON fluxion.task_checklist_items    TO anon, authenticated, service_role;
GRANT ALL ON fluxion.task_recurrences        TO anon, authenticated, service_role;
GRANT ALL ON fluxion.task_recurrence_runs    TO anon, authenticated, service_role;

-- ─── Default privileges — todas las tablas futuras en fluxion ─────────────────
-- Evita tener que repetir GRANTs en cada nueva migración

ALTER DEFAULT PRIVILEGES IN SCHEMA fluxion
  GRANT ALL ON TABLES    TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA fluxion
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA fluxion
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
