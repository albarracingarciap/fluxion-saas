// Aplicabilidad de los documentos del expediente según rol y nivel (DP-11,
// lib/documents/applicability.ts). Documentan el comportamiento actual: si un
// test falla tras un cambio, o el cambio es un error o la regla ha cambiado.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  applicabilityFacts,
  documentApplicability,
  providerDocTags,
  type ApplicabilityFacts,
} from '../lib/documents/applicability'

const base: ApplicabilityFacts = {
  valueChainRoles: [], level: 'minimal', highRiskRoute: null, art63: null,
  gpaiModelProvider: false, publicBody: null, managesCriticalInfra: false, processesPersonalData: null,
}
const f = (extra: Partial<ApplicabilityFacts>): ApplicabilityFacts => ({ ...base, ...extra })
const modo = (key: string, facts: ApplicabilityFacts) => documentApplicability(key, facts).mode

const altoAnexoIII = (puntos: string[]) =>
  ({ level: 'high' as const, highRiskRoute: { annex: 'III' as const, points: puntos as never } })

test('Anexo IV: proveedor y alto riesgo se redacta; otro rol de alto riesgo aporta la del proveedor; resto no aplica', () => {
  assert.equal(modo('annex_iv', f({ ...altoAnexoIII(['4a']), valueChainRoles: ['provider'] })), 'redactar')
  assert.equal(modo('annex_iv', f({ ...altoAnexoIII(['4a']), valueChainRoles: ['deployer'] })), 'proveedor')
  // Sin roles declarados no se presume proveedor.
  assert.equal(modo('annex_iv', f({ ...altoAnexoIII(['4a']) })), 'proveedor')
  assert.equal(modo('annex_iv', f({ valueChainRoles: ['provider'], level: 'limited' })), 'no_aplica')
  assert.equal(modo('annex_iv', f({ valueChainRoles: ['provider'], level: 'pending' })), 'no_aplica')
})

test('Registro UE: secciones A, B y C del Anexo VIII', () => {
  const a = documentApplicability('eu_registry', f({ ...altoAnexoIII(['4a']), valueChainRoles: ['provider'] }))
  assert.deepEqual([a.mode, a.euRegistrySection], ['redactar', 'A'])
  const b = documentApplicability('eu_registry', f({ valueChainRoles: ['provider'], level: 'minimal', art63: 'valid' }))
  assert.deepEqual([b.mode, b.euRegistrySection], ['redactar', 'B'])
  const c = documentApplicability('eu_registry', f({ ...altoAnexoIII(['5a']), valueChainRoles: ['deployer'], publicBody: true }))
  assert.deepEqual([c.mode, c.euRegistrySection], ['redactar', 'C'])
  assert.equal(modo('eu_registry', f({ ...altoAnexoIII(['5a']), valueChainRoles: ['deployer'], publicBody: false })), 'proveedor')
  assert.equal(modo('eu_registry', f({ valueChainRoles: ['provider'], level: 'limited' })), 'no_aplica')
})

test('Registro UE: la infraestructura crítica se registra a nivel nacional', () => {
  const r = documentApplicability('eu_registry', f({ ...altoAnexoIII(['2']), valueChainRoles: ['provider'] }))
  assert.equal(r.mode, 'no_aplica')
  assert.match(r.reason, /nacional/)
  // Por la vía de respaldo, sin ruta del Anexo III.
  assert.equal(modo('eu_registry', f({ level: 'high', valueChainRoles: ['provider'], managesCriticalInfra: true })), 'no_aplica')
  // Con otro punto además del 2, sí se registra en la UE.
  assert.equal(modo('eu_registry', f({ ...altoAnexoIII(['2', '4a']), valueChainRoles: ['provider'] })), 'redactar')
})

test('FRIA: misma regla que la obligación del Art. 27', () => {
  assert.equal(modo('fria', f({ ...altoAnexoIII(['5a']), valueChainRoles: ['deployer'], publicBody: true })), 'redactar')
  assert.equal(modo('fria', f({ ...altoAnexoIII(['5b']), valueChainRoles: ['deployer'] })), 'redactar')
  assert.equal(modo('fria', f({ ...altoAnexoIII(['4a']), valueChainRoles: ['deployer'], publicBody: false })), 'no_aplica')
  assert.equal(modo('fria', f({ ...altoAnexoIII(['2']), valueChainRoles: ['deployer'], publicBody: true })), 'no_aplica')
  assert.equal(modo('fria', f({ ...altoAnexoIII(['5a']), valueChainRoles: ['provider'], publicBody: true })), 'no_aplica')
})

test('Ficha del modelo, DPIA y AISIA', () => {
  assert.equal(modo('model_card', f({ gpaiModelProvider: true })), 'redactar')
  assert.equal(modo('model_card', f({})), 'no_aplica')
  assert.equal(modo('dpia', f({ processesPersonalData: true })), 'redactar')
  assert.equal(modo('dpia', f({ processesPersonalData: null })), 'no_aplica')
  assert.equal(modo('aisia', f({ level: null })), 'redactar')
})

test('hechos a partir de la fila del sistema', () => {
  const h = applicabilityFacts({
    value_chain_roles: ['provider'], aiact_risk_level: 'limited',
    aiact_result: { level: 'high', highRiskRoute: { annex: 'III', points: ['4a'] }, art63: 'not_applicable', gpai: { modelProvider: false } },
    aiact_inputs: { publicBody: true }, is_gpai: false, manages_critical_infra: false, processes_personal_data: true,
  })
  assert.equal(h.level, 'high')
  assert.equal(h.publicBody, true)
  assert.deepEqual(h.valueChainRoles, ['provider'])
  // Sin resultado del motor, la columna.
  assert.equal(applicabilityFacts({ aiact_risk_level: 'high' }).level, 'high')
})

test('etiquetas de la documentación del proveedor', () => {
  assert.deepEqual(providerDocTags('anexo-iv', 'instrucciones'),
    ['documentacion-proveedor', 'doc-proveedor-anexo-iv', 'doc-proveedor-tipo-instrucciones'])
})

test('Plan de vigilancia poscomercialización: solo el proveedor de alto riesgo lo redacta (B26)', () => {
  assert.equal(modo('post_market_plan', f({ ...altoAnexoIII(['4a']), valueChainRoles: ['provider'] })), 'redactar')
  assert.equal(modo('post_market_plan', f({ ...altoAnexoIII(['4a']), valueChainRoles: ['deployer'] })), 'no_aplica')
  assert.equal(modo('post_market_plan', f({ valueChainRoles: ['provider'], level: 'limited' })), 'no_aplica')
})

test('FRIA que no aplica (DP-12): voluntaria para el responsable del despliegue y aviso si falta la respuesta', () => {
  const sinRespuesta = documentApplicability('fria', f({ ...altoAnexoIII(['4a']), valueChainRoles: ['deployer'], publicBody: null }))
  assert.equal(sinRespuesta.mode, 'no_aplica')
  assert.equal(sinRespuesta.missingAnswer, 'publicBody')
  assert.equal(sinRespuesta.voluntary, true)
  const noPublica = documentApplicability('fria', f({ ...altoAnexoIII(['4a']), valueChainRoles: ['deployer'], publicBody: false }))
  assert.equal(noPublica.missingAnswer, undefined)
  assert.equal(noPublica.voluntary, true)
  // Fuera del supuesto del Art. 27 no se pregunta, pero se puede redactar.
  const limitado = documentApplicability('fria', f({ level: 'limited', valueChainRoles: ['deployer'] }))
  assert.equal(limitado.missingAnswer, undefined)
  assert.equal(limitado.voluntary, true)
  // Solo proveedor: no tiene sentido redactarla.
  assert.equal(documentApplicability('fria', f({ level: 'limited', valueChainRoles: ['provider'] })).voluntary, false)
})
