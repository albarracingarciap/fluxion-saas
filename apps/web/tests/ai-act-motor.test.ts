// Motor único de clasificación AI Act (B13a): casos de prueba de la
// especificación (docs/producto/cuestionario-preliminar-reglas.md, §9).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  catalogCodeFromRef,
  classifyAiAct,
  classifyByFallback,
  classifySystem,
  emptyAiActInputs,
  suggestObligations,
  type AiActInputs,
  type CatalogObligation,
  type ValueChainRole,
} from '../lib/ai-act'

/** Todo respondido como «ninguno de los anteriores», salvo lo que se cambie. */
function inp(cambios: Partial<AiActInputs> = {}): AiActInputs {
  return {
    ...emptyAiActInputs(),
    isAiSystem: true,
    exclusions: [],
    prohibited: { practices: [], exceptions: {} },
    annexI: { safetyComponent: false, isProduct: false, thirdPartyAssessment: false, products: [] },
    annexIII: [],
    functions: [],
    deepfake: false,
    publicInterestText: false,
    gpai: { providesModel: false, compute: null, openLicense: null, usesThirdPartyModel: false, finetunesThirdPartyModel: false },
    fineTuning: false,
    publicBody: false,
    ...cambios,
  }
}

const reglas = (r: { basis: { rule: string }[]; warnings: { rule: string }[] }) =>
  [...r.basis, ...r.warnings].map((n) => n.rule)

// Catálogo con el Art. 50 dividido y la obligación del Art. 6.4 (B13d).
const R = (code: string, scope: string, roles: string[]): CatalogObligation => ({ code, scope, applies_to_roles: roles })
const CATALOGO: CatalogObligation[] = [
  R('AI-ACT-ART4', 'all', ['provider', 'deployer']),
  R('AI-ACT-ART5', 'all', ['provider', 'deployer', 'importer', 'distributor', 'authorised_representative']),
  R('AI-ACT-ART6-4', 'all', ['provider']),
  R('AI-ACT-ART9', 'high_risk', ['provider']),
  R('AI-ACT-ART26', 'high_risk', ['deployer']),
  R('AI-ACT-ART27', 'high_risk', ['deployer']),
  R('AI-ACT-ART50-1', 'transparency', ['provider']),
  R('AI-ACT-ART50-2', 'transparency', ['provider']),
  R('AI-ACT-ART50-3', 'transparency', ['deployer']),
  R('AI-ACT-ART50-4', 'transparency', ['deployer']),
  R('AI-ACT-ART53', 'gpai', ['provider']),
  R('AI-ACT-ART55', 'gpai', ['provider']),
]
const obl = (i: AiActInputs, roles: ValueChainRole[], publicBody = false) =>
  suggestObligations({ result: classifyAiAct(i, roles), roles, catalog: CATALOGO, publicBody })

test('1 · chatbot propio sobre un LLM de terceros: riesgo limitado, Art. 50.1 y 50.2', () => {
  const i = inp({ ownership: 'propio_organizacion', functions: ['interaccion', 'generacion'],
    gpai: { providesModel: false, compute: null, openLicense: null, usesThirdPartyModel: true, finetunesThirdPartyModel: false } })
  const r = classifyAiAct(i, ['provider', 'deployer'])
  assert.equal(r.level, 'limited')
  assert.deepEqual(r.transparency.map((t) => t.article), ['50.1', '50.2'])
  assert.equal(r.gpai.thirdPartyBased, true)
  assert.deepEqual(obl(i, ['provider', 'deployer']).sort(), ['AI-ACT-ART4', 'AI-ACT-ART50-1', 'AI-ACT-ART50-2'])
})

test('2 · resúmenes con un LLM comercial: limitado, sin Art. 50 para el responsable del despliegue', () => {
  const i = inp({ ownership: 'tercero_organizacion', functions: ['generacion'] })
  assert.equal(classifyAiAct(i, ['deployer']).level, 'limited')
  assert.deepEqual(obl(i, ['deployer']), ['AI-ACT-ART4'])
})

test('3 · scoring de crédito propio: alto riesgo Anexo III 5.b, obligaciones de ambos roles y FRIA', () => {
  const i = inp({ ownership: 'propio_organizacion', annexIII: ['5b'] })
  const r = classifyAiAct(i, ['provider', 'deployer'])
  assert.equal(r.level, 'high')
  assert.deepEqual(r.highRiskRoute, { annex: 'III', points: ['5b'] })
  const o = obl(i, ['provider', 'deployer'])
  for (const c of ['AI-ACT-ART9', 'AI-ACT-ART26', 'AI-ACT-ART27']) assert.ok(o.includes(c), c)
})

test('4 · detección de fraude: riesgo mínimo', () => {
  const i = inp({ functions: ['patrones'] })
  assert.equal(classifyAiAct(i, ['deployer']).level, 'minimal')
  assert.deepEqual(obl(i, ['deployer']), ['AI-ACT-ART4'])
})

test('5 · cribado de CV con Art. 6.3 y perfilado: excepción no válida, alto riesgo 4.a', () => {
  const i = inp({ annexIII: ['4a'], functions: ['perfiles'],
    art63: { invoked: true, conditions: ['a'], profiling: null, justification: 'Tarea procedimental' } })
  const r = classifyAiAct(i, ['provider'])
  assert.equal(r.level, 'high')
  assert.equal(r.art63, 'invalid')
  assert.ok(reglas(r).includes('RN-E02'))
})

test('6 · expedientes con excepción válida del Art. 6.3: mínimo y obligación de documentarla', () => {
  const i = inp({ annexIII: ['5a'],
    art63: { invoked: true, conditions: ['d'], profiling: false, justification: 'Tarea preparatoria' } })
  const r = classifyAiAct(i, ['provider'])
  assert.equal(r.level, 'minimal')
  assert.equal(r.art63, 'valid')
  assert.ok(obl(i, ['provider']).includes('AI-ACT-ART6-4'))
})

test('7 · emociones de empleados sin excepción: práctica prohibida, solo Art. 5', () => {
  const i = inp({ prohibited: { practices: ['emociones'], exceptions: {} } })
  assert.equal(classifyAiAct(i, ['deployer']).level, 'prohibited')
  assert.deepEqual(obl(i, ['deployer']), ['AI-ACT-ART5'])
})

test('8 · emociones por seguridad: alto riesgo Anexo III 1.c y Art. 50.3', () => {
  const i = inp({ prohibited: { practices: ['emociones'], exceptions: { emociones: 'Motivos de seguridad' } } })
  const r = classifyAiAct(i, ['deployer'])
  assert.equal(r.level, 'high')
  assert.deepEqual(r.highRiskRoute, { annex: 'III', points: ['1c'] })
  assert.ok(obl(i, ['deployer']).includes('AI-ACT-ART50-3'))
})

test('9 · componente de seguridad de una máquina con evaluación de terceros: Anexo I Sección A', () => {
  const i = inp({ annexI: { safetyComponent: true, isProduct: false, thirdPartyAssessment: true, products: ['maquinaria'] } })
  const r = classifyAiAct(i, ['provider'])
  assert.equal(r.level, 'high')
  assert.deepEqual(r.highRiskRoute, { annex: 'I', section: 'A', products: ['maquinaria'] })
})

test('10 · ídem sin evaluación de terceros: no es alto riesgo por el Anexo I (aviso RN-H02)', () => {
  const i = inp({ annexI: { safetyComponent: true, isProduct: false, thirdPartyAssessment: false, products: ['maquinaria'] } })
  const r = classifyAiAct(i, ['provider'])
  assert.equal(r.level, 'minimal')
  assert.ok(reglas(r).includes('RN-H02'))
})

test('11 · modelo fundacional propio publicado: proveedor GPAI, riesgo sistémico sin determinar', () => {
  const i = inp({ gpai: { providesModel: true, compute: 'unknown', openLicense: false, usesThirdPartyModel: false, finetunesThirdPartyModel: false } })
  const r = classifyAiAct(i, ['provider'])
  assert.equal(r.gpai.modelProvider, true)
  assert.equal(r.gpai.systemicRisk, 'unknown')
  assert.ok(reglas(r).includes('RN-G03'))
  const o = obl(i, ['provider'])
  assert.ok(o.includes('AI-ACT-ART53'))
  assert.ok(!o.includes('AI-ACT-ART55'))
})

test('12 · investigación científica: fuera del ámbito, Art. 2.6, con aviso', () => {
  const r = classifyAiAct(inp({ exclusions: ['id'] }))
  assert.equal(r.scope, 'out_of_scope')
  assert.equal(r.level, null)
  assert.ok(reglas(r).includes('RN-A05'))
  assert.deepEqual(suggestObligations({ result: r, roles: ['provider'], catalog: CATALOGO }), [])
})

test('13 · librería open source sin supuestos: fuera del ámbito, Art. 2.12', () => {
  const r = classifyAiAct(inp({ exclusions: ['open_source'] }))
  assert.equal(r.scope, 'out_of_scope')
  assert.match(r.scopeReason ?? '', /2\.12/)
})

test('14 · open source para identificación biométrica: alto riesgo 1.a, la exclusión no aplica', () => {
  const r = classifyAiAct(inp({ exclusions: ['open_source'], annexIII: ['1a'] }))
  assert.equal(r.level, 'high')
  assert.ok(reglas(r).includes('RN-A06'))
})

test('15 · no usa IA pero marca supuestos: pendiente, aviso RN-V05', () => {
  const r = classifyAiAct(inp({ isAiSystem: false, functions: ['decisiones'] }))
  assert.equal(r.level, 'pending')
  assert.ok(reglas(r).includes('RN-V05'))
})

test('sin respuesta no es «no»: falta un bloque → pendiente (RN-V01)', () => {
  const r = classifyAiAct(inp({ annexIII: null }))
  assert.equal(r.level, 'pending')
  assert.ok(reglas(r).includes('RN-V01'))
})

test('respaldo sin supuestos: GPAI ya no es un nivel (D3)', () => {
  const r = classifyByFallback({ isAISystem: true, isGPAI: true, outputType: 'generacion' })
  assert.equal(r.method, 'respaldo')
  assert.equal(r.level, 'limited')
  assert.equal(r.gpai.modelProvider, true)
  assert.equal(classifySystem({ inputs: null, fields: { isAISystem: true, domain: 'rrhh', affectsPersons: true, outputType: 'decision' } }).level, 'high')
})

// RN-O08 (B17a): el Art. 26 por apartados.
const ART26 = ['1', '2', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((n) => R(`AI-ACT-ART26-${n}`, 'high_risk', ['deployer']))
const art26 = (i: AiActInputs, roles: ValueChainRole[], publicBody = false) =>
  suggestObligations({ result: classifyAiAct(i, roles), roles, catalog: ART26, publicBody })
    .map((c) => c.replace('AI-ACT-ART26-', '')).sort((a, b) => Number(a) - Number(b))

test('RN-O08 · Art. 26 por apartados: los generales a todo responsable del despliegue de alto riesgo', () => {
  assert.deepEqual(art26(inp({ annexIII: ['5b'] }), ['deployer']), ['1', '2', '4', '5', '6', '9', '11', '12'])
  // Solo para el responsable del despliegue y solo en alto riesgo.
  assert.deepEqual(art26(inp({ annexIII: ['5b'] }), ['provider']), [])
  assert.deepEqual(art26(inp(), ['deployer']), [])
})

test('RN-O08 · 26.7 trabajadores (empleo), 26.8 autoridad pública, 26.10 biometría remota, 26.11 personas', () => {
  assert.ok(art26(inp({ annexIII: ['4a'] }), ['deployer']).includes('7'))
  assert.ok(!art26(inp({ annexIII: ['5b'] }), ['deployer']).includes('7'))
  assert.ok(art26(inp({ annexIII: ['4a'] }), ['deployer'], true).includes('8'))
  assert.ok(!art26(inp({ annexIII: ['4a'] }), ['deployer'], false).includes('8'))
  assert.ok(art26(inp({ annexIII: ['1a'] }), ['deployer']).includes('10'))
  assert.ok(!art26(inp({ annexIII: ['1b'] }), ['deployer']).includes('10'))
  // Solo infraestructura crítica: ni registro de autoridad pública ni personas afectadas.
  const infra = art26(inp({ annexIII: ['2'] }), ['deployer'], true)
  assert.ok(!infra.includes('8') && !infra.includes('11'))
})

test('código del catálogo desde la etiqueta: cada apartado es su propia obligación (B17a)', () => {
  assert.equal(catalogCodeFromRef('Art. 9 — Sistema de gestión de riesgos'), 'AI-ACT-ART9')
  assert.equal(catalogCodeFromRef('Art. 26.1 — Uso conforme a las instrucciones'), 'AI-ACT-ART26-1')
  assert.equal(catalogCodeFromRef('Art. 26.11 — Información a las personas afectadas'), 'AI-ACT-ART26-11')
  assert.equal(catalogCodeFromRef('Art. 50.2 — Marcado del contenido sintético'), 'AI-ACT-ART50-2')
  assert.equal(catalogCodeFromRef('Art. 6.4 — Documentar la excepción'), 'AI-ACT-ART6-4')
  assert.equal(catalogCodeFromRef('Art. 71'), 'AI-ACT-ART49')
  assert.equal(catalogCodeFromRef('AI-ACT-ART26-5'), 'AI-ACT-ART26-5')
  assert.equal(catalogCodeFromRef('Otra cosa'), null)
})
