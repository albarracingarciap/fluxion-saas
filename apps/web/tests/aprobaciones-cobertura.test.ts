// Cobertura de los niveles del plan por las políticas de aprobación (B11e).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { planLevelsWithoutPolicy, type CoveragePolicy } from '../lib/approvals/coverage'

const plan = (conditions: Record<string, string[]>, is_active = true): CoveragePolicy =>
  ({ object_type: 'treatment_plan', is_active, conditions })

test('las políticas por defecto cubren los tres niveles', () => {
  assert.deepEqual(planLevelsWithoutPolicy([
    plan({ approval_level: ['level_1'] }),
    plan({ approval_level: ['level_2'] }),
    plan({ approval_level: ['level_3'] }),
  ]), [])
})

test('una política sin condiciones cubre todos los niveles', () => {
  assert.deepEqual(planLevelsWithoutPolicy([plan({})]), [])
})

test('inactivas, de otro tipo o con otras condiciones no cubren', () => {
  assert.deepEqual(planLevelsWithoutPolicy([
    plan({ approval_level: ['level_1'] }, false),
    { object_type: 'document', is_active: true, conditions: {} },
    plan({ approval_level: ['level_2'], has_security_controls: ['true'] }),
    plan({ approval_level: ['level_3'] }),
  ]), ['level_1', 'level_2'])
})
