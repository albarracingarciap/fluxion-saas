-- ─────────────────────────────────────────────────────────────────────────────
-- C2 · Supervisión humana efectiva (HITL)
--
-- El artículo 14 exige supervisión humana EFECTIVA. Casi todo el mundo lo
-- documenta con una frase: "las decisiones son revisadas por un profesional".
-- Eso no es evidencia de nada, porque un auditor puede preguntar cuántas veces
-- ese profesional estuvo en desacuerdo con la máquina — y si la respuesta es
-- "nunca", lo que hay no es supervisión, es un sello de goma.
--
-- Verificado contra el texto oficial (AI Act Service Desk de la Comisión):
--   · Art. 14.4.d — descartar, invalidar o revertir el resultado
--   · Art. 14.4.b — sesgo de automatización
--   · Art. 26.2   — competencia, formación y autoridad de quien supervisa
--   · Art. 26.6   — los registros se conservan al menos SEIS MESES
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Taxonomía de motivos ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.hitl_reason_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL = catálogo común de Fluxion. Con valor = código propio del cliente.
  organization_id uuid REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  code            text NOT NULL,
  label           text NOT NULL,
  description     text,

  -- Agrupa para el análisis: ¿el modelo falla por datos, por contexto que no
  -- ve, o porque la persona aporta un criterio que la máquina no tiene?
  category        text NOT NULL DEFAULT 'other'
                    CHECK (category IN ('model_error','missing_context','human_judgement','process','other')),

  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hitl_reason_codes
  ON fluxion.hitl_reason_codes (
    coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
    code
  );

COMMENT ON TABLE fluxion.hitl_reason_codes IS
  'Motivos de discordancia. Cerrados para poder agregar, ampliables por organización para que se usen de verdad.';

-- ── Decisiones ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.hitl_decisions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  ai_system_id      uuid NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,

  -- Identificador OPACO del caso en el sistema del cliente. Nunca un nombre, un
  -- documento de identidad ni un número de historia clínica: si Fluxion
  -- guardase eso sería encargado del tratamiento de datos de salud de los
  -- pacientes de su cliente. La ventaja de no tenerlos es que no hay que
  -- protegerlos.
  case_ref          text NOT NULL,

  -- Qué propuso la IA, reducido a etiqueta y confianza.
  ai_suggestion     text,
  ai_confidence     numeric(5,4) CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),

  -- Qué hizo la persona. Las cuatro opciones salen literalmente del art. 14.4.d:
  -- descartar, invalidar, revertir el resultado, o no utilizar el sistema.
  decision          text NOT NULL
                      CHECK (decision IN ('accepted','modified','overridden','not_used')),
  human_outcome     text,

  -- Se DERIVA de `decision` en un disparador; no se acepta del cliente. Es la
  -- columna sobre la que se calcula toda la evidencia, y dejar que la envíe
  -- quien quiera sería dejar que el auditado escriba su propia nota.
  agreement         boolean NOT NULL DEFAULT true,

  reason_code       text,
  reason_note       text,

  -- Quién decidió y con qué autoridad (art. 26.2). Seudonimizado: el cliente
  -- manda un identificador estable, no el nombre del radiólogo.
  reviewer_ref      text,
  reviewer_role     text,

  -- Sesgo de automatización (art. 14.4.b). Una decisión tomada en 1,2 segundos
  -- sobre un caso complejo no es supervisión, es un clic. Sin esta columna, el
  -- sesgo de automatización se queda en una advertencia de manual.
  decided_in_ms     integer CHECK (decided_in_ms IS NULL OR decided_in_ms >= 0),

  occurred_at       timestamptz NOT NULL DEFAULT now(),
  received_at       timestamptz NOT NULL DEFAULT now(),
  api_key_id        uuid REFERENCES fluxion.api_keys(id) ON DELETE SET NULL,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,

  dedupe_key        text,
  CONSTRAINT uq_hitl_dedupe UNIQUE (organization_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_hitl_org_system_time
  ON fluxion.hitl_decisions (organization_id, ai_system_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_hitl_discordancias
  ON fluxion.hitl_decisions (organization_id, ai_system_id, occurred_at DESC)
  WHERE NOT agreement;

CREATE INDEX IF NOT EXISTS idx_hitl_reviewer
  ON fluxion.hitl_decisions (organization_id, reviewer_ref, occurred_at DESC);

COMMENT ON COLUMN fluxion.hitl_decisions.case_ref IS
  'Referencia opaca del caso. El cliente sabe resolverla; Fluxion no.';

-- ── `agreement` se deriva, no se declara ─────────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.hitl_set_agreement()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- 'modified' cuenta como desacuerdo: si la persona tuvo que cambiar la
  -- salida, la sugerencia no era la correcta. Tratarlo como conformidad
  -- inflaría la tasa de concordancia, que es justo la cifra que un auditor
  -- viene a mirar.
  NEW.agreement := (NEW.decision = 'accepted');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hitl_agreement ON fluxion.hitl_decisions;
CREATE TRIGGER trg_hitl_agreement
  BEFORE INSERT OR UPDATE ON fluxion.hitl_decisions
  FOR EACH ROW EXECUTE FUNCTION fluxion.hitl_set_agreement();

-- ── Semilla de motivos ───────────────────────────────────────────────────────

INSERT INTO fluxion.hitl_reason_codes (organization_id, code, label, description, category)
VALUES
  (NULL, 'model_error',              'Error del modelo',
   'La sugerencia es incorrecta con la información que el sistema tenía.', 'model_error'),
  (NULL, 'low_confidence',           'Confianza insuficiente',
   'La sugerencia podía ser correcta, pero no con certeza suficiente para actuar.', 'model_error'),
  (NULL, 'contradicts_context',      'Contradice el contexto',
   'Hay información relevante que el sistema no ve.', 'missing_context'),
  (NULL, 'outdated_data',            'Datos desactualizados',
   'El sistema decidió con información que ya no es válida.', 'missing_context'),
  (NULL, 'professional_judgement',   'Criterio profesional',
   'La persona aporta un juicio que el sistema no puede replicar.', 'human_judgement'),
  (NULL, 'ethical_concern',          'Reparo ético o de equidad',
   'La sugerencia plantea un problema de trato justo o de derechos.', 'human_judgement'),
  (NULL, 'regulatory_constraint',    'Restricción normativa',
   'Una norma impide seguir la sugerencia.', 'process'),
  (NULL, 'process_exception',        'Excepción del proceso',
   'El caso sale del supuesto para el que el sistema está previsto.', 'process'),
  (NULL, 'other',                    'Otro',
   'Se detalla en el texto libre.', 'other')
ON CONFLICT DO NOTHING;

-- ── Retención ────────────────────────────────────────────────────────────────

COMMENT ON TABLE fluxion.hitl_decisions IS
  'Decisiones humanas sobre sugerencias de IA. Art. 26.6: se conservan al menos SEIS MESES. Ese es el suelo legal, no una elección de producto: no purgar por debajo de ese plazo.';

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.hitl_decisions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.hitl_reason_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hitl_decisions_select ON fluxion.hitl_decisions;
CREATE POLICY hitl_decisions_select ON fluxion.hitl_decisions
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS hitl_reason_codes_select ON fluxion.hitl_reason_codes;
CREATE POLICY hitl_reason_codes_select ON fluxion.hitl_reason_codes
  FOR SELECT USING (
    organization_id IS NULL
    OR organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS hitl_reason_codes_write ON fluxion.hitl_reason_codes;
CREATE POLICY hitl_reason_codes_write ON fluxion.hitl_reason_codes
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

-- La escritura de decisiones llega por el endpoint de ingesta con service_role,
-- autenticado por clave de API. Ningún navegador escribe aquí.
GRANT SELECT ON fluxion.hitl_decisions   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.hitl_reason_codes TO authenticated;
GRANT ALL ON fluxion.hitl_decisions      TO service_role;
GRANT ALL ON fluxion.hitl_reason_codes   TO service_role;
