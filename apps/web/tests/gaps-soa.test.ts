// Gaps «Control de la Declaración sin implantar» (lib/gaps/soa.ts, B17e3).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { soaGapCandidates, type SoaGapControl } from '../lib/gaps/soa'

const control = (code: string, cambios: Partial<SoaGapControl> = {}): SoaGapControl => ({
  id: `ctl-${code}`,
  code,
  isApplicable: true,
  status: 'in_progress',
  links: [{ id: `l1-${code}`, systemId: 's1' }, { id: `l2-${code}`, systemId: 's2' }],
  ...cambios,
})

test('un gap por cada sistema vinculado a un control aplicable sin implantar', () => {
  const gaps = soaGapCandidates([control('A.6.2.7')])
  assert.deepEqual(gaps.map((g) => [g.linkId, g.systemId, g.code]), [
    ['l1-A.6.2.7', 's1', 'A.6.2.7'],
    ['l2-A.6.2.7', 's2', 'A.6.2.7'],
  ])
})

test('sin gap si el control está implantado, externalizado, no aplica o no tiene sistemas', () => {
  assert.deepEqual(soaGapCandidates([
    control('A.2.2', { status: 'implemented' }),
    control('A.2.3', { status: 'externalized' }),
    control('A.2.4', { isApplicable: false }),
    control('A.3.2', { links: [] }),
  ]), [])
})

test('cuentan los estados No iniciado, Planificado y En progreso', () => {
  for (const status of ['not_started', 'planned', 'in_progress']) {
    assert.equal(soaGapCandidates([control('A.5.2', { status })]).length, 2)
  }
})
