// Propuestas de estado de las obligaciones (lib/obligations/proposals.ts, B17c).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { obligationProposal, type ProposalFacts } from '../lib/obligations/proposals'

const nada: ProposalFacts = { approvedEvaluation: null, approvedDocuments: {}, euRegistrySection: null }
const hechos: ProposalFacts = {
  approvedEvaluation: { version: 2, approvedAt: '2026-10-01T10:00:00Z' },
  approvedDocuments: {
    annex_iv: { version: 1, approvedAt: '2026-10-02T10:00:00Z', notified: false },
    fria: { version: 1, approvedAt: '2026-10-03T10:00:00Z', notified: true },
    eu_registry: { version: 1, approvedAt: '2026-10-04T10:00:00Z', notified: true },
  },
  euRegistrySection: 'A',
}

test('Art. 9 con la evaluación de riesgos aprobada y Art. 11 con el Anexo IV aprobado', () => {
  assert.match(obligationProposal('AI-ACT-ART9', 'pending', hechos)!.reason, /Evaluación de riesgos v2 aprobada/)
  assert.match(obligationProposal('AI-ACT-ART11', 'in_progress', hechos)!.reason, /Anexo IV\) v1 aprobada/)
  assert.equal(obligationProposal('AI-ACT-ART9', 'pending', nada), null)
})

test('Art. 27 y Art. 49 solo si además consta la notificación o la presentación', () => {
  assert.match(obligationProposal('AI-ACT-ART27', 'pending', hechos)!.reason, /notificada a la autoridad/)
  assert.match(obligationProposal('AI-ACT-ART49', 'pending', hechos)!.reason, /presentada en la base de datos/)
  const sinNotificar: ProposalFacts = { ...hechos, approvedDocuments: { fria: { version: 1, approvedAt: '2026-10-03', notified: false } } }
  assert.equal(obligationProposal('AI-ACT-ART27', 'pending', sinNotificar), null)
})

test('Art. 6.4 solo con la ficha de la sección B', () => {
  assert.equal(obligationProposal('AI-ACT-ART6-4', 'pending', hechos), null)
  assert.ok(obligationProposal('AI-ACT-ART6-4', 'pending', { ...hechos, euRegistrySection: 'B' }))
})

test('sin propuesta para obligaciones cerradas o sin regla', () => {
  assert.equal(obligationProposal('AI-ACT-ART9', 'resolved', hechos), null)
  assert.equal(obligationProposal('AI-ACT-ART9', 'excluded', hechos), null)
  assert.equal(obligationProposal('AI-ACT-ART26-1', 'pending', hechos), null)
  assert.equal(obligationProposal(null, 'pending', hechos), null)
})

test('B17e1 · resuelta con evidencias válidas de todos los tipos obligatorios', () => {
  const facts: ProposalFacts = { ...nada, mandatoryEvidenceTypes: { 'AI-ACT-ART14': [{ id: 't-acta', name: 'Acta de supervisión humana' }], 'AI-ACT-ART15': [{ id: 't-val', name: 'Informe de validación y pruebas' }, { id: 't-cib', name: 'Informe de ciberseguridad' }] } }
  assert.match(obligationProposal('AI-ACT-ART14', 'pending', facts, [{ status: 'valid', typeId: 't-acta' }])!.reason, /Acta de supervisión humana/)
  // En borrador o sin tipo del catálogo no cuenta.
  assert.equal(obligationProposal('AI-ACT-ART14', 'pending', facts, [{ status: 'draft', typeId: 't-acta' }]), null)
  assert.equal(obligationProposal('AI-ACT-ART14', 'pending', facts, [{ status: 'valid', typeId: null }]), null)
  // Faltan tipos.
  assert.equal(obligationProposal('AI-ACT-ART15', 'pending', facts, [{ status: 'valid', typeId: 't-val' }]), null)
  assert.ok(obligationProposal('AI-ACT-ART15', 'pending', facts, [{ status: 'valid', typeId: 't-val' }, { status: 'valid', typeId: 't-cib' }]))
  // Sin tipos obligatorios, sin propuesta.
  assert.equal(obligationProposal('AI-ACT-ART26-1', 'pending', facts, [{ status: 'valid', typeId: 't-val' }]), null)
})

test('Art. 26.2 con la supervisión humana documentada (B24)', () => {
  assert.match(obligationProposal('AI-ACT-ART26-2', 'pending', { ...nada, oversightDocumented: true })!.reason, /Supervisión humana documentada/)
  assert.equal(obligationProposal('AI-ACT-ART26-2', 'pending', nada), null)
  assert.match(obligationProposal('AI-ACT-ART26-6', 'pending', { ...nada, logsComplete: true })!.reason, /Registro de logs completo/)
  assert.equal(obligationProposal('AI-ACT-ART26-6', 'pending', nada), null)
})

test('Art. 72 con el plan de vigilancia poscomercialización aprobado (B26)', () => {
  const conPlan: ProposalFacts = { ...nada, approvedDocuments: { post_market_plan: { version: 1, approvedAt: '2026-10-28T10:00:00Z', notified: false } } }
  assert.match(obligationProposal('AI-ACT-ART72', 'pending', conPlan)!.reason, /Plan de vigilancia poscomercialización v1 aprobado/)
  assert.equal(obligationProposal('AI-ACT-ART72', 'pending', nada), null)
})
