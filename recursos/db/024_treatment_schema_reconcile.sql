-- ============================================================================
-- FLUXION — Reconciliación previa para treatment_plans / treatment_actions
-- ============================================================================
-- Objetivo:
--   - Detectar las tablas legacy creadas por 005_fluxion_compliance_fmea.sql
--   - Renombrarlas a *_legacy_20260417 si todavía tienen la forma antigua
--   - Dejar libres los nombres fluxion.treatment_plans y fluxion.treatment_actions
--     para aplicar después 021_treatment_schema.sql y 023_treatment_schema_patch.sql
--
-- Esta migración NO borra datos: conserva las tablas antiguas como backup.

DO $$
DECLARE
  has_tp BOOLEAN;
  has_ta BOOLEAN;
  tp_has_org BOOLEAN;
  ta_has_org BOOLEAN;
  ta_has_plan_id BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'fluxion'
      AND table_name = 'treatment_plans'
  ) INTO has_tp;

  IF has_tp THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'fluxion'
        AND table_name = 'treatment_plans'
        AND column_name = 'organization_id'
    ) INTO tp_has_org;

    IF NOT tp_has_org THEN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'fluxion'
          AND table_name = 'treatment_plans_legacy_20260417'
      ) THEN
        RAISE EXCEPTION 'Ya existe fluxion.treatment_plans_legacy_20260417. Revísala antes de continuar.';
      END IF;

      ALTER TABLE fluxion.treatment_plans
        RENAME TO treatment_plans_legacy_20260417;
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'fluxion'
      AND table_name = 'treatment_actions'
  ) INTO has_ta;

  IF has_ta THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'fluxion'
        AND table_name = 'treatment_actions'
        AND column_name = 'organization_id'
    ) INTO ta_has_org;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'fluxion'
        AND table_name = 'treatment_actions'
        AND column_name = 'plan_id'
    ) INTO ta_has_plan_id;

    IF (NOT ta_has_org) OR (NOT ta_has_plan_id) THEN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'fluxion'
          AND table_name = 'treatment_actions_legacy_20260417'
      ) THEN
        RAISE EXCEPTION 'Ya existe fluxion.treatment_actions_legacy_20260417. Revísala antes de continuar.';
      END IF;

      ALTER TABLE fluxion.treatment_actions
        RENAME TO treatment_actions_legacy_20260417;
    END IF;
  END IF;
END $$;

COMMENT ON TABLE fluxion.treatment_plans_legacy_20260417 IS
  'Backup automático del esquema legacy de treatment_plans previo a 021_treatment_schema.';

COMMENT ON TABLE fluxion.treatment_actions_legacy_20260417 IS
  'Backup automático del esquema legacy de treatment_actions previo a 021_treatment_schema.';
