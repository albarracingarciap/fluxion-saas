// Propuestas de estado de la Declaración de Aplicabilidad (lib/soa/proposals.ts, B17e2).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { soaControlProposal, templatesBySoaCode, type PlanControlFact } from '../lib/soa/proposals'

const correspondencia = templatesBySoaCode([
  { template_id: 'tpl-014', soa_control_code: 'A.6.2.7' },
  { template_id: 'tpl-006', soa_control_code: 'A.6.2.8' },
  { template_id: 'tpl-035', soa_control_code: 'A.6.2.8' },
])

const accion = (systemId: string, templateId: string | null, cambios: Partial<PlanControlFact> = {}): PlanControlFact => ({
  systemId,
  templateId,
  templateCode: templateId ? templateId.replace('tpl-', 'CTL-') : null,
  option: 'mitigar',
  status: 'completed',
  evidenceStatus: 'valid',
  ...cambios,
})

const control = (code: string, linkedSystemIds: string[], cambios = {}) => ({
  code, isApplicable: true, status: 'in_progress', linkedSystemIds, ...cambios,
})

test('propone «Implantado» si todos los sistemas vinculados tienen el control implantado con evidencia válida', () => {
  const p = soaControlProposal(
    control('A.6.2.8', ['s1', 's2']),
    correspondencia,
    [accion('s1', 'tpl-006'), accion('s2', 'tpl-035'), accion('s2', 'tpl-006')],
    { s1: 'Scoring', s2: 'Chatbot' },
  )
  assert.equal(p?.status, 'implemented')
  assert.match(p!.reason, /Scoring \(CTL-006\); Chatbot \(CTL-006, CTL-035\)/)
})

test('sin propuesta si falta un sistema vinculado', () => {
  assert.equal(soaControlProposal(control('A.6.2.7', ['s1', 's2']), correspondencia, [accion('s1', 'tpl-014')]), null)
})

test('solo cuentan las mitigaciones completadas con evidencia válida y de una plantilla correspondiente', () => {
  const c = control('A.6.2.7', ['s1'])
  assert.equal(soaControlProposal(c, correspondencia, [accion('s1', 'tpl-014', { status: 'evidence_pending' })]), null)
  assert.equal(soaControlProposal(c, correspondencia, [accion('s1', 'tpl-014', { evidenceStatus: 'expired' })]), null)
  assert.equal(soaControlProposal(c, correspondencia, [accion('s1', 'tpl-014', { evidenceStatus: null })]), null)
  assert.equal(soaControlProposal(c, correspondencia, [accion('s1', 'tpl-014', { option: 'aceptar' })]), null)
  assert.equal(soaControlProposal(c, correspondencia, [accion('s1', null)]), null)
  assert.equal(soaControlProposal(c, correspondencia, [accion('s1', 'tpl-006')]), null)
  assert.ok(soaControlProposal(c, correspondencia, [accion('s1', 'tpl-014')]))
})

test('sin propuesta si el control no aplica, ya está implantado o externalizado, no tiene sistemas o no tiene correspondencia', () => {
  const hechos = [accion('s1', 'tpl-014')]
  assert.equal(soaControlProposal(control('A.6.2.7', ['s1'], { isApplicable: false }), correspondencia, hechos), null)
  assert.equal(soaControlProposal(control('A.6.2.7', ['s1'], { status: 'implemented' }), correspondencia, hechos), null)
  assert.equal(soaControlProposal(control('A.6.2.7', ['s1'], { status: 'externalized' }), correspondencia, hechos), null)
  assert.equal(soaControlProposal(control('A.6.2.7', []), correspondencia, hechos), null)
  assert.equal(soaControlProposal(control('A.2.3', ['s1']), correspondencia, hechos), null)
})
