-- ============================================================================
-- Motor único de clasificación AI Act (B13a)
-- ============================================================================
-- Un solo motor (TypeScript, `apps/web/lib/ai-act/`) clasifica en el alta, la
-- edición y la reclasificación. El servicio Python deja de clasificar por
-- reglas: recibe el resultado y conserva los eventos de clasificación y la
-- conciliación de obligaciones.
--
--   1. `ai_systems`: supuestos AI Act (`aiact_inputs`), ámbito (`aiact_scope`,
--      DP-10: campo aparte, no un nivel), resultado completo con fundamento y
--      avisos (`aiact_result`), versión de las reglas, categoría GPAI (D3:
--      riesgo sistémico y «basado en un modelo GPAI de terceros») y la marca
--      «Pendiente de revisar con el motor nuevo».
--   2. `classification_events`: admite el nivel `pending` y un nivel nulo
--      (fuera del ámbito o no es IA); `gpai` se conserva para el histórico.
--   3. Obligaciones con los códigos del catálogo: las claves del motor Python
--      (`art_9`, `art_53_doc`…) y los códigos tomados del texto de la cabecera
--      («Art. 9») pasan a `AI-ACT-ART9`… en las obligaciones de los sistemas, en
--      los eventos y en sus diferencias. Las filas que quedan duplicadas en un
--      mismo sistema se archivan, conservando la más avanzada.
--   4. No se reclasifica en bloque: los sistemas existentes conservan su nivel y
--      quedan «Pendiente de revisar con el motor nuevo».
--
-- Idempotente: columnas con IF NOT EXISTS, traducciones que solo tocan claves
-- antiguas, marca solo en sistemas sin resultado del motor.
-- ============================================================================


-- ── 1. Columnas del motor en ai_systems ─────────────────────────────────────

ALTER TABLE fluxion.ai_systems
  ADD COLUMN IF NOT EXISTS aiact_inputs        jsonb,
  ADD COLUMN IF NOT EXISTS aiact_scope         text NOT NULL DEFAULT 'in_scope',
  ADD COLUMN IF NOT EXISTS aiact_scope_reason  text,
  ADD COLUMN IF NOT EXISTS aiact_result        jsonb,
  ADD COLUMN IF NOT EXISTS aiact_rules_version text,
  ADD COLUMN IF NOT EXISTS gpai_systemic_risk  text,
  ADD COLUMN IF NOT EXISTS gpai_third_party_based boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aiact_review_pending boolean NOT NULL DEFAULT false;

ALTER TABLE fluxion.ai_systems DROP CONSTRAINT IF EXISTS chk_ai_systems_aiact_scope;
ALTER TABLE fluxion.ai_systems ADD CONSTRAINT chk_ai_systems_aiact_scope
  CHECK (aiact_scope IN ('in_scope', 'out_of_scope', 'not_ai_system', 'pending'));

ALTER TABLE fluxion.ai_systems DROP CONSTRAINT IF EXISTS chk_ai_systems_gpai_systemic_risk;
ALTER TABLE fluxion.ai_systems ADD CONSTRAINT chk_ai_systems_gpai_systemic_risk
  CHECK (gpai_systemic_risk IS NULL OR gpai_systemic_risk IN ('yes', 'no', 'unknown'));

COMMENT ON COLUMN fluxion.ai_systems.aiact_inputs IS
  'Supuestos AI Act del sistema (B13): exclusiones del Art. 2, prácticas del Art. 5, Anexo I, Anexo III, Art. 6.3, Art. 50 y GPAI. NULL: sin supuestos (clasificación de respaldo).';
COMMENT ON COLUMN fluxion.ai_systems.aiact_scope IS
  'Ámbito del AI Act (DP-10): in_scope, out_of_scope, not_ai_system o pending. Fuera del ámbito o no IA, aiact_risk_level no aplica.';
COMMENT ON COLUMN fluxion.ai_systems.aiact_result IS
  'Resultado completo del motor único (lib/ai-act): fundamento, avisos, vía del alto riesgo, Art. 6.3, Art. 50, GPAI y roles.';
COMMENT ON COLUMN fluxion.ai_systems.is_gpai IS
  'D3: la organización es proveedora de un modelo de IA de uso general (ya no es un nivel de riesgo).';
COMMENT ON COLUMN fluxion.ai_systems.aiact_review_pending IS
  'Clasificado antes del motor único (B13a): pendiente de revisar con el motor nuevo.';


-- ── 2. Eventos de clasificación ──────────────────────────────────────────────

ALTER TABLE fluxion.classification_events ALTER COLUMN risk_level DROP NOT NULL;
ALTER TABLE fluxion.classification_events DROP CONSTRAINT IF EXISTS classification_events_risk_level_check;
ALTER TABLE fluxion.classification_events ADD CONSTRAINT classification_events_risk_level_check
  CHECK (risk_level IS NULL OR risk_level IN ('prohibited', 'high', 'limited', 'minimal', 'pending', 'gpai'));


-- ── 3. Obligaciones con los códigos del catálogo ─────────────────────────────

/** Código del catálogo para una clave antigua o un «Art. N»; NULL si no se reconoce. */
CREATE OR REPLACE FUNCTION fluxion.aiact_obligation_code(p_key text)
RETURNS text LANGUAGE plpgsql STABLE
SET search_path = fluxion, compliance, public
AS $$
DECLARE
  v_num  text;
  v_code text;
BEGIN
  IF p_key IS NULL THEN RETURN NULL; END IF;
  IF p_key LIKE 'AI-ACT-%' THEN RETURN p_key; END IF;

  -- Claves del motor Python: art_9, art_53_doc… ; textos de la cabecera: «Art. 9», «Art. 50.1».
  v_num := COALESCE(substring(p_key FROM '^art_([0-9]+)'), substring(p_key FROM '^Art\. ?([0-9]+)'));
  IF v_num IS NULL THEN RETURN NULL; END IF;
  -- El registro en la base de datos de la UE es el Art. 49 (el 71 crea la base de datos).
  IF v_num = '71' THEN v_num := '49'; END IF;

  v_code := 'AI-ACT-ART' || v_num;
  IF NOT EXISTS (SELECT 1 FROM compliance.obligations o WHERE o.code = v_code) THEN
    RETURN NULL;
  END IF;
  RETURN v_code;
END;
$$;

-- Obligaciones de los sistemas: código, clave y etiqueta del catálogo.
UPDATE fluxion.system_obligations so
   SET obligation_code  = c.code,
       obligation_key   = c.code,
       obligation_label = COALESCE(o.article || ' — ' || o.title, so.obligation_label),
       updated_at       = now()
  FROM (SELECT id, fluxion.aiact_obligation_code(COALESCE(obligation_key, obligation_code)) AS code
          FROM fluxion.system_obligations
         WHERE source_framework = 'AI_ACT') c
  LEFT JOIN compliance.obligations o ON o.code = c.code
 WHERE so.id = c.id
   AND c.code IS NOT NULL
   AND (so.obligation_code IS DISTINCT FROM c.code OR so.obligation_key IS DISTINCT FROM c.code);

-- Duplicadas tras la traducción (art_53_doc, art_53_copyright y art_53_training
-- son las tres el Art. 53): se conserva la más avanzada y se archivan las demás.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY ai_system_id, obligation_code
           ORDER BY CASE status
                      WHEN 'resolved' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'blocked' THEN 3
                      WHEN 'pending' THEN 4 WHEN 'suggested' THEN 5 WHEN 'excluded' THEN 6 ELSE 7 END,
                    created_at
         ) AS rn
    FROM fluxion.system_obligations
   WHERE source_framework = 'AI_ACT'
     AND archived_at IS NULL
     AND obligation_code LIKE 'AI-ACT-%'
)
UPDATE fluxion.system_obligations so
   SET archived_at = now(),
       archive_note = 'Duplicada al unificar los códigos de obligación con el catálogo (B13a).'
  FROM ranked r
 WHERE so.id = r.id AND r.rn > 1;

-- Eventos: conjunto de obligaciones con los códigos del catálogo, sin repetir.
UPDATE fluxion.classification_events e
   SET obligations_set = t.codes
  FROM (
    SELECT ev.id,
           ARRAY(SELECT DISTINCT COALESCE(fluxion.aiact_obligation_code(k), k)
                   FROM unnest(ev.obligations_set) k ORDER BY 1) AS codes
      FROM fluxion.classification_events ev
     WHERE EXISTS (SELECT 1 FROM unnest(ev.obligations_set) k WHERE k NOT LIKE 'AI-ACT-%')
  ) t
 WHERE e.id = t.id;

-- Diferencias de conciliación.
UPDATE fluxion.classification_diffs d
   SET obligation_key = c.code
  FROM (SELECT id, fluxion.aiact_obligation_code(obligation_key) AS code
          FROM fluxion.classification_diffs WHERE obligation_key NOT LIKE 'AI-ACT-%') c
 WHERE d.id = c.id AND c.code IS NOT NULL;


-- ── 4. Sistemas existentes: pendientes de revisar con el motor nuevo ─────────

UPDATE fluxion.ai_systems
   SET aiact_review_pending = true
 WHERE aiact_result IS NULL
   AND aiact_review_pending = false;

DO $$
BEGIN
  RAISE NOTICE 'B13a: % sistemas pendientes de revisar con el motor nuevo; % obligaciones con código del catálogo',
    (SELECT count(*) FROM fluxion.ai_systems WHERE aiact_review_pending),
    (SELECT count(*) FROM fluxion.system_obligations WHERE obligation_code LIKE 'AI-ACT-%');
END;
$$;
