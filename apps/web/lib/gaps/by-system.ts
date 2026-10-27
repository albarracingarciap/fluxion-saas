/**
 * El análisis de gaps de un solo sistema (B16c, DP-06).
 *
 * El informe de gaps del sistema era un informe aparte, con sus propias reglas,
 * y sus recuentos no coincidían con los de `/gaps` (E9). Ahora es el mismo
 * análisis filtrado por sistema: estas funciones reducen el resultado de
 * `buildGapsData` a un sistema, con sus resúmenes recalculados, para la
 * instantánea. Módulo puro.
 */
import type { GapLayer, GapsDataResult, UnifiedGapRecord } from './data'

function resumen(gaps: UnifiedGapRecord[]) {
  const by_layer = {} as Record<GapLayer, number>
  for (const g of gaps) by_layer[g.layer] = (by_layer[g.layer] ?? 0) + 1
  return {
    total: gaps.length,
    critico: gaps.filter((g) => g.severity === 'critico').length,
    alto: gaps.filter((g) => g.severity === 'alto').length,
    medio: gaps.filter((g) => g.severity === 'medio').length,
    by_layer,
  }
}

export function filterGapsDataBySystem(data: GapsDataResult, systemId: string): GapsDataResult {
  const delSistema = <T extends { system_id: string }>(rows: T[]) => rows.filter((r) => r.system_id === systemId)
  const gaps = delSistema(data.gaps)
  const excluded = delSistema(data.excluded)
  const s = resumen(gaps)

  return {
    ...data,
    gaps,
    excluded,
    excluded_pending: delSistema(data.excluded_pending),
    groups: data.groups
      .filter((g) => g.system_ids.includes(systemId))
      .map((g) => {
        const children = g.children.filter((c) => c.system_id === systemId)
        const i = g.system_ids.indexOf(systemId)
        return {
          ...g,
          children,
          items_count: children.length,
          systems_count: 1,
          system_ids: [systemId],
          system_names: i >= 0 ? [g.system_names[i]] : g.system_names.slice(0, 1),
        }
      })
      .filter((g) => g.children.length > 0),
    summary: {
      ...data.summary,
      ...s,
      by_layer: { ...Object.fromEntries(Object.keys(data.summary.by_layer).map((k) => [k, 0])), ...s.by_layer } as Record<GapLayer, number>,
      systems_affected: gaps.length > 0 ? 1 : 0,
      total_systems: 1,
      excluded_count: excluded.length,
    },
    exposure: delSistema(data.exposure),
    caducities: delSistema(data.caducities),
    systems_with_gaps: delSistema(data.systems_with_gaps),
  }
}
