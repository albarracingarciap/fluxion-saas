-- ─────────────────────────────────────────────────────────────────────────────
-- C2 · Detección de repuntes de discordancia
--
-- Las personas notan que un modelo empeora antes que las métricas estadísticas,
-- porque están viendo casos reales todos los días. Un salto en la tasa de
-- discordancia es un aviso de deriva que llega semanas antes de que un monitor
-- de drift lo detecte.
--
-- Se compara SIEMPRE contra la propia línea base del sistema, no contra un
-- umbral fijo: un 15 % de discordancia es normal en triaje médico y alarmante
-- en un OCR de facturas. Lo que importa es el cambio, no el nivel.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.hitl_discordance_spikes(
  p_recent_days   integer DEFAULT 7,
  p_baseline_days integer DEFAULT 60,
  p_min_recent    integer DEFAULT 30,
  p_min_baseline  integer DEFAULT 50,
  p_min_delta     numeric DEFAULT 0.08
)
RETURNS TABLE (
  organization_id uuid,
  ai_system_id    uuid,
  system_name     text,
  recent_n        bigint,
  recent_rate     numeric,
  baseline_n      bigint,
  baseline_rate   numeric,
  delta           numeric
)
LANGUAGE sql STABLE
AS $$
WITH reciente AS (
  SELECT d.organization_id, d.ai_system_id,
         count(*)                                        AS n,
         count(*) FILTER (WHERE NOT d.agreement)::numeric AS disc
    FROM fluxion.hitl_decisions d
   WHERE d.occurred_at >= now() - (p_recent_days || ' days')::interval
   GROUP BY 1, 2
),
base AS (
  SELECT d.organization_id, d.ai_system_id,
         count(*)                                        AS n,
         count(*) FILTER (WHERE NOT d.agreement)::numeric AS disc
    FROM fluxion.hitl_decisions d
   WHERE d.occurred_at <  now() - (p_recent_days || ' days')::interval
     AND d.occurred_at >= now() - (p_baseline_days || ' days')::interval
   GROUP BY 1, 2
)
SELECT r.organization_id,
       r.ai_system_id,
       s.name,
       r.n,
       round(r.disc / r.n, 4),
       b.n,
       round(b.disc / b.n, 4),
       round(r.disc / r.n - b.disc / b.n, 4)
  FROM reciente r
  JOIN base b ON b.organization_id = r.organization_id
             AND b.ai_system_id   = r.ai_system_id
  LEFT JOIN fluxion.ai_systems s ON s.id = r.ai_system_id
 -- Los mínimos evitan avisar por ruido: con quince decisiones, dos
 -- discordancias más mueven la tasa trece puntos sin que haya pasado nada.
 WHERE r.n >= p_min_recent
   AND b.n >= p_min_baseline
   AND (r.disc / r.n - b.disc / b.n) >= p_min_delta;
$$;

COMMENT ON FUNCTION fluxion.hitl_discordance_spikes IS
  'Sistemas cuya discordancia reciente supera su propia linea base. Compara contra el historial del sistema, no contra un umbral fijo: lo que importa es el cambio, no el nivel.';

GRANT EXECUTE ON FUNCTION fluxion.hitl_discordance_spikes TO service_role;
