// Reglas del análisis de modos de fallo (lib/fmea/domain.ts).
// Documentan el comportamiento actual: si un test falla tras un cambio, o el
// cambio es un error o la regla ha cambiado y hay que actualizar test y docs.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateFmeaZone,
  calculateSuggestedSActual,
  clampFmeaSeverity,
  getAiActZoneFloor,
  requiresJustification,
  requiresSecondReview,
  type FmeaEditableItem,
} from '../lib/fmea/domain'

test('la severidad se limita a 2-9', () => {
  assert.equal(clampFmeaSeverity(1), 2)
  assert.equal(clampFmeaSeverity(12), 9)
  assert.equal(clampFmeaSeverity(6.4), 6)
})

test('severidad sugerida según ocurrencia y detectabilidad', () => {
  const s = (o: number, d: number, sDefault = 8) =>
    calculateSuggestedSActual({ oValue: o, dRealValue: d, sDefault })
  assert.equal(s(1, 2), 5) // O ≤ 2 y D ≤ 2 → por defecto − 3
  assert.equal(s(2, 3), 6) // O ≤ 2 y D = 3 → − 2
  assert.equal(s(2, 5), 7) // O ≤ 2 y D ≥ 4 → − 1
  assert.equal(s(4, 1), 8) // O ≥ 4 → por defecto
  assert.equal(s(5, 5), 8)
  assert.equal(s(3, 3), 7) // resto → − 1
  assert.equal(s(3, 5), 7)
  assert.equal(s(1, 1, 3), 2) // nunca por debajo de 2
})

test('sin O o sin D no hay severidad sugerida', () => {
  assert.equal(calculateSuggestedSActual({ oValue: null, dRealValue: 3, sDefault: 7 }), null)
  assert.equal(calculateSuggestedSActual({ oValue: 3, dRealValue: null, sDefault: 7 }), null)
})

test('justificación obligatoria', () => {
  const j = (sDefault: number, sActual: number | null, justification = '') =>
    requiresJustification({ sDefault, sActual, status: 'evaluated', justification })
  assert.equal(j(7, 7), false)
  assert.equal(j(7, 5), true) // diferencia de 2 o más
  assert.equal(j(8, 9), true) // subir a 9, aunque la diferencia sea de 1
  assert.equal(j(7, 4), true) // baja de 5 partiendo de 7 o más
  assert.equal(j(7, 7, 'texto previo'), true) // ya confirmado con texto
  assert.equal(requiresJustification({ sDefault: 7, sActual: null, status: 'pending' }), false)
})

test('segunda revisión: solo ajuste manual que baja 3 o más', () => {
  assert.equal(requiresSecondReview({ sDefault: 8, sActual: 5, manualMode: true }), true)
  assert.equal(requiresSecondReview({ sDefault: 8, sActual: 6, manualMode: true }), false)
  assert.equal(requiresSecondReview({ sDefault: 8, sActual: 5, manualMode: false }), false)
  assert.equal(requiresSecondReview({ sDefault: 8, sActual: null, manualMode: true }), false)
})

test('suelo AI Act', () => {
  assert.equal(getAiActZoneFloor('prohibited'), 'zona_i')
  assert.equal(getAiActZoneFloor('high'), 'zona_ii')
  assert.equal(getAiActZoneFloor('limited'), 'zona_iii')
  assert.equal(getAiActZoneFloor('minimal'), 'zona_iv')
  assert.equal(getAiActZoneFloor(null), 'zona_iv')
})

const item = (dimension_id: string, s_actual: number | null, status: FmeaEditableItem['status'] = 'evaluated'): FmeaEditableItem => ({
  id: `${dimension_id}-${s_actual}-${Math.random()}`,
  dimension_id,
  s_default_frozen: 7,
  o_value: null,
  d_real_value: null,
  s_actual,
  status,
})

test('zona por la severidad más alta', () => {
  assert.equal(calculateFmeaZone([item('tecnica', 9)], 'minimal'), 'zona_i')
  assert.equal(calculateFmeaZone([item('tecnica', 8)], 'minimal'), 'zona_ii')
  assert.equal(calculateFmeaZone([item('tecnica', 7)], 'minimal'), 'zona_iii')
  assert.equal(calculateFmeaZone([item('tecnica', 5)], 'minimal'), 'zona_iv')
})

test('zona por el perfil agregado', () => {
  // tres modos de 8 o más en al menos dos dimensiones → Zona I
  assert.equal(
    calculateFmeaZone([item('tecnica', 8), item('tecnica', 8), item('etica', 8)], 'minimal'),
    'zona_i',
  )
  // cinco de 7 o más en tres dimensiones → Zona II
  assert.equal(
    calculateFmeaZone(
      [item('tecnica', 7), item('tecnica', 7), item('etica', 7), item('etica', 7), item('legal', 7)],
      'minimal',
    ),
    'zona_ii',
  )
})

test('la zona nunca baja del suelo AI Act', () => {
  assert.equal(calculateFmeaZone([item('tecnica', 3)], 'high'), 'zona_ii')
  assert.equal(calculateFmeaZone([], 'high'), 'zona_ii')
})

test('los ítems pendientes sin severidad no cuentan (B05)', () => {
  assert.equal(calculateFmeaZone([item('tecnica', null, 'pending'), item('etica', 6)], 'minimal'), 'zona_iv')
})
