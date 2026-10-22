// Cuestionario preliminar → motor único (B13b): casos de la especificación a
// partir de respuestas, y reglas de completitud y coherencia (RN-V).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { classifyQuestionnaire, answersToInputs, answersToRoles } from '../lib/preliminary-questionnaire/to-aiact'
import { coherenceErrors, missingRequired, NONE, type Answers } from '../lib/preliminary-questionnaire/schema'

/** Respuestas mínimas: usa IA, todo «ninguno», sin GPAI. */
const base = (cambios: Answers = {}): Answers => ({
  q4_usa_ia: 'si',
  propiedad: 'propio_organizacion',
  pos_roles: ['proveedor', 'responsable_despliegue'],
  c1: [NONE],
  c2a: [NONE],
  c2b_ninguno: 'si',
  c3: [NONE],
  gpai_desarrolla: 'no',
  gpai_usa_terceros: 'no',
  ...cambios,
})

test('caso 1 · chatbot sobre un LLM de terceros: riesgo limitado, 50.1 y 50.2, basado en GPAI de terceros', () => {
  const r = classifyQuestionnaire(base({ c3: ['interaccion', 'generacion'], gpai_usa_terceros: 'si' }))
  assert.equal(r.level, 'limited')
  assert.deepEqual(r.transparency.map((t) => t.article), ['50.1', '50.2'])
  assert.equal(r.gpai.thirdPartyBased, true)
})

test('caso 3 · scoring de crédito: alto riesgo Anexo III 5.b', () => {
  const a = base({ c2b_solvencia: ['solvencia'], c2b_ninguno: undefined })
  const r = classifyQuestionnaire(a)
  assert.equal(r.level, 'high')
  assert.deepEqual(r.highRiskRoute, { annex: 'III', points: ['5b'] })
  assert.deepEqual(answersToRoles(a), ['provider', 'deployer'])
})

test('caso 5 · cribado de CV con Art. 6.3 y perfiles: excepción no válida', () => {
  const r = classifyQuestionnaire(base({
    c2b_empleo: ['seleccion'], c2b_ninguno: undefined, c3: ['perfiles'],
    c63_invoca: 'si', c63_condiciones: ['a'], c63_perfiles: 'no', c63_justificacion: 'Tarea procedimental',
  }))
  assert.equal(r.level, 'high')
  assert.equal(r.art63, 'invalid')
})

test('caso 7 y 8 · emociones: prohibida sin excepción; con excepción de seguridad, Anexo III 1.c', () => {
  assert.equal(classifyQuestionnaire(base({ c1: ['emociones'] })).level, 'prohibited')
  const r = classifyQuestionnaire(base({ c1: ['emociones'], c1_exc_emociones: 'si', c1_exc_emociones__detalle: 'Seguridad' }))
  assert.equal(r.level, 'high')
  assert.deepEqual(r.highRiskRoute, { annex: 'III', points: ['1c'] })
})

test('caso 9 · componente de seguridad con evaluación de terceros: Anexo I', () => {
  const r = classifyQuestionnaire(base({ c2a: ['componente_seguridad', 'evaluacion_terceros'], c2a_productos: ['maquinaria'] }))
  assert.equal(r.level, 'high')
  assert.deepEqual(r.highRiskRoute, { annex: 'I', section: 'A', products: ['maquinaria'] })
})

test('caso 11 · modelo propio publicado con cómputo desconocido', () => {
  const r = classifyQuestionnaire(base({ gpai_desarrolla: 'si', gpai_computo: 'desconoce' }))
  assert.equal(r.gpai.modelProvider, true)
  assert.equal(r.gpai.systemicRisk, 'unknown')
})

test('caso 12 y 13 · investigación y open source sin supuestos: fuera del ámbito', () => {
  assert.equal(classifyQuestionnaire(base({ q10_exclusiones: ['id'] })).scope, 'out_of_scope')
  assert.equal(classifyQuestionnaire(base({ q10_exclusiones: ['open_source'] })).scope, 'out_of_scope')
})

test('caso 15 · no usa IA con supuestos: pendiente y no se puede completar', () => {
  const a = base({ q4_usa_ia: 'no', c3: ['decisiones'] })
  assert.equal(classifyQuestionnaire(a).level, 'pending')
  assert.ok(coherenceErrors(a).some((e) => e.includes('RN-V05')))
})

test('sin respuesta no es «no»: el bloque B sin responder deja la clasificación pendiente', () => {
  const a = base({ c2b_ninguno: undefined })
  assert.equal(answersToInputs(a).annexIII, null)
  assert.equal(classifyQuestionnaire(a).level, 'pending')
  assert.ok(missingRequired(a).some((m) => m.label.includes('Ninguno de los supuestos')))
})

test('la antigua opción «profesional» no excluye del ámbito (Q-09)', () => {
  assert.equal(classifyQuestionnaire(base({ q10_exclusiones: ['profesional'] })).scope, 'in_scope')
})

test('sin IA no se piden la finalidad ni la posición (RN-V03)', () => {
  const a: Answers = { q4_usa_ia: 'no' }
  const faltan = missingRequired(a).map((m) => m.section)
  assert.ok(!faltan.includes('Finalidad prevista'))
  assert.ok(!faltan.includes('Posición en la cadena'))
})

test('el detalle «En caso afirmativo» solo se exige con «Sí» (RN-V10)', () => {
  const faltan = (a: Answers) => missingRequired(a).filter((m) => m.label.includes('nombre del software'))
  assert.equal(faltan({ p_reutiliza: 'no' }).length, 0)
  assert.equal(faltan({ p_reutiliza: 'si' }).length, 1)
})

test('coherencia: «ninguno» con otros roles y Anexo I incompleto', () => {
  assert.ok(coherenceErrors(base({ pos_roles: ['ninguno', 'proveedor'] })).some((e) => e.includes('RN-V08')))
  assert.ok(coherenceErrors(base({ c2a: ['componente_seguridad'] })).some((e) => e.includes('RN-V06')))
})
