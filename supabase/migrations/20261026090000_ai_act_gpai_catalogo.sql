-- ============================================================================
-- AI Act: GPAI fuera de los niveles de riesgo y catálogo de obligaciones (B13d)
-- ============================================================================
--   1. GPAI deja de ser un nivel de riesgo (D3, DP-10). Los sistemas con
--      `aiact_risk_level = 'gpai'` pasan a la categoría (`is_gpai`), con el nivel
--      «Pendiente de clasificar» y la marca «Pendiente de revisar con el motor
--      nuevo». Un CHECK impide volver a usar el valor. El valor sigue en el enum
--      (quitarlo obliga a recrear las vistas que dependen de la columna) y en
--      `classification_events.risk_level` para el histórico.
--   2. Catálogo (DP-10, §4.9 de la especificación del cuestionario):
--      - el Art. 50 se divide en 50.1 a 50.4 (RN-O03); la fila antigua queda
--        retirada (`retired_at`) para conservar las obligaciones ya registradas;
--      - obligación nueva del Art. 6.4 (documentar la excepción del Art. 6.3 y
--        registrarla, Art. 49.2) (RN-O07);
--      - el Art. 27 solo en los supuestos del Art. 27.1 (RN-O06): cambia la
--        descripción; la regla la aplica el motor y la vista.
--   3. `compliance.v_system_obligations` según RN-O01 a RN-O07, a partir del
--      resultado del motor (`aiact_result`). Los sistemas sin resultado (sin
--      reclasificar desde B13a) usan el nivel y marcan `condicional`.
--
-- Idempotente. Aplicar después de 20261022090000_ai_act_motor_unico.sql.
-- ============================================================================


-- ── 1. GPAI fuera de los niveles de riesgo ──────────────────────────────────

DO $$
DECLARE n int;
BEGIN
  UPDATE fluxion.ai_systems
     SET is_gpai = true,
         aiact_risk_level = 'pending',
         aiact_review_pending = true
   WHERE aiact_risk_level = 'gpai';
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'B13d: % sistemas con nivel GPAI pasan a la categoría GPAI, pendientes de clasificar', n;
END $$;

ALTER TABLE fluxion.ai_systems DROP CONSTRAINT IF EXISTS chk_ai_systems_aiact_risk_level_sin_gpai;
ALTER TABLE fluxion.ai_systems ADD CONSTRAINT chk_ai_systems_aiact_risk_level_sin_gpai
  CHECK (aiact_risk_level IS DISTINCT FROM 'gpai');

COMMENT ON TYPE fluxion.aiact_risk_level IS
  'Nivel de riesgo AI Act. `gpai` está en desuso desde B13d (la categoría GPAI va en `ai_systems.is_gpai`) y lo impide chk_ai_systems_aiact_risk_level_sin_gpai.';


-- ── 2. Catálogo de obligaciones ─────────────────────────────────────────────

ALTER TABLE compliance.obligations ADD COLUMN IF NOT EXISTS retired_at timestamptz;
COMMENT ON COLUMN compliance.obligations.retired_at IS
  'Obligación retirada del catálogo: no se sugiere a ningún sistema, pero se conserva para las obligaciones ya registradas (B13d).';

INSERT INTO compliance.obligations (code, framework, article, title, description, scope, applies_to_roles)
SELECT v.code, 'AI_ACT', v.article, v.title, v.description, v.scope, v.roles::fluxion.value_chain_role[]
  FROM (VALUES
    ('AI-ACT-ART50-1', 'Art. 50.1',
     'Informar de la interacción con un sistema de IA',
     'El proveedor diseña y desarrolla los sistemas destinados a interactuar directamente con personas físicas de forma que estas sepan que interactúan con un sistema de IA, salvo que resulte evidente para una persona razonablemente informada, atenta y perspicaz.',
     'transparency', '{provider}'),
    ('AI-ACT-ART50-2', 'Art. 50.2',
     'Marcado del contenido sintético',
     'El proveedor de sistemas que generan contenido sintético de audio, imagen, vídeo o texto garantiza que la información de salida esté marcada en un formato legible por máquina y que sea detectable que se ha generado o manipulado de forma artificial.',
     'transparency', '{provider}'),
    ('AI-ACT-ART50-3', 'Art. 50.3',
     'Informar del reconocimiento de emociones o la categorización biométrica',
     'El responsable del despliegue de un sistema de reconocimiento de emociones o de categorización biométrica informa de su funcionamiento a las personas físicas expuestas a él y trata los datos personales conforme a la normativa de protección de datos.',
     'transparency', '{deployer}'),
    ('AI-ACT-ART50-4', 'Art. 50.4',
     'Revelar ultrafalsificaciones y textos generados de interés público',
     'El responsable del despliegue de un sistema que genera o manipula ultrafalsificaciones hace público que el contenido se ha generado o manipulado de forma artificial. Lo mismo para el texto publicado con el fin de informar al público sobre asuntos de interés público, salvo revisión humana o control editorial con responsabilidad editorial.',
     'transparency', '{deployer}'),
    ('AI-ACT-ART6-4', 'Art. 6.4',
     'Documentar la excepción del Art. 6.3 y registrar el sistema',
     'El proveedor que considera que un sistema del Anexo III no es de alto riesgo (Art. 6.3) documenta su evaluación antes de introducirlo en el mercado o ponerlo en servicio, la facilita a las autoridades nacionales competentes que la soliciten y registra el sistema en la base de datos de la UE (Art. 49.2).',
     'high_risk', '{provider}')
  ) AS v(code, article, title, description, scope, roles)
 WHERE NOT EXISTS (SELECT 1 FROM compliance.obligations o WHERE o.code = v.code);

-- Los tipos de evidencia del Art. 50 valen para cada apartado.
INSERT INTO compliance.obligation_evidence_types (obligation_id, evidence_type_id, requirement_level, notes)
SELECT n.id, et.evidence_type_id, et.requirement_level, et.notes
  FROM compliance.obligations n
  JOIN compliance.obligations o ON o.code = 'AI-ACT-ART50'
  JOIN compliance.obligation_evidence_types et ON et.obligation_id = o.id
 WHERE n.code IN ('AI-ACT-ART50-1', 'AI-ACT-ART50-2', 'AI-ACT-ART50-3', 'AI-ACT-ART50-4')
   AND NOT EXISTS (
     SELECT 1 FROM compliance.obligation_evidence_types x
      WHERE x.obligation_id = n.id AND x.evidence_type_id = et.evidence_type_id
   );

UPDATE compliance.obligations
   SET retired_at = coalesce(retired_at, now()),
       title = 'Obligaciones de transparencia de determinados sistemas (dividida en 50.1 a 50.4)'
 WHERE code = 'AI-ACT-ART50';

UPDATE compliance.obligations
   SET description = 'Antes de desplegar un sistema de alto riesgo del Anexo III (salvo el punto 2), el responsable del despliegue que sea un organismo de derecho público o una entidad privada que presta servicios públicos, o que despliegue sistemas de los puntos 5.b o 5.c, evalúa su impacto en los derechos fundamentales (Art. 27.1).'
 WHERE code = 'AI-ACT-ART27';


-- ── 3. Vista de obligaciones por sistema ────────────────────────────────────
--
-- Misma lógica que `suggestObligations` (apps/web/lib/ai-act/obligations.ts).

DROP VIEW IF EXISTS compliance.v_system_obligations;

CREATE VIEW compliance.v_system_obligations
WITH (security_invoker = true) AS
WITH s AS (
  SELECT
    s.id,
    s.organization_id,
    s.value_chain_roles AS roles,
    s.aiact_result AS r,
    s.aiact_risk_level::text AS lvl,
    coalesce(s.aiact_scope, CASE WHEN s.aiact_risk_level IS NULL THEN 'pending' ELSE 'in_scope' END) AS ambito,
    coalesce((s.aiact_result -> 'gpai' ->> 'modelProvider')::boolean, s.is_gpai, false) AS proveedor_gpai,
    coalesce(s.aiact_result -> 'gpai' ->> 'systemicRisk', s.gpai_systemic_risk) AS riesgo_sistemico,
    (s.aiact_inputs ->> 'publicBody')::boolean AS organismo_publico,
    CASE WHEN s.aiact_result -> 'highRiskRoute' ->> 'annex' = 'III'
         THEN ARRAY(SELECT jsonb_array_elements_text(s.aiact_result -> 'highRiskRoute' -> 'points'))
         ELSE ARRAY[]::text[] END AS anexo_iii,
    (s.aiact_result -> 'highRiskRoute' ->> 'annex' = 'I'
       AND s.aiact_result -> 'highRiskRoute' ->> 'section' = 'B') AS anexo_i_b
  FROM fluxion.ai_systems s
)
SELECT
  s.id            AS ai_system_id,
  s.organization_id,
  o.code,
  o.framework,
  o.article,
  o.title,
  o.scope,
  o.applies_to_roles,
  -- Por qué aplica, para poder explicarlo sin abrir el código.
  CASE
    WHEN o.framework <> 'AI_ACT'                   THEN 'Sistema de gestión'
    WHEN cardinality(o.applies_to_roles) = 0       THEN 'Aplica a cualquier rol'
    ELSE 'Rol: ' || array_to_string(o.applies_to_roles::text[], ', ')
  END AS motivo,
  -- Sin resultado del motor (sistema sin reclasificar desde B13a), las
  -- obligaciones de transparencia y de la excepción del Art. 6.3 son una
  -- aproximación por nivel.
  (o.framework = 'AI_ACT' AND s.r IS NULL AND (o.scope = 'transparency' OR o.code IN ('AI-ACT-ART6-4', 'AI-ACT-ART27'))) AS condicional
FROM s
JOIN compliance.obligations o ON o.retired_at IS NULL
WHERE
  -- ISO 42001 obliga a la organización, no a un rol del Reglamento.
  o.framework <> 'AI_ACT'
  OR (
    s.ambito = 'in_scope'
    -- El Art. 5 se sugiere con práctica prohibida aunque no haya rol declarado.
    AND (o.code = 'AI-ACT-ART5' OR cardinality(o.applies_to_roles) = 0 OR o.applies_to_roles && s.roles)
    AND CASE
      -- RN-O05: práctica prohibida → solo el Art. 5.
      WHEN s.lvl = 'prohibited' THEN o.code = 'AI-ACT-ART5'
      WHEN o.code = 'AI-ACT-ART5' THEN false
      -- RN-O07: excepción del Art. 6.3 válida y rol Proveedor.
      WHEN o.code = 'AI-ACT-ART6-4' THEN
        CASE WHEN s.r IS NULL THEN false
             ELSE s.r ->> 'art63' = 'valid' AND 'provider' = ANY (s.roles) END
      -- RN-O06: FRIA solo en los supuestos del Art. 27.1.
      WHEN o.code = 'AI-ACT-ART27' THEN
        s.lvl = 'high' AND 'deployer' = ANY (s.roles)
        AND CASE WHEN s.r IS NULL THEN true
                 ELSE EXISTS (SELECT 1 FROM unnest(s.anexo_iii) p WHERE p <> '2')
                      AND (s.organismo_publico IS TRUE OR s.anexo_iii && ARRAY['5b', '5c']) END
      -- RN-O03: cada apartado del Art. 50 según su supuesto y su obligado.
      WHEN o.scope = 'transparency' THEN
        CASE WHEN s.r IS NULL THEN s.lvl IN ('limited', 'high')
             ELSE EXISTS (
               SELECT 1 FROM jsonb_array_elements(coalesce(s.r -> 'transparency', '[]'::jsonb)) t
                WHERE 'AI-ACT-ART' || replace(t ->> 'article', '.', '-') = o.code
                  AND (t ->> 'obligated') = ANY (s.roles::text[])
             ) END
      -- RN-O01
      WHEN o.scope = 'all' THEN true
      -- RN-O02. Anexo I Sección B: revisión manual (RN-H04).
      WHEN o.scope = 'high_risk' THEN s.lvl = 'high' AND NOT coalesce(s.anexo_i_b, false)
      -- RN-O04: Art. 55 solo con riesgo sistémico.
      WHEN o.scope = 'gpai' THEN
        s.proveedor_gpai AND (o.code <> 'AI-ACT-ART55' OR s.riesgo_sistemico = 'yes')
      -- Sin alcance reconocido: el motor no la sugiere.
      ELSE false
    END
  );

COMMENT ON VIEW compliance.v_system_obligations IS
  'Obligaciones aplicables a cada sistema según RN-O01 a RN-O07 (B13d), con la misma lógica que el motor '
  '(lib/ai-act/obligations.ts). `condicional` marca las que se aproximan por nivel porque el sistema aún '
  'no tiene resultado del motor.';

GRANT SELECT ON compliance.v_system_obligations TO authenticated, service_role;
