-- ============================================================================
-- Registro de riesgos de negocio
-- ============================================================================
-- Los modos con origin='negocio' salieron del FMEA en el paso anterior porque
-- no comparten escala con los regulatorios: la gravedad de un sobrecoste y la
-- de una discriminacion no se miden igual.
--
-- Pero siguen siendo riesgos reales. Un sistema puede ser impecable frente al
-- Reglamento y morirse porque necesitaba GPU que nadie presupuesto. La ISO
-- 42001 ademas da cobertura: su evaluacion de riesgos mira los objetivos de la
-- organizacion, no solo el cumplimiento legal.
--
-- ── En que se diferencia del FMEA, y por que ───────────────────────────────
--
--   FMEA regulatorio            Registro de negocio
--   ────────────────            ───────────────────
--   S, O y D                    Probabilidad x impacto
--   Evidencia para un auditor   Conversacion con quien paga
--   Diez anos (Art. 18)         Retencion normal
--   Aprobacion por comite       Ninguna
--   Justificacion de 50 car.    Libre
--
-- No es un FMEA descafeinado: es otro instrumento. Estimar el impacto de un
-- sobrecoste con la escala de un dano a personas es forzado, y rellenarlo con
-- ese rigor cuesta un tiempo que no compra nada.
-- ============================================================================


DO $$ BEGIN
  CREATE TYPE fluxion.business_risk_response AS ENUM (
    'mitigar',    -- reducir probabilidad o impacto
    'aceptar',    -- se asume conscientemente
    'transferir', -- seguro, contrato, proveedor
    'evitar'      -- se cambia el plan para que no pueda ocurrir
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


CREATE TABLE IF NOT EXISTS fluxion.business_risk_assessments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  ai_system_id     uuid NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,

  -- Sin clave ajena al catalogo de compliance: los esquemas se mantienen
  -- separados, igual que en system_failure_modes.
  failure_mode_id  uuid NOT NULL,

  probability      smallint NOT NULL CHECK (probability BETWEEN 1 AND 5),
  impact           smallint NOT NULL CHECK (impact BETWEEN 1 AND 5),

  -- Exposicion = probabilidad x impacto, calculada y no escrita: un numero
  -- derivado que alguien puede teclear a mano acaba contradiciendo a sus
  -- factores.
  exposure         smallint GENERATED ALWAYS AS (probability * impact) STORED,

  response         fluxion.business_risk_response NOT NULL DEFAULT 'mitigar',

  -- Libre a proposito. Esto no es evidencia regulatoria y exigirle 50
  -- caracteres seria copiar un rigor que aqui no compra nada.
  justification    text,

  owner_id         uuid REFERENCES fluxion.profiles(id),
  review_due       date,

  created_by       uuid REFERENCES fluxion.profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- Aceptar un riesgo sin decir por que es firmar en blanco. Es la unica
  -- exigencia que se hereda del lado regulatorio, y por buen motivo.
  CONSTRAINT chk_aceptar_justificado CHECK (
    response <> 'aceptar' OR (justification IS NOT NULL AND length(btrim(justification)) > 0)
  ),

  UNIQUE (ai_system_id, failure_mode_id)
);

CREATE INDEX IF NOT EXISTS idx_business_risks_sistema
  ON fluxion.business_risk_assessments (ai_system_id, exposure DESC);

COMMENT ON TABLE fluxion.business_risk_assessments IS
  'Valoracion de los riesgos de negocio de un sistema. Probabilidad x impacto, '
  'no S/O/D: es otro instrumento, no un FMEA descafeinado.';


CREATE OR REPLACE FUNCTION fluxion.set_business_risks_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_risks_updated_at ON fluxion.business_risk_assessments;
CREATE TRIGGER trg_business_risks_updated_at
  BEFORE UPDATE ON fluxion.business_risk_assessments
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_business_risks_updated_at();


-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.business_risk_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_risks_select ON fluxion.business_risk_assessments;
CREATE POLICY business_risks_select ON fluxion.business_risk_assessments
  FOR SELECT USING (organization_id = fluxion.auth_user_org_id());

DROP POLICY IF EXISTS business_risks_write ON fluxion.business_risk_assessments;
CREATE POLICY business_risks_write ON fluxion.business_risk_assessments
  FOR ALL
  USING (organization_id = fluxion.auth_user_org_id())
  WITH CHECK (organization_id = fluxion.auth_user_org_id());

-- Escritura para `authenticated`: las acciones de este modulo usan el cliente
-- del usuario, como el resto del inventario. Concederlo aqui es lo que faltaba
-- en la estimacion por familia y costo un «permission denied».
GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.business_risk_assessments TO authenticated;
GRANT ALL ON fluxion.business_risk_assessments TO service_role;


-- ── Los riesgos de negocio de un sistema, valorados o no ────────────────────
--
-- Parte de los modos ya activados con origen `negocio`: no hay que volver a
-- activarlos, el motor de reglas ya los detecto. Lo que faltaba era donde
-- valorarlos.

CREATE OR REPLACE VIEW fluxion.v_business_risks
WITH (security_invoker = true) AS
SELECT
  sfm.ai_system_id,
  sfm.organization_id,
  sfm.failure_mode_id,
  fm.code,
  fm.name,
  fm.description,
  fm.subcategoria,
  fm.bloque,
  a.id            AS assessment_id,
  a.probability,
  a.impact,
  a.exposure,
  a.response,
  a.justification,
  a.owner_id,
  a.review_due,
  a.updated_at    AS assessed_at
FROM fluxion.system_failure_modes sfm
JOIN compliance.failure_modes fm ON fm.id = sfm.failure_mode_id
LEFT JOIN fluxion.business_risk_assessments a
       ON a.ai_system_id = sfm.ai_system_id
      AND a.failure_mode_id = sfm.failure_mode_id
WHERE fm.origin = 'negocio';

COMMENT ON VIEW fluxion.v_business_risks IS
  'Riesgos de negocio activados para cada sistema, con su valoracion si la '
  'tienen. Sale de los modos que el motor ya activo: no hay una segunda '
  'activacion.';

GRANT SELECT ON fluxion.v_business_risks TO authenticated, service_role;
