import type {
  GapGroupRecord,
  GapGroupType,
  GapLayer,
  GapSeverity,
  UnifiedGapRecord,
} from '@/lib/gaps/data'

export const GAP_GROUPING_ENGINE_VERSION = 'v1'

export type GapGroupingMeta = {
  engine: 'application'
  version: typeof GAP_GROUPING_ENGINE_VERSION
  generated_at: string
}

function getSeverityRank(severity: GapSeverity) {
  if (severity === 'critico') return 3
  if (severity === 'alto') return 2
  return 1
}

function getHigherSeverity(current: GapSeverity, candidate: GapSeverity) {
  return getSeverityRank(candidate) > getSeverityRank(current) ? candidate : current
}

function getFmeaFamilyFromGap(gap: UnifiedGapRecord) {
  if (gap.layer !== 'fmea') return 'FMEA'
  const [prefix] = gap.source_ref.split('-')
  if (!prefix) return 'FMEA'

  const normalized = prefix.toUpperCase()
  const labels: Record<string, string> = {
    TEC: 'Técnica',
    SEG: 'Seguridad',
    ETI: 'Ética',
    GOB: 'Gobernanza',
    ROI: 'ROI',
    LEG: 'Legal tipo B',
  }

  return labels[normalized] ?? normalized
}

export function buildGapGroups(gaps: UnifiedGapRecord[]): GapGroupRecord[] {
  const grouped = new Map<
    string,
    {
      group_id: string
      group_type: GapGroupType
      layer: GapLayer
      title: string
      subtitle: string
      severity_max: GapSeverity
      owner_hint: string | null
      detail_url: string
      children: UnifiedGapRecord[]
      system_ids: Set<string>
      system_names: Set<string>
    }
  >()

  function registerGroup(params: {
    key: string
    group_type: GapGroupType
    layer: GapLayer
    title: string
    subtitle: string
    detail_url: string
    child: UnifiedGapRecord
    owner_hint?: string | null
  }) {
    const existing = grouped.get(params.key)

    if (existing) {
      existing.children.push(params.child)
      existing.severity_max = getHigherSeverity(existing.severity_max, params.child.severity)
      existing.system_ids.add(params.child.system_id)
      existing.system_names.add(params.child.system_name)
      if (!existing.owner_hint && params.owner_hint) {
        existing.owner_hint = params.owner_hint
      }
      return
    }

    grouped.set(params.key, {
      group_id: params.key,
      group_type: params.group_type,
      layer: params.layer,
      title: params.title,
      subtitle: params.subtitle,
      severity_max: params.child.severity,
      owner_hint: params.owner_hint ?? null,
      detail_url: params.detail_url,
      children: [params.child],
      system_ids: new Set([params.child.system_id]),
      system_names: new Set([params.child.system_name]),
    })
  }

  for (const gap of gaps) {
    if (gap.layer === 'normativo') {
      registerGroup({
        key: `normativo_por_sistema:${gap.system_id}`,
        group_type: 'normativo_por_sistema',
        layer: 'normativo',
        title: `${gap.system_name} · obligaciones AI Act pendientes`,
        subtitle: 'Brechas normativas agrupadas por sistema',
        detail_url: `/inventario/${gap.system_id}?tab=obligaciones`,
        child: gap,
        owner_hint: gap.owner_name,
      })
      continue
    }

    if (gap.layer === 'fmea') {
      const family = getFmeaFamilyFromGap(gap)
      registerGroup({
        key: `fmea_por_familia:${gap.system_id}:${family}`,
        group_type: 'fmea_por_familia',
        layer: 'fmea',
        title: `${gap.system_name} · ${family} sin tratamiento`,
        subtitle: 'Modos FMEA agrupados por familia y sistema',
        detail_url: `${gap.detail_url}&family=${encodeURIComponent(family)}`,
        child: gap,
      })
      continue
    }

    if (gap.layer === 'control') {
      const planKey = gap.plan_id ?? `sin_plan:${gap.system_id}`
      registerGroup({
        key: `control_por_plan:${planKey}`,
        group_type: 'control_por_plan',
        layer: 'control',
        title: `${gap.system_name} · acciones de tratamiento pendientes`,
        subtitle: 'Mitigaciones agrupadas por plan de tratamiento',
        detail_url: gap.detail_url,
        child: gap,
        owner_hint: gap.owner_name,
      })
      continue
    }

    registerGroup({
      key: `caducidad_por_sistema:${gap.system_id}`,
      group_type: 'caducidad_por_sistema',
      layer: 'caducidad',
      title: `${gap.system_name} · evidencias próximas a caducar`,
      subtitle: 'Seguimiento preventivo agrupado por sistema',
      detail_url: `/inventario/${gap.system_id}?tab=evidencias`,
      child: gap,
      owner_hint: gap.owner_name,
    })
  }

  return Array.from(grouped.values())
    .map((group) => ({
      group_id: group.group_id,
      group_type: group.group_type,
      layer: group.layer,
      title: group.title,
      subtitle: group.subtitle,
      severity_max: group.severity_max,
      systems_count: group.system_ids.size,
      items_count: group.children.length,
      owner_hint: group.owner_hint,
      detail_url: group.detail_url,
      children: [...group.children].sort((a, b) => getSeverityRank(b.severity) - getSeverityRank(a.severity)),
      system_ids: Array.from(group.system_ids),
      system_names: Array.from(group.system_names),
    }))
    .sort((a, b) => {
      if (getSeverityRank(b.severity_max) !== getSeverityRank(a.severity_max)) {
        return getSeverityRank(b.severity_max) - getSeverityRank(a.severity_max)
      }

      if (b.items_count !== a.items_count) {
        return b.items_count - a.items_count
      }

      return a.title.localeCompare(b.title)
    })
}
