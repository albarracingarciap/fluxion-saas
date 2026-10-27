// FMEA por familias y priorizado (lib/fmea/families.ts, B14).
// Documentan el comportamiento actual: si un test falla tras un cambio, o el
// cambio es un error o la regla ha cambiado y hay que actualizar test y docs.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { calculateSuggestedSActual } from '../lib/fmea/domain'
import {
  compareByCriticality,
  draftMakesManual,
  evaluationOverview,
  isNoopFamilyUpdate,
  referenceSeverity,
  resolveFamilyEstimates,
  severityBand,
  summarizeFamilies,
  type FamilyItem,
} from '../lib/fmea/families'

const item = (id: string, extra: Partial<FamilyItem> = {}): FamilyItem => ({
  id, s_default_frozen: 8, estimate_source: null, status: 'pending',
  o_value: null, d_real_value: null, s_actual: null, ...extra,
})

const JUST = 'Comparten la misma causa raíz y el mismo control de monitorización en producción.'

test('la severidad de referencia es la actual si está confirmado y la por defecto si no', () => {
  assert.equal(referenceSeverity({ status: 'pending', s_default_frozen: 8, s_actual: null }), 8)
  assert.equal(referenceSeverity({ status: 'evaluated', s_default_frozen: 8, s_actual: 5 }), 5)
  // Un pendiente con S guardada no confirmada no cuenta (R5).
  assert.equal(referenceSeverity({ status: 'pending', s_default_frozen: 8, s_actual: 4 }), 8)
})

test('orden por criticidad: más severidad primero y, a igualdad, pendientes antes', () => {
  const base = { dimension_order: 1, s_actual: null }
  const lista = [
    { ...base, failure_mode_code: 'B', status: 'evaluated', s_default_frozen: 9, s_actual: 6 },
    { ...base, failure_mode_code: 'C', status: 'pending', s_default_frozen: 7 },
    { ...base, failure_mode_code: 'A', status: 'pending', s_default_frozen: 9 },
    { ...base, failure_mode_code: 'D', status: 'evaluated', s_default_frozen: 7, s_actual: 7 },
  ].sort(compareByCriticality)
  assert.deepEqual(lista.map((i) => i.failure_mode_code), ['A', 'C', 'D', 'B'])
})

test('tramos de severidad', () => {
  const t = (s: number) => severityBand({ status: 'pending', s_default_frozen: s, s_actual: null }).id
  assert.deepEqual([9, 8, 7, 6, 5, 4, 2].map(t), ['band_8', 'band_8', 'band_7', 'band_5', 'band_5', 'band_2', 'band_2'])
})

test('la estimación de familia cubre sus modos con la O y la D más severas de sus familias', () => {
  const cambios = resolveFamilyEstimates({
    items: [item('m1'), item('m2')],
    memberships: [
      { item_id: 'm1', family_label: 'B' }, { item_id: 'm1', family_label: 'A' },
      { item_id: 'm2', family_label: 'A' },
    ],
    estimates: [
      { family_label: 'A', o_value: 2, d_value: 4, justification: JUST },
      { family_label: 'B', o_value: 3, d_value: 2, justification: JUST },
    ],
  })
  const m1 = cambios.find((c) => c.itemId === 'm1')!
  assert.equal(m1.kind, 'estimated')
  assert.equal(m1.patch.o_value, 3)
  assert.equal(m1.patch.d_real_value, 4)
  assert.equal(m1.patch.s_actual, calculateSuggestedSActual({ oValue: 3, dRealValue: 4, sDefault: 8 }))
  assert.equal(m1.patch.status, 'evaluated')
  assert.equal(m1.patch.estimate_source, 'family')
  // Orden alfabético: el texto no depende del orden de la consulta.
  assert.deepEqual(m1.patch.estimate_families, ['A', 'B'])
  assert.match(m1.patch.narrative_justification!, /^Estimación por familia «A»/)
  assert.equal(cambios.find((c) => c.itemId === 'm2')!.patch.o_value, 2)
})

test('un ajuste manual no se sobrescribe nunca', () => {
  const cambios = resolveFamilyEstimates({
    items: [item('m1', { estimate_source: 'manual', status: 'evaluated', o_value: 5, d_real_value: 5, s_actual: 8 })],
    memberships: [{ item_id: 'm1', family_label: 'A' }],
    estimates: [{ family_label: 'A', o_value: 1, d_value: 1, justification: JUST }],
  })
  assert.equal(cambios.length, 0)
})

test('al retirar la estimación, sus modos vuelven a pendiente; los demás no cambian', () => {
  const cambios = resolveFamilyEstimates({
    items: [
      item('m1', { estimate_source: 'family', status: 'evaluated', o_value: 2, d_real_value: 2, s_actual: 5 }),
      item('m2'),
    ],
    memberships: [{ item_id: 'm1', family_label: 'A' }, { item_id: 'm2', family_label: 'A' }],
    estimates: [],
  })
  assert.equal(cambios.length, 1)
  assert.equal(cambios[0].kind, 'withdrawn')
  assert.equal(cambios[0].patch.status, 'pending')
  assert.equal(cambios[0].patch.estimate_source, null)
})

test('volver a aplicar los mismos valores no genera historial', () => {
  const sActual = calculateSuggestedSActual({ oValue: 2, dRealValue: 2, sDefault: 8 })
  const [c] = resolveFamilyEstimates({
    items: [item('m1', { estimate_source: 'family', status: 'evaluated', o_value: 2, d_real_value: 2, s_actual: sActual })],
    memberships: [{ item_id: 'm1', family_label: 'A' }],
    estimates: [{ family_label: 'A', o_value: 2, d_value: 2, justification: JUST }],
  })
  assert.ok(isNoopFamilyUpdate(c))
})

test('retocar en la lista un modo de familia lo convierte en ajuste manual', () => {
  const stored = {
    estimate_source: 'family', status: 'evaluated', o_value: 2, d_real_value: 2, s_actual: 5,
    narrative_justification: 'Estimación por familia «A»: …',
  }
  assert.equal(draftMakesManual(stored, { ...stored }), false)
  assert.equal(draftMakesManual(stored, { ...stored, o_value: 4 }), true)
  assert.equal(draftMakesManual(stored, { ...stored, narrative_justification: 'Otra cosa' }), true)
  assert.equal(draftMakesManual(stored, { ...stored, status: 'skipped' }), true)
  // Solo afecta a los que heredaban de una familia.
  assert.equal(draftMakesManual({ ...stored, estimate_source: null }, { ...stored, o_value: 4 }), false)
})

test('las familias se ordenan por criticidad', () => {
  const fila = (item_id: string, family_label: string, s: number, estimate_source: string | null = null) =>
    ({ item_id, family_label, estimate_source, status: 'pending', s_default_frozen: s, s_actual: null })
  const resumen = summarizeFamilies([
    fila('a1', 'Grande', 6), fila('a2', 'Grande', 6), fila('a3', 'Grande', 7),
    fila('b1', 'Crítica', 8, 'manual'), fila('b2', 'Crítica', 5),
    fila('c1', 'Media', 7),
  ], new Set(['Media']))
  assert.deepEqual(resumen.map((f) => f.familyLabel), ['Crítica', 'Grande', 'Media'])
  const critica = resumen[0]
  assert.equal(critica.criticos, 1)
  assert.equal(critica.manuales, 1)
  assert.equal(critica.maxSeverity, 8)
  assert.equal(resumen[2].estimada, true)
})

test('resumen al entrar: priorizados, severidad 8 o más, sin familia y excepciones', () => {
  const o = evaluationOverview([
    { id: 'm1', status: 'pending', s_default_frozen: 9, s_actual: null, estimate_source: null },
    { id: 'm2', status: 'evaluated', s_default_frozen: 9, s_actual: 6, estimate_source: 'family' },
    { id: 'm3', status: 'evaluated', s_default_frozen: 6, s_actual: 8, estimate_source: 'manual' },
    { id: 'm4', status: 'pending', s_default_frozen: 5, s_actual: null, estimate_source: null },
  ], new Set(['m1', 'm2', 'm3']))
  assert.deepEqual(o, { total: 4, criticos: 2, criticosPendientes: 1, sinFamilia: 1, porFamilia: 1, manuales: 1 })
})
