-- ============================================================================
-- Supervisión humana de decisiones: modalidad por sistema y filtro (B30a)
-- ============================================================================
--   Revisión del menú «Supervisión humana» (DP-13, 2026-10-28): la pantalla
--   solo se alimentaba por la API y no distinguía qué sistemas deben enviar
--   decisiones. Primera entrega (a + b):
--     - modalidad de supervisión de cada sistema, junto a las medidas de la
--       supervisión documentada (B24): por caso, por muestreo o solo vigilancia
--       del funcionamiento. Los sistemas «por caso» sin decisiones en 30 días
--       se avisan en la pantalla;
--     - `hitl_overview` admite filtrar por sistema (pantalla filtrada y resumen
--       en la ficha). Mismo resultado sin el filtro.
--
-- Idempotente.
-- ============================================================================

ALTER TABLE fluxion.ai_systems
  ADD COLUMN IF NOT EXISTS oversight_review_mode text
  CHECK (oversight_review_mode IS NULL OR oversight_review_mode IN ('per_case', 'sampling', 'monitoring_only'));

COMMENT ON COLUMN fluxion.ai_systems.oversight_review_mode IS
  'Modalidad de supervisión humana: per_case (cada decisión se registra), sampling (revisión de muestras) o monitoring_only (sin revisión caso a caso). NULL = sin indicar (DP-13, B30a).';

-- La firma cambia (parámetro nuevo con valor por omisión): se sustituye.
DROP FUNCTION IF EXISTS fluxion.hitl_overview(integer);

CREATE OR REPLACE FUNCTION fluxion.hitl_overview(p_days integer DEFAULT 90, p_system_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
WITH base AS (
  SELECT d.*
    FROM fluxion.hitl_decisions d
   WHERE d.occurred_at >= now() - (p_days || ' days')::interval
     AND (p_system_id IS NULL OR d.ai_system_id = p_system_id)
),
totales AS (
  SELECT
    count(*)                                          AS decisiones,
    count(*) FILTER (WHERE agreement)                 AS conformes,
    count(*) FILTER (WHERE NOT agreement)             AS discordantes,
    count(*) FILTER (WHERE decision = 'not_used')     AS no_usadas,
    count(DISTINCT reviewer_ref)                      AS revisores,
    count(DISTINCT ai_system_id)                      AS sistemas,
    -- La mediana y no la media: un caso que alguien dejó abierto media hora
    -- desplaza la media y no dice nada de cómo se revisa habitualmente.
    percentile_disc(0.5) WITHIN GROUP (ORDER BY decided_in_ms)
      FILTER (WHERE decided_in_ms IS NOT NULL)        AS mediana_ms,
    count(*) FILTER (WHERE NOT agreement AND reason_code IS NULL) AS sin_motivo
  FROM base
),
por_sistema AS (
  SELECT jsonb_agg(x ORDER BY x->>'decisiones' DESC) AS v FROM (
    SELECT jsonb_build_object(
      'system_id',   b.ai_system_id,
      'system_name', s.name,
      'decisiones',  count(*),
      'conformes',   count(*) FILTER (WHERE b.agreement),
      'mediana_ms',  percentile_disc(0.5) WITHIN GROUP (ORDER BY b.decided_in_ms)
                       FILTER (WHERE b.decided_in_ms IS NOT NULL)
    ) AS x
    FROM base b
    LEFT JOIN fluxion.ai_systems s ON s.id = b.ai_system_id
    GROUP BY b.ai_system_id, s.name
  ) t
),
por_revisor AS (
  SELECT jsonb_agg(x ORDER BY x->>'decisiones' DESC) AS v FROM (
    SELECT jsonb_build_object(
      'reviewer_ref',  coalesce(b.reviewer_ref, 'sin identificar'),
      'reviewer_role', max(b.reviewer_role),
      'decisiones',    count(*),
      'conformes',     count(*) FILTER (WHERE b.agreement),
      'mediana_ms',    percentile_disc(0.5) WITHIN GROUP (ORDER BY b.decided_in_ms)
                         FILTER (WHERE b.decided_in_ms IS NOT NULL)
    ) AS x
    FROM base b
    GROUP BY b.reviewer_ref
  ) t
),
por_motivo AS (
  SELECT jsonb_agg(x ORDER BY x->>'veces' DESC) AS v FROM (
    SELECT jsonb_build_object(
      'code',     coalesce(b.reason_code, 'sin_motivo'),
      'label',    coalesce(max(rc.label), 'Sin motivo declarado'),
      'category', coalesce(max(rc.category), 'other'),
      'veces',    count(*)
    ) AS x
    FROM base b
    LEFT JOIN fluxion.hitl_reason_codes rc
           ON rc.code = b.reason_code
          AND (rc.organization_id = b.organization_id OR rc.organization_id IS NULL)
    WHERE NOT b.agreement
    GROUP BY b.reason_code
  ) t
),
serie AS (
  SELECT jsonb_agg(x ORDER BY x->>'day') AS v FROM (
    SELECT jsonb_build_object(
      'day',        (b.occurred_at AT TIME ZONE 'UTC')::date,
      'decisiones', count(*),
      'conformes',  count(*) FILTER (WHERE b.agreement)
    ) AS x
    FROM base b
    GROUP BY (b.occurred_at AT TIME ZONE 'UTC')::date
  ) t
)
SELECT jsonb_build_object(
  'days',        p_days,
  'totales',     to_jsonb(totales),
  'por_sistema', coalesce((SELECT v FROM por_sistema), '[]'::jsonb),
  'por_revisor', coalesce((SELECT v FROM por_revisor), '[]'::jsonb),
  'por_motivo',  coalesce((SELECT v FROM por_motivo),  '[]'::jsonb),
  'serie',       coalesce((SELECT v FROM serie),       '[]'::jsonb)
)
FROM totales;
$$;

COMMENT ON FUNCTION fluxion.hitl_overview(integer, uuid) IS
  'Resumen de supervisión humana para el panel, de toda la organización o de un sistema (B30a). Una sola ida y vuelta; la RLS la aplica el rol que llama.';

GRANT EXECUTE ON FUNCTION fluxion.hitl_overview(integer, uuid) TO authenticated;
