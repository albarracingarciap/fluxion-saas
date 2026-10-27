// Cuestionario preliminar → asistente de alta (B13c).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { answersToInputs } from '../lib/preliminary-questionnaire/to-aiact'
import { inputsToAnswers, questionnaireToWizard, wizardAiActInputs } from '../lib/preliminary-questionnaire/to-wizard'
import { NONE, type Answers } from '../lib/preliminary-questionnaire/schema'

const respuestas: Answers = {
  responsable: 'Ana Pérez',
  q1_tipo: 'proyecto',
  q2_objeto: 'Scoring de solvencia para préstamos',
  q3_datos_personales: 'si',
  q4_usa_ia: 'si',
  q5_tecnologia: 'XGBoost',
  q8_uso: 'Evaluar la solvencia de solicitantes',
  propiedad: 'propio_organizacion',
  pos_roles: ['proveedor', 'responsable_despliegue'],
  c1: [NONE], c2a: [NONE], c2b_solvencia: ['solvencia'],
  c3: ['predicciones', 'perfiles'],
  gpai_desarrolla: 'no', gpai_usa_terceros: 'no',
  u_forma: ['fine_tuning'],
}

test('volcado §6.3: identificación, propósito, impacto, tecnología y gobierno', () => {
  const { initial, prefilledKeys, domainCandidates } = questionnaireToWizard(respuestas)
  assert.equal(initial.name, 'XGBoost')
  assert.equal(initial.domain, 'credito')
  assert.equal(initial.status, 'desarrollo')
  assert.deepEqual(initial.outputTypes, ['clasificacion', 'prediccion'])
  assert.equal(initial.affectsPersons, true)
  assert.equal(initial.origin, 'interno')
  assert.deepEqual(initial.valueChainRoles, ['provider', 'deployer'])
  assert.equal(initial.hasFineTuning, true)
  assert.equal(initial.aiOwner, 'Ana Pérez')
  assert.deepEqual(domainCandidates, [])
  assert.ok(prefilledKeys.includes('domain') && !prefilledKeys.includes('aiactAnswers'))
})

test('varios supuestos del Anexo III: el dominio queda vacío con sus candidatos (RN-W03)', () => {
  const { initial, domainCandidates } = questionnaireToWizard({ ...respuestas, c2b_empleo: ['seleccion'] })
  assert.equal(initial.domain, undefined)
  assert.deepEqual(domainCandidates.sort(), ['credito', 'rrhh'])
})

test('los supuestos se conservan y el asistente clasifica con ellos', () => {
  const { initial } = questionnaireToWizard(respuestas)
  const inputs = wizardAiActInputs({ ...initial, aiactAnswers: initial.aiactAnswers as Answers })
  assert.deepEqual(inputs?.annexIII, ['5b'])
  assert.equal(inputs?.fineTuning, true)
  assert.equal(wizardAiActInputs({ isAISystem: true }), null)
})

test('ida y vuelta: supuestos guardados → respuestas → supuestos', () => {
  const a: Answers = {
    ...respuestas,
    c1: ['emociones'], c1_exc_emociones: 'si', c1_exc_emociones__detalle: 'Seguridad',
    c2a: ['componente_seguridad', 'evaluacion_terceros'], c2a_productos: ['maquinaria'],
    c63_invoca: 'si', c63_condiciones: ['d'], c63_perfiles: 'no', c63_justificacion: 'Preparatoria',
    gpai_desarrolla: 'si', gpai_computo: 'desconoce', q_organismo_publico: 'no',
  }
  const inputs = answersToInputs(a)
  assert.deepEqual(answersToInputs({ q4_usa_ia: 'si', ...inputsToAnswers(inputs)! }).annexIII, inputs.annexIII)
  const vuelta = answersToInputs({ q4_usa_ia: 'si', ...inputsToAnswers(inputs)!, u_forma: ['fine_tuning'] })
  assert.deepEqual(vuelta, inputs)
})

test('el origen del paso 5 manda sobre la propiedad del bloque si la contradice (B13c)', () => {
  const { initial } = questionnaireToWizard(respuestas)
  const supuestos = initial.aiactAnswers as Answers
  assert.equal(wizardAiActInputs({ aiactAnswers: supuestos, origin: 'interno' })?.ownership, 'propio_organizacion')
  assert.equal(wizardAiActInputs({ aiactAnswers: supuestos, origin: 'saas' })?.ownership, 'tercero_organizacion')
  assert.equal(wizardAiActInputs({ aiactAnswers: { ...supuestos, propiedad: 'propio_cliente' }, origin: 'interno' })?.ownership, 'propio_cliente')
})

test('práctica prohibida sin excepción: se precarga (RN-P10)', () => {
  assert.equal(questionnaireToWizard({ ...respuestas, c1: ['scoring_social'] }).initial.prohibitedPractice, true)
  assert.equal(questionnaireToWizard({ ...respuestas, c1: ['emociones'], c1_exc_emociones: 'si', c1_exc_emociones__detalle: 'x' }).initial.prohibitedPractice, undefined)
})

test('proveedor sobrevenido (Art. 25): un «sí» añade el rol de proveedor (DP-11)', () => {
  const despliegue: Answers = { ...respuestas, pos_roles: ['responsable_despliegue'] }
  assert.deepEqual(questionnaireToWizard(despliegue).initial.valueChainRoles, ['deployer'])
  assert.deepEqual(
    questionnaireToWizard({ ...despliegue, a25_modificacion: 'si' }).initial.valueChainRoles,
    ['deployer', 'provider'],
  )
  // Ya declarado como proveedor: no se repite.
  assert.deepEqual(
    questionnaireToWizard({ ...respuestas, a25_marca: 'si' }).initial.valueChainRoles,
    ['provider', 'deployer'],
  )
})
