-- ============================================================================
-- FMEA · estimacion por familia
-- ============================================================================
-- Un sistema activa 286 modos de fallo y prioriza 119. Evaluar 119 items a mano
-- —O, D y una justificacion escrita en cada uno— son unas seis horas de trabajo
-- experto por sistema. Para una consultora es tiempo facturable; para un cliente
-- que se lo hace solo, es un muro.
--
-- Pero esos 119 caen en 10 familias causales. Fijar O y D por familia y ajustar
-- despues los que se salgan convierte 119 decisiones en 10 mas las excepciones.
--
-- NO REBAJA EL RIGOR. Estimar por familia causal y refinar las excepciones es
-- practica estandar de FMEA; el Art. 9 exige que la estimacion este documentada
-- y justificada, no que se haga de una en una. La justificacion incluso mejora:
-- «estos 48 modos comparten causa y control, y por eso comparten O y D» dice
-- mas que 48 textos copiados.
--
-- ── Lo que esta migracion NO hace ──────────────────────────────────────────
--
-- No propaga. La regla que deriva la S a partir de O, D y la severidad por
-- defecto vive en `apps/web/lib/fmea/domain.ts`. Reimplementarla aqui dejaria
-- dos verdades sobre lo mismo, y el dia que una cambie el expediente diria una
-- cosa distinta segun quien lo mire.
--
-- La base guarda las estimaciones; la propagacion la hace la accion de
-- servidor, que reutiliza esa funcion.
-- ============================================================================


-- ── La estimacion de una familia ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.fmea_family_estimates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id  uuid NOT NULL REFERENCES fluxion.fmea_evaluations(id) ON DELETE CASCADE,

  -- Etiqueta tal cual aparece en system_failure_modes.activation_family_labels.
  -- No hay tabla de familias: las genera el motor de activacion.
  family_label   text NOT NULL,

  o_value        integer NOT NULL CHECK (o_value BETWEEN 1 AND 5),
  d_value        integer NOT NULL CHECK (d_value BETWEEN 1 AND 5),

  -- Obligatoria, y con el mismo minimo de 50 caracteres que se le exige a la
  -- justificacion de un item individual. Sustituye a todas las de la familia:
  -- rebajarle el liston seria cambiar rigor por comodidad.
  justification  text NOT NULL CHECK (length(btrim(justification)) >= 50),

  created_by     uuid REFERENCES fluxion.profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  UNIQUE (evaluation_id, family_label)
);

CREATE INDEX IF NOT EXISTS idx_fmea_family_estimates_eval
  ON fluxion.fmea_family_estimates (evaluation_id);

COMMENT ON TABLE fluxion.fmea_family_estimates IS
  'Estimacion de O y D para una familia causal completa. Los items la heredan '
  'salvo que se hayan ajustado a mano.';


-- ── De donde salio el valor de cada item ────────────────────────────────────
--
-- `manual` gana siempre sobre `family`: un ajuste individual no se pisa al
-- reestimar la familia. Sin esto, corregir una familia borraria el trabajo fino
-- que alguien hizo encima, que es la forma mas rapida de que nadie se fie de la
-- herramienta.

ALTER TABLE fluxion.fmea_items
  ADD COLUMN IF NOT EXISTS estimate_source text
    CHECK (estimate_source IS NULL OR estimate_source IN ('family', 'manual'));

-- Las familias de las que hereda. Puede ser mas de una: los 119 modos del
-- sistema de prueba suman 209 pertenencias.
ALTER TABLE fluxion.fmea_items
  ADD COLUMN IF NOT EXISTS estimate_families text[];

COMMENT ON COLUMN fluxion.fmea_items.estimate_source IS
  'family = el valor lo puso una estimacion de familia. manual = alguien lo '
  'ajusto individualmente, y reestimar la familia no lo pisa.';

COMMENT ON COLUMN fluxion.fmea_items.estimate_families IS
  'Familias de las que hereda el valor. Con varias, manda la mas severa en cada '
  'eje: ante dos estimaciones, en gestion de riesgos se toma la peor.';


-- ── Que items cubre cada estimacion ─────────────────────────────────────────
--
-- Vista y no consulta suelta porque la usan la propagacion, la pantalla y
-- cualquier comprobacion posterior. Una sola definicion de «este item pertenece
-- a esta familia».

CREATE OR REPLACE VIEW fluxion.v_fmea_item_families
WITH (security_invoker = true) AS
SELECT
  i.id            AS item_id,
  i.evaluation_id,
  i.failure_mode_id,
  i.status,
  i.estimate_source,
  f                AS family_label
FROM fluxion.fmea_items i
JOIN fluxion.fmea_evaluations e ON e.id = i.evaluation_id
JOIN fluxion.system_failure_modes sfm
     ON sfm.ai_system_id = e.system_id
    AND sfm.failure_mode_id = i.failure_mode_id
CROSS JOIN LATERAL unnest(sfm.activation_family_labels) AS f;

COMMENT ON VIEW fluxion.v_fmea_item_families IS
  'Que familias cubren cada item de una evaluacion. Un item puede estar en '
  'varias.';

GRANT SELECT ON fluxion.v_fmea_item_families TO authenticated, service_role;


-- ── RLS ─────────────────────────────────────────────────────────────────────
--
-- La estimacion cuelga de una evaluacion, y la evaluacion ya lleva
-- organization_id: la pertenencia se comprueba a traves de ella.

ALTER TABLE fluxion.fmea_family_estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fmea_family_estimates_select ON fluxion.fmea_family_estimates;
CREATE POLICY fmea_family_estimates_select ON fluxion.fmea_family_estimates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fluxion.fmea_evaluations e
       WHERE e.id = evaluation_id
         AND e.organization_id = fluxion.auth_user_org_id()
    )
  );

GRANT SELECT ON fluxion.fmea_family_estimates TO authenticated;
GRANT ALL    ON fluxion.fmea_family_estimates TO service_role;


CREATE OR REPLACE FUNCTION fluxion.set_fmea_family_estimates_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fmea_family_estimates_updated_at ON fluxion.fmea_family_estimates;
CREATE TRIGGER trg_fmea_family_estimates_updated_at
  BEFORE UPDATE ON fluxion.fmea_family_estimates
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_fmea_family_estimates_updated_at();
