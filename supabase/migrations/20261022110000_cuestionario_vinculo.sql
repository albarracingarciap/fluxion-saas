-- ============================================================================
-- Cuestionario preliminar: vínculo con el sistema y bloqueo (B13c)
-- ============================================================================
--   RN-W12: un sistema solo tiene un cuestionario de origen (índice único
--           sobre `ai_system_id`).
--   RN-W11: un cuestionario vinculado es de solo lectura: sus respuestas y su
--           estado no cambian. Se edita la ficha del sistema.
--   RN-W13: si se borra el sistema, la FK (ON DELETE SET NULL, ya existente)
--           desvincula el cuestionario y vuelve a ser editable.
--
-- Idempotente: índice con IF NOT EXISTS; trigger con DROP IF EXISTS.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_preliminary_questionnaires_ai_system
  ON fluxion.preliminary_questionnaires (ai_system_id)
  WHERE ai_system_id IS NOT NULL;

CREATE OR REPLACE FUNCTION fluxion.trg_preliminary_questionnaire_locked() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = fluxion, pg_temp
    AS $$
BEGIN
  IF OLD.ai_system_id IS NOT NULL
     AND NEW.ai_system_id IS NOT DISTINCT FROM OLD.ai_system_id
     AND (NEW.answers IS DISTINCT FROM OLD.answers OR NEW.status IS DISTINCT FROM OLD.status) THEN
    RAISE EXCEPTION 'El cuestionario está vinculado a un sistema y es de solo lectura: edita la ficha del sistema.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_preliminary_questionnaire_locked ON fluxion.preliminary_questionnaires;
CREATE TRIGGER trg_preliminary_questionnaire_locked
  BEFORE UPDATE ON fluxion.preliminary_questionnaires
  FOR EACH ROW EXECUTE FUNCTION fluxion.trg_preliminary_questionnaire_locked();
