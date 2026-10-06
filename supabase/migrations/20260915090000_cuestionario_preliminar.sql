-- ============================================================================
-- Cuestionario preliminar de sistemas de IA
-- ============================================================================
-- Antes de dar de alta un sistema en el inventario se recoge informacion
-- preliminar para poder clasificarlo segun el Reglamento de IA. Esta tabla solo
-- GUARDA las respuestas: todavia no se calcula el nivel de riesgo.
--
-- Las respuestas van en un jsonb porque el cuestionario es largo y su
-- estructura evolucionara (el esquema de preguntas vive en la aplicacion,
-- en lib/preliminary-questionnaire/schema.ts). Lo que se consulta o se lista
-- se promociona a columnas: nombre, estado, responsable.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE fluxion.preliminary_questionnaire_status AS ENUM ('borrador', 'completado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


CREATE TABLE IF NOT EXISTS fluxion.preliminary_questionnaires (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  -- Nombre con el que se reconoce en el listado: objeto del proyecto o nombre
  -- comercial del sistema. Se deriva de las respuestas al guardar.
  title            text NOT NULL DEFAULT 'Sin título',
  status           fluxion.preliminary_questionnaire_status NOT NULL DEFAULT 'borrador',
  project_lead     text,

  answers          jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Reservado para cuando se enlace con el inventario (alta prerrellenada).
  ai_system_id     uuid REFERENCES fluxion.ai_systems(id) ON DELETE SET NULL,

  created_by       uuid REFERENCES fluxion.profiles(id),
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prelim_questionnaires_org
  ON fluxion.preliminary_questionnaires (organization_id, updated_at DESC);

COMMENT ON TABLE fluxion.preliminary_questionnaires IS
  'Cuestionario preliminar previo al inventario. Guarda respuestas; no clasifica.';


CREATE OR REPLACE FUNCTION fluxion.set_prelim_questionnaires_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prelim_questionnaires_updated_at ON fluxion.preliminary_questionnaires;
CREATE TRIGGER trg_prelim_questionnaires_updated_at
  BEFORE UPDATE ON fluxion.preliminary_questionnaires
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_prelim_questionnaires_updated_at();


-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.preliminary_questionnaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prelim_questionnaires_select ON fluxion.preliminary_questionnaires;
CREATE POLICY prelim_questionnaires_select ON fluxion.preliminary_questionnaires
  FOR SELECT USING (organization_id = fluxion.auth_user_org_id());

DROP POLICY IF EXISTS prelim_questionnaires_write ON fluxion.preliminary_questionnaires;
CREATE POLICY prelim_questionnaires_write ON fluxion.preliminary_questionnaires
  FOR ALL
  USING (organization_id = fluxion.auth_user_org_id())
  WITH CHECK (organization_id = fluxion.auth_user_org_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.preliminary_questionnaires TO authenticated;
GRANT ALL ON fluxion.preliminary_questionnaires TO service_role;
