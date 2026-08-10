-- ============================================================================
-- FLUXION — Priorización de modos de fallo activados
-- ============================================================================
--
-- Objetivo:
--   Evolucionar fluxion.system_failure_modes desde "lista activada por reglas"
--   a "lista activada + priorizada + trazable", sin tocar S_default ni mezclar
--   la capa de activación con la capa de evaluación FMEA.
--
-- Decisiones cerradas:
--   - priority_score NO recalcula ni modifica S_default
--   - priority_score mide urgencia de revisión para este sistema concreto
--   - critical + high -> prioritized
--   - medium + low   -> monitoring
--   - Reglas duras de override:
--       * S_default >= 8
--       * biométrico + impacto sobre personas
--       * menores + dimensión sensible
--       * AI Act high/prohibited + dimensión crítica
--       * colectivos vulnerables + dimensión sensible
--   - Descartar modos sensibles:
--       * solo admin
--       * priority_notes >= 80 caracteres
--
-- Esta migración prepara schema + funciones base. La integración en motor/UI
-- se hace en una fase posterior.

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'priority_status'
      AND n.nspname = 'fluxion'
  ) THEN
    CREATE TYPE fluxion.priority_status AS ENUM (
      'pending_review',
      'prioritized',
      'monitoring',
      'dismissed'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'priority_source'
      AND n.nspname = 'fluxion'
  ) THEN
    CREATE TYPE fluxion.priority_source AS ENUM (
      'rules',
      'agent',
      'human'
    );
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- 2. Columnas nuevas
-- ---------------------------------------------------------------------------

ALTER TABLE fluxion.system_failure_modes
  ADD COLUMN IF NOT EXISTS priority_status fluxion.priority_status NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS priority_source fluxion.priority_source NOT NULL DEFAULT 'rules',
  ADD COLUMN IF NOT EXISTS priority_notes text,
  ADD COLUMN IF NOT EXISTS priority_score smallint CHECK (priority_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS priority_level text CHECK (priority_level IN ('critical', 'high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS priority_changed_by uuid REFERENCES fluxion.profiles(id),
  ADD COLUMN IF NOT EXISTS priority_changed_at timestamptz;

COMMENT ON COLUMN fluxion.system_failure_modes.priority_status IS
  'Estado de priorización: pending_review -> prioritized | monitoring | dismissed. Solo prioritized entra en la cola principal de evaluación FMEA.';

COMMENT ON COLUMN fluxion.system_failure_modes.priority_source IS
  'Origen de la priorización: rules (motor determinista), agent (refinado IA) o human (ajuste manual).';

COMMENT ON COLUMN fluxion.system_failure_modes.priority_score IS
  'Índice 0-100 calculado para decidir urgencia de revisión. No recalcula ni modifica S_default.';

COMMENT ON COLUMN fluxion.system_failure_modes.priority_level IS
  'Clasificación textual derivada del score: critical, high, medium o low.';

COMMENT ON COLUMN fluxion.system_failure_modes.priority_notes IS
  'Justificación narrativa de cambios de prioridad, especialmente cuando un modo se descarta manualmente.';

-- ---------------------------------------------------------------------------
-- 3. Backfill neutral
-- ---------------------------------------------------------------------------

UPDATE fluxion.system_failure_modes
SET
  priority_status = 'pending_review',
  priority_source = 'rules'
WHERE priority_status IS NULL
   OR priority_source IS NULL;

-- ---------------------------------------------------------------------------
-- 4. Función de scoring
-- ---------------------------------------------------------------------------
--
-- Fórmula v1:
--   base = severity_score + dimension_score + system_signal_score
--   final = round(min(100, base * (0.75 + W / 4)))
--
-- Ajustes acordados:
--   - técnica = 12
--   - is_gpai OR output_type='generacion' suma una sola señal base (+4)
--   - system_signal_score tiene cap 25

CREATE OR REPLACE FUNCTION fluxion.calculate_failure_mode_priority(
  p_s_default smallint,
  p_dimension text,
  p_w numeric,
  p_aiact_risk_level text,
  p_affects_persons boolean,
  p_has_minors boolean,
  p_vulnerable_groups boolean,
  p_biometric boolean,
  p_domain text,
  p_critical_infra boolean,
  p_is_gpai boolean,
  p_output_type text,
  p_ai_system_type text,
  p_has_external_tools boolean
)
RETURNS TABLE (
  score smallint,
  level text,
  status fluxion.priority_status
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_dimension text := lower(coalesce(p_dimension, ''));
  v_domain text := lower(coalesce(p_domain, ''));
  v_output_type text := lower(coalesce(p_output_type, ''));
  v_ai_system_type text := lower(coalesce(p_ai_system_type, ''));
  v_aiact_level text := lower(coalesce(p_aiact_risk_level, ''));
  v_severity_score int := 0;
  v_dimension_score int := 0;
  v_signal_sum int := 0;
  v_signal_score int := 0;
  v_base numeric := 0;
  v_final numeric := 0;
  v_level text;
  v_status fluxion.priority_status;
  v_hard_override boolean := false;
  v_is_generative boolean := false;
BEGIN
  v_severity_score := CASE p_s_default
    WHEN 9 THEN 40
    WHEN 8 THEN 32
    WHEN 7 THEN 24
    WHEN 6 THEN 16
    WHEN 5 THEN 10
    WHEN 4 THEN 6
    ELSE 2
  END;

  v_dimension_score := CASE v_dimension
    WHEN 'seguridad' THEN 15
    WHEN 'legal_b' THEN 14
    WHEN 'etica' THEN 13
    WHEN 'tecnica' THEN 12
    WHEN 'gobernanza' THEN 10
    WHEN 'roi' THEN 4
    ELSE 8
  END;

  v_signal_sum := v_signal_sum + CASE v_aiact_level
    WHEN 'prohibited' THEN 15
    WHEN 'high' THEN 12
    WHEN 'limited' THEN 6
    ELSE 0
  END;

  IF coalesce(p_affects_persons, false) THEN
    v_signal_sum := v_signal_sum + 5;
  END IF;

  IF coalesce(p_has_minors, false) THEN
    v_signal_sum := v_signal_sum + 6;
  END IF;

  IF coalesce(p_vulnerable_groups, false) THEN
    v_signal_sum := v_signal_sum + 5;
  END IF;

  IF coalesce(p_biometric, false) THEN
    v_signal_sum := v_signal_sum + 6;
  END IF;

  IF v_domain IN ('salud', 'medicina', 'salud y medicina', 'finanzas', 'banca', 'banca y finanzas', 'seguros') THEN
    v_signal_sum := v_signal_sum + 6;
  ELSIF v_domain IN ('sector publico', 'sector público', 'gobierno', 'gobierno y sector publico', 'gobierno y sector público') THEN
    v_signal_sum := v_signal_sum + 5;
  END IF;

  IF coalesce(p_critical_infra, false) THEN
    v_signal_sum := v_signal_sum + 6;
  END IF;

  v_is_generative := coalesce(p_is_gpai, false) OR v_output_type = 'generacion';
  IF v_is_generative THEN
    v_signal_sum := v_signal_sum + 4;
  END IF;

  IF v_ai_system_type = 'agentico' OR coalesce(p_has_external_tools, false) THEN
    v_signal_sum := v_signal_sum + 4;
  END IF;

  v_signal_score := least(25, v_signal_sum);

  v_base := v_severity_score + v_dimension_score + v_signal_score;
  v_final := least(100, round(v_base * (0.75 + coalesce(p_w, 1.0) / 4.0)));

  v_level := CASE
    WHEN v_final >= 70 THEN 'critical'
    WHEN v_final >= 50 THEN 'high'
    WHEN v_final >= 30 THEN 'medium'
    ELSE 'low'
  END;

  IF p_s_default >= 8 THEN
    v_hard_override := true;
  END IF;

  IF coalesce(p_biometric, false) AND coalesce(p_affects_persons, false) THEN
    v_hard_override := true;
  END IF;

  IF coalesce(p_has_minors, false) AND v_dimension IN ('etica', 'legal_b', 'seguridad') THEN
    v_hard_override := true;
  END IF;

  IF v_aiact_level IN ('high', 'prohibited') AND v_dimension IN ('legal_b', 'seguridad', 'etica') THEN
    v_hard_override := true;
  END IF;

  IF coalesce(p_vulnerable_groups, false) AND v_dimension IN ('etica', 'legal_b', 'seguridad') THEN
    v_hard_override := true;
  END IF;

  IF v_hard_override OR v_level IN ('critical', 'high') THEN
    v_status := 'prioritized';
  ELSE
    v_status := 'monitoring';
  END IF;

  RETURN QUERY
  SELECT v_final::smallint, v_level, v_status;
END;
$$;

COMMENT ON FUNCTION fluxion.calculate_failure_mode_priority IS
  'Calcula priority_score, priority_level y priority_status para un modo de fallo activado en el contexto de un sistema. No modifica S_default.';

-- ---------------------------------------------------------------------------
-- 5. Función de autorización para cambios humanos
-- ---------------------------------------------------------------------------
--
-- Política v1:
--   - Subir a prioritized: permitido para roles operativos
--   - pending_review -> monitoring: permitido para roles operativos
--   - Cambiar a dismissed:
--       * modo no sensible -> admin, dpo, technical
--       * modo sensible    -> solo admin
--   - dismissed siempre requiere notas
--   - sensible + dismissed requiere notas >= 80 chars

CREATE OR REPLACE FUNCTION fluxion.check_priority_status_change_authorization(
  p_from_status fluxion.priority_status,
  p_to_status fluxion.priority_status,
  p_priority_notes text,
  p_s_default smallint,
  p_dimension text,
  p_aiact_risk_level text,
  p_has_minors boolean,
  p_biometric boolean,
  p_vulnerable_groups boolean,
  p_user_role text
)
RETURNS TABLE (
  allowed boolean,
  reason text
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_dimension text := lower(coalesce(p_dimension, ''));
  v_aiact_level text := lower(coalesce(p_aiact_risk_level, ''));
  v_is_dismissal boolean := (p_to_status = 'dismissed');
  v_is_sensitive boolean := false;
  v_notes_length int := coalesce(length(trim(p_priority_notes)), 0);
BEGIN
  IF p_user_role IN ('auditor', 'viewer') THEN
    RETURN QUERY SELECT false, 'Rol sin permisos de escritura sobre prioridad'::text;
    RETURN;
  END IF;

  IF NOT v_is_dismissal THEN
    IF p_to_status = 'prioritized' AND p_user_role IN ('admin', 'dpo', 'technical', 'executive') THEN
      RETURN QUERY SELECT true, 'Cambio libre: subir a prioritized'::text;
      RETURN;
    END IF;

    IF p_from_status = 'pending_review'
       AND p_to_status = 'monitoring'
       AND p_user_role IN ('admin', 'dpo', 'technical', 'executive')
    THEN
      RETURN QUERY SELECT true, 'Cambio libre: pending_review -> monitoring'::text;
      RETURN;
    END IF;

    RETURN QUERY SELECT true, 'Cambio permitido'::text;
    RETURN;
  END IF;

  v_is_sensitive := (
    p_s_default >= 8
    OR coalesce(p_has_minors, false)
    OR coalesce(p_biometric, false)
    OR coalesce(p_vulnerable_groups, false)
    OR (
      v_aiact_level IN ('high', 'prohibited')
      AND v_dimension IN ('legal_b', 'seguridad', 'etica')
    )
  );

  IF NOT v_is_sensitive THEN
    IF p_user_role IN ('admin', 'dpo', 'technical') THEN
      RETURN QUERY SELECT true, 'Descarte de modo no sensible permitido'::text;
      RETURN;
    END IF;

    RETURN QUERY SELECT false, 'Solo admin, dpo o technical pueden descartar modos no sensibles'::text;
    RETURN;
  END IF;

  IF p_user_role != 'admin' THEN
    RETURN QUERY SELECT false, 'Modo sensible: solo admin puede descartar este modo de fallo'::text;
    RETURN;
  END IF;

  IF v_notes_length < 80 THEN
    RETURN QUERY SELECT false, 'Justificación insuficiente: se requieren al menos 80 caracteres para descartar un modo sensible'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Descarte de modo sensible autorizado'::text;
END;
$$;

COMMENT ON FUNCTION fluxion.check_priority_status_change_authorization IS
  'Verifica si un usuario puede cambiar priority_status. Restringe especialmente el paso a dismissed para modos sensibles.';

-- ---------------------------------------------------------------------------
-- 6. Índices
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_sfm_prioritized
  ON fluxion.system_failure_modes(ai_system_id, priority_status)
  WHERE priority_status = 'prioritized';

CREATE INDEX IF NOT EXISTS idx_sfm_score_by_system
  ON fluxion.system_failure_modes(ai_system_id, priority_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_sfm_pending_review
  ON fluxion.system_failure_modes(ai_system_id)
  WHERE priority_status = 'pending_review';

CREATE INDEX IF NOT EXISTS idx_sfm_human_changes
  ON fluxion.system_failure_modes(priority_changed_by, priority_changed_at)
  WHERE priority_source = 'human';

-- ---------------------------------------------------------------------------
-- 7. Constraint mínima de integridad
-- ---------------------------------------------------------------------------

ALTER TABLE fluxion.system_failure_modes
  DROP CONSTRAINT IF EXISTS chk_dismissed_requires_notes;

ALTER TABLE fluxion.system_failure_modes
  ADD CONSTRAINT chk_dismissed_requires_notes
  CHECK (
    priority_status != 'dismissed'
    OR (priority_notes IS NOT NULL AND length(trim(priority_notes)) > 0)
  );

