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
