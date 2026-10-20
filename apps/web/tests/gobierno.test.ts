// Funciones de gobierno, comités y responsables por sistema (B23b).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  auditorConflictWarning,
  designationBlocker,
  dpoVoteWarning,
  effectiveQuorum,
  humanOversightBlocker,
  votingMembers,
} from '../lib/governance/functions'

test('el DPO no puede ser Responsable del tratamiento', () => {
  assert.match(designationBlocker('data_controller', { role: 'dpo' }) ?? '', /38\.6/)
  assert.equal(designationBlocker('ciso', { role: 'dpo' }), null)
  assert.equal(designationBlocker('data_controller', { role: 'executive' }), null)
})

test('aviso si un Auditor aprueba o interviene', () => {
  assert.notEqual(auditorConflictWarning({ roles: ['auditor', 'sgai_manager'] }, []), null)
  assert.notEqual(auditorConflictWarning({ role: 'auditor' }, ['ciso']), null)
  assert.equal(auditorConflictWarning({ role: 'auditor' }, []), null)
})

test('los asesores no votan y el quórum por defecto es la mayoría de los que votan', () => {
  const miembros = [
    { committee_role: 'president' }, { committee_role: 'member' }, { committee_role: 'member' },
    { committee_role: 'advisor' }, { committee_role: 'member', is_active: false },
  ]
  assert.equal(votingMembers(miembros).length, 3)
  assert.equal(effectiveQuorum(null, 3), 2)
  assert.equal(effectiveQuorum(null, 4), 3)
  assert.equal(effectiveQuorum(2, 5), 2)
})

test('el DPO entra en los comités como asesor', () => {
  assert.notEqual(dpoVoteWarning({ role: 'dpo' }, 'member'), null)
  assert.equal(dpoVoteWarning({ role: 'dpo' }, 'advisor'), null)
})

test('supervisión humana obligatoria en alto riesgo', () => {
  assert.notEqual(humanOversightBlocker('high', null), null)
  assert.equal(humanOversightBlocker('high', 'p1'), null)
  assert.equal(humanOversightBlocker('limited', null), null)
})

test('el mapa de aprobaciones cubre los diez objetos de DP-01 y nadie prepara y aprueba solo', async () => {
  const { APPROVAL_MAP, approvalMapActors } = await import('../lib/governance/approval-map')
  assert.equal(APPROVAL_MAP.length, 10)
  const clave = (a: { kind: string; key?: string }) => `${a.kind}:${a.key ?? ''}`
  // Salvo la DPIA (el responsable del tratamiento prepara y aprueba, con dictamen del DPO), quien prepara no aprueba.
  for (const fila of APPROVAL_MAP.filter((f) => f.object !== 'DPIA')) {
    const aprueban = new Set(fila.approves.map(clave))
    assert.ok(fila.prepares.every((p) => !aprueban.has(clave(p))), fila.object)
  }
  assert.ok(approvalMapActors().length > 5)
})
