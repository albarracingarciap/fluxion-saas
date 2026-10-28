-- ============================================================================
-- Supervisión humana: periodo cerrado en el resumen (B30b)
-- ============================================================================
--   DP-13, segunda entrega: el informe de supervisión humana (PDF como
--   evidencia) y su anexo a cada revisión del funcionamiento (B28) cubren un
--   periodo «desde–hasta» que no tiene por qué terminar hoy. `hitl_overview`
--   admite `p_until`: los `p_days` días que terminan en esa fecha. Sin él, el
--   resultado es el de siempre.
--
-- Idempotente.
-- ============================================================================

DROP FUNCTION IF EXISTS fluxion.hitl_overview(integer, uuid);

CREATE OR REPLACE FUNCTION fluxion.hitl_overview(p_days integer DEFAULT 90, p_system_id uuid DEFAULT NULL, p_until timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
WITH base AS (
  SELECT d.*
    FROM fluxion.hitl_decisions d
   WHERE d.occurred_at >= coalesce(p_until, now()) - (p_days || ' days')::interval
     AND (p_until IS NULL OR d.occurred_at <= p_until)
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

COMMENT ON FUNCTION fluxion.hitl_overview(integer, uuid, timestamptz) IS
  'Resumen de supervisión humana de la organización o de un sistema, de los p_days días que terminan en p_until (por omisión, ahora). La RLS la aplica el rol que llama (B30b).';

GRANT EXECUTE ON FUNCTION fluxion.hitl_overview(integer, uuid, timestamptz) TO authenticated;
