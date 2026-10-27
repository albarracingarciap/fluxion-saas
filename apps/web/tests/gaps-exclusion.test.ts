// Cómo se aparta cada capa de gaps de la cola (lib/gaps/exclusion-rules.ts, F-14, B17d).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { canExcludeGapLayer, gapExclusionError, gapExclusionLabel, gapExclusionNeedsApproval } from '../lib/gaps/exclusion-rules'

test('riesgos sin tratar y controles sin implantar se resuelven en el plan, no se excluyen', () => {
  for (const layer of ['fmea', 'control'] as const) {
    assert.equal(canExcludeGapLayer(layer), false)
    assert.equal(gapExclusionLabel(layer), null)
    assert.match(gapExclusionError(layer, '2026-12-31')!, /se resuelven en el plan de tratamiento/)
  }
})

test('una obligación sin cubrir se excluye excluyendo la obligación, sin fecha y con aprobación', () => {
  assert.equal(gapExclusionLabel('normativo'), 'Excluir obligación')
  assert.equal(gapExclusionError('normativo', null), null)
  assert.equal(gapExclusionNeedsApproval('normativo'), true)
})

test('una evidencia caducada solo se pospone hasta una fecha', () => {
  assert.equal(gapExclusionLabel('caducidad'), 'Posponer')
  assert.match(gapExclusionError('caducidad', null)!, /hasta una fecha/)
  assert.equal(gapExclusionError('caducidad', '2026-12-31'), null)
})

test('los controles de la Declaración sin implantar se resuelven en la Declaración, no se excluyen (B17e3)', () => {
  assert.equal(canExcludeGapLayer('soa'), false)
  assert.equal(gapExclusionLabel('soa'), null)
  assert.match(gapExclusionError('soa', '2026-12-31')!, /se resuelven en la Declaración de Aplicabilidad/)
})
