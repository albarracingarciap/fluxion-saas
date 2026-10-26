// Varios tipos de output por sistema (TODO 78): normalización, motor de
// respaldo y señales del FMEA leen la lista completa, no solo el primero.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { classifyByFallback } from '../lib/ai-act'
import { deriveActivationSignals } from '../lib/failure-modes/activation-engine'
import {
  formatOutputTypes,
  normalizeOutputTypes,
  withPrincipalOutputType,
} from '../lib/ai-systems/output-types'

test('normaliza: sin repetidos ni valores desconocidos; sin lista usa el tipo único', () => {
  assert.deepEqual(normalizeOutputTypes(['generacion', 'decision', 'generacion', 'texto']), ['generacion', 'decision'])
  assert.deepEqual(normalizeOutputTypes([], 'decision'), ['decision'])
  assert.deepEqual(normalizeOutputTypes(null, null), [])
})

test('formato para fichas e informes', () => {
  assert.equal(formatOutputTypes(['decision', 'generacion']), 'Decisión automática, Generación de contenido')
  assert.equal(formatOutputTypes(null, 'prediccion'), 'Predicción / Estimación')
  assert.equal(formatOutputTypes(null, null), '')
})

test('cambiar el principal conserva el resto de tipos', () => {
  assert.deepEqual(withPrincipalOutputType(['decision', 'generacion'], 'generacion'), ['generacion', 'decision'])
  assert.deepEqual(withPrincipalOutputType(['decision'], 'prediccion'), ['prediccion', 'decision'])
})

test('respaldo: RRHH con «generación» primero y «decisión» después es alto riesgo', () => {
  const base = { isAISystem: true, affectsPersons: true, domain: 'rrhh' }
  assert.equal(classifyByFallback({ ...base, outputType: 'generacion' }).level, 'limited')
  assert.equal(classifyByFallback({ ...base, outputType: 'generacion', outputTypes: ['generacion', 'decision'] }).level, 'high')
})

test('respaldo: «generación» en segundo lugar activa el Art. 50.2', () => {
  const r = classifyByFallback({ isAISystem: true, domain: 'marketing', outputType: 'recomendacion', outputTypes: ['recomendacion', 'generacion'] })
  assert.equal(r.level, 'limited')
  assert.deepEqual(r.transparency.map((t) => t.article), ['50.2'])
})

test('FMEA: un sistema con «generación» en segundo lugar es generativo', () => {
  assert.equal(deriveActivationSignals({ outputType: 'recomendacion' }).isGenerative, false)
  assert.equal(deriveActivationSignals({ outputType: 'recomendacion', outputTypes: ['recomendacion', 'generacion'] }).isGenerative, true)
})
