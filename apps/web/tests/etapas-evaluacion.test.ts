// Etapa de evaluación de un sistema (lib/evaluation-status/stages.ts, DP-02, B18a).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { nextStepCard, organizationNextStep, systemStage, type SystemStageFacts } from '../lib/evaluation-status/stages'

const completo: SystemStageFacts = {
  systemId: 's1',
  scope: 'in_scope',
  level: 'limited',
  reviewPending: false,
  suggestedObligations: 0,
  openObligations: 0,
  evaluationApproved: true,
  planApproved: true,
  aisiaApproved: true,
  requiredDocuments: [],
  oversightDesignated: false,
  openActions: 0,
  untreatedSevereModes: 0,
  expiredEvidences: 0,
  overdueReviews: 0,
  planDeadlineOverdue: false,
}
const con = (cambios: Partial<SystemStageFacts>): SystemStageFacts => ({ ...completo, ...cambios })

test('sin clasificar mientras el nivel está pendiente o hay una reclasificación por revisar', () => {
  assert.equal(systemStage(con({ level: 'pending', scope: 'pending' })).stage, 'sin_clasificar')
  const s = systemStage(con({ reviewPending: true }))
  assert.equal(s.stage, 'sin_clasificar')
  assert.equal(s.next?.label, 'Revisar la reclasificación pendiente')
})

test('clasificado exige las obligaciones aceptadas o excluidas', () => {
  assert.equal(systemStage(con({ suggestedObligations: 2 })).stage, 'sin_clasificar')
  const s = systemStage(con({ evaluationApproved: false }))
  assert.equal(s.stage, 'clasificado')
  assert.equal(s.next?.key, 'evaluacion')
})

test('evaluado: evaluación y plan, AISIA, documentos exigibles y, en alto riesgo, supervisión humana', () => {
  assert.equal(systemStage(con({ aisiaApproved: false })).stage, 'clasificado')
  const docs = systemStage(con({ requiredDocuments: [{ key: 'fria', label: 'FRIA', approved: false }] }))
  assert.equal(docs.stage, 'clasificado')
  assert.equal(docs.next?.href, '/inventario/s1/expediente/fria')
  assert.equal(systemStage(con({ level: 'high' })).stage, 'clasificado')
  assert.equal(systemStage(con({ level: 'high', oversightDesignated: true })).stage, 'tratado')
  assert.equal(systemStage(con({ level: 'limited' })).items.some((i) => i.key === 'supervision'), false)
})

test('evaluado con el plan en curso; tratado al cerrar mitigaciones, modos críticos y obligaciones', () => {
  const s = systemStage(con({ openActions: 3 }))
  assert.equal(s.stage, 'evaluado')
  assert.equal(s.next?.key, 'acciones')
  assert.equal(systemStage(con({ untreatedSevereModes: 1 })).stage, 'evaluado')
  assert.equal(systemStage(con({ openObligations: 1 })).stage, 'evaluado')
  const t = systemStage(completo)
  assert.equal(t.stage, 'tratado')
  assert.equal(t.vigente, true)
  assert.equal(t.next, null)
})

test('la vigencia es transversal: no cambia la etapa y es lo siguiente al llegar a tratado', () => {
  const s = systemStage(con({ expiredEvidences: 1 }))
  assert.equal(s.stage, 'tratado')
  assert.equal(s.vigente, false)
  assert.equal(s.next?.key, 'evidencias')
  const e = systemStage(con({ planDeadlineOverdue: true, openActions: 1 }))
  assert.equal(e.stage, 'evaluado')
  assert.equal(e.next?.key, 'acciones')
})

test('práctica prohibida: etapa final de retirada o rediseño', () => {
  const s = systemStage(con({ level: 'prohibited' }))
  assert.equal(s.stage, 'retirada')
  assert.equal(s.label, 'Retirada o rediseño')
  assert.equal(s.items.length, 1)
})

test('fuera del ámbito o no es un sistema de IA: se queda en clasificado sin más requisitos', () => {
  for (const scope of ['out_of_scope', 'not_ai_system'] as const) {
    const s = systemStage(con({ scope, level: null, evaluationApproved: false, aisiaApproved: false }))
    assert.equal(s.stage, 'clasificado')
    assert.equal(s.terminal, true)
    assert.equal(s.next, null)
  }
})

test('siguiente paso de la organización: prohibida primero, después la etapa más baja y el mayor riesgo', () => {
  const sistemas = [
    { name: 'B', level: 'minimal', stage: systemStage(con({ systemId: 'b', level: 'minimal', aisiaApproved: false })) },
    { name: 'A', level: 'high', stage: systemStage(con({ systemId: 'a', level: 'high', aisiaApproved: false })) },
    { name: 'C', level: 'limited', stage: systemStage(con({ systemId: 'c' })) },
  ]
  assert.equal(organizationNextStep(sistemas)?.name, 'A')
  const conProhibida = [...sistemas, { name: 'Z', level: 'prohibited', stage: systemStage(con({ systemId: 'z', level: 'prohibited' })) }]
  assert.equal(organizationNextStep(conProhibida)?.item.key, 'retirada')
  assert.equal(organizationNextStep([sistemas[2]]), null)
})

test('tarjeta de siguiente paso: alta del primer sistema, sistemas retirados fuera y todo al día', () => {
  assert.equal(nextStepCard([]).href, '/inventario/nuevo')
  const retirado = { id: 'r', name: 'R', status: 'retirado', level: 'high', stage: systemStage(con({ systemId: 'r', aisiaApproved: false })) }
  assert.equal(nextStepCard([retirado]).href, '/inventario/nuevo')
  const alDia = { id: 'c', name: 'C', status: 'produccion', level: 'limited', stage: systemStage(con({ systemId: 'c' })) }
  assert.equal(nextStepCard([alDia]).title, 'Todos los sistemas tratados y vigentes')
  const pendiente = { id: 'p', name: 'P', status: 'desarrollo', level: 'limited', stage: systemStage(con({ systemId: 'p', aisiaApproved: false })) }
  const card = nextStepCard([alDia, pendiente])
  assert.equal(card.title, 'Falta: AISIA aprobada')
  assert.equal(card.href, '/inventario/p/expediente/aisia')
  assert.match(card.description, /P · etapa Clasificado/)
})

test('un disparador de reevaluación abierto quita la vigencia (B21a)', () => {
  const s = systemStage(con({ pendingReevaluations: 1 }))
  assert.equal(s.stage, 'tratado')
  assert.equal(s.vigente, false)
  assert.equal(s.next?.key, 'reevaluacion')
  assert.equal(s.next?.href, '/inventario/s1')
})
