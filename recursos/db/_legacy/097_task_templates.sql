-- 097: task_templates
-- Plantillas de tarea reutilizables (personal, shared u del sistema)
-- scope = 'system' → plantillas globales de solo lectura (org NULL)
-- scope = 'personal' | 'shared' → pertenecen a una organización y tienen owner

CREATE TABLE IF NOT EXISTS fluxion.task_templates (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  owner_id         uuid        REFERENCES fluxion.profiles(id)      ON DELETE SET NULL,
  scope            text        NOT NULL DEFAULT 'personal'
                               CHECK (scope IN ('personal', 'shared', 'system')),
  name             text        NOT NULL,
  description      text,
  default_priority text        NOT NULL DEFAULT 'medium'
                               CHECK (default_priority IN ('low','medium','high','critical')),
  default_tags     text[]      NOT NULL DEFAULT '{}',
  -- checklist: [{label: text, required?: bool}]
  checklist        jsonb       NOT NULL DEFAULT '[]',
  is_archived      boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Constraint: plantillas personal/shared necesitan organización
ALTER TABLE fluxion.task_templates
  ADD CONSTRAINT task_templates_org_required
  CHECK (scope = 'system' OR organization_id IS NOT NULL);

-- Constraint: plantillas del sistema no tienen owner ni org
ALTER TABLE fluxion.task_templates
  ADD CONSTRAINT task_templates_system_no_owner
  CHECK (scope != 'system' OR (organization_id IS NULL AND owner_id IS NULL));

CREATE INDEX IF NOT EXISTS idx_task_templates_org   ON fluxion.task_templates (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_templates_scope ON fluxion.task_templates (scope);

-- updated_at automático
CREATE OR REPLACE FUNCTION fluxion.set_task_templates_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS task_templates_updated_at ON fluxion.task_templates;
CREATE TRIGGER task_templates_updated_at
  BEFORE UPDATE ON fluxion.task_templates
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_task_templates_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.task_templates ENABLE ROW LEVEL SECURITY;

-- SELECT: plantillas del sistema (todas) + plantillas de la propia org
CREATE POLICY task_templates_select ON fluxion.task_templates
  FOR SELECT USING (
    scope = 'system'
    OR (
      is_archived = false
      AND organization_id = (
        SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- INSERT: miembros de la org crean plantillas personal/shared
CREATE POLICY task_templates_insert ON fluxion.task_templates
  FOR INSERT WITH CHECK (
    scope IN ('personal', 'shared')
    AND organization_id = (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
    AND owner_id = (
      SELECT id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

-- UPDATE: solo el owner puede editar
CREATE POLICY task_templates_update ON fluxion.task_templates
  FOR UPDATE
  USING    (owner_id = (SELECT id FROM fluxion.profiles WHERE user_id = auth.uid()))
  WITH CHECK (owner_id = (SELECT id FROM fluxion.profiles WHERE user_id = auth.uid()));

-- DELETE: solo el owner puede eliminar
CREATE POLICY task_templates_delete ON fluxion.task_templates
  FOR DELETE
  USING (owner_id = (SELECT id FROM fluxion.profiles WHERE user_id = auth.uid()));
