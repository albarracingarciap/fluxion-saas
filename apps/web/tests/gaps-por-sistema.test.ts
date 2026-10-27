// Análisis de gaps de un sistema (lib/gaps/by-system.ts, B16c).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { filterGapsDataBySystem } from '../lib/gaps/by-system'
import type { GapsDataResult, UnifiedGapRecord } from '../lib/gaps/data'

const gap = (key: string, system_id: string, severity: UnifiedGapRecord['severity'], layer: UnifiedGapRecord['layer'] = 'normativo') =>
  ({ key, system_id, severity, layer, system_name: system_id.toUpperCase() } as UnifiedGapRecord)

const datos = {
  gaps: [gap('g1', 's1', 'critico'), gap('g2', 's2', 'alto', 'fmea'), gap('g3', 's1', 'medio', 'fmea')],
  excluded: [{ ...gap('x1', 's2', 'medio'), disposition: {} }],
  excluded_pending: [],
  groups: [{
    group_id: 'grp', children: [gap('g1', 's1', 'critico'), gap('g2', 's2', 'alto')],
    system_ids: ['s1', 's2'], system_names: ['S1', 'S2'], systems_count: 2, items_count: 2,
  }],
  members: [], grouping: {},
  summary: { total: 3, critico: 1, alto: 1, medio: 1, by_layer: { normativo: 1, fmea: 2, control: 0, caducidad: 0 }, systems_affected: 2, total_systems: 5, excluded_count: 1 },
  exposure: [{ system_id: 's1' }, { system_id: 's2' }],
  caducities: [gap('c1', 's2', 'alto', 'caducidad')],
  systems_with_gaps: [{ system_id: 's1', count: 2 }, { system_id: 's2', count: 1 }],
} as unknown as GapsDataResult

test('el análisis de un sistema solo tiene sus gaps, con los resúmenes recalculados', () => {
  const r = filterGapsDataBySystem(datos, 's1')
  assert.deepEqual(r.gaps.map((g) => g.key), ['g1', 'g3'])
  assert.deepEqual(r.summary, {
    total: 2, critico: 1, alto: 0, medio: 1,
    by_layer: { normativo: 1, fmea: 1, control: 0, caducidad: 0 },
    systems_affected: 1, total_systems: 1, excluded_count: 0,
  })
  assert.equal(r.excluded.length, 0)
  assert.equal(r.caducities.length, 0)
  assert.deepEqual(r.exposure, [{ system_id: 's1' }])
  assert.deepEqual(r.systems_with_gaps.map((s) => s.system_id), ['s1'])
})

test('los grupos quedan con los gaps y el nombre del sistema', () => {
  const [g] = filterGapsDataBySystem(datos, 's2').groups
  assert.deepEqual(g.children.map((c) => c.key), ['g2'])
  assert.deepEqual([g.items_count, g.systems_count, g.system_ids, g.system_names], [1, 1, ['s2'], ['S2']])
  assert.equal(filterGapsDataBySystem(datos, 's3').groups.length, 0)
})
