// Modalidad de supervisión humana (lib/hitl/review-mode.ts, B30a).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { isReviewMode, silentPerCaseSystems } from '../lib/hitl/review-mode'

test('solo se avisan los sistemas «por caso» sin decisiones recientes', () => {
  const sistemas = [
    { id: 'a', mode: 'per_case' as const },
    { id: 'b', mode: 'per_case' as const },
    { id: 'c', mode: 'sampling' as const },
    { id: 'd', mode: null },
  ]
  assert.deepEqual(silentPerCaseSystems(sistemas, new Set(['b'])).map((s) => s.id), ['a'])
})

test('modalidades válidas', () => {
  assert.equal(isReviewMode('monitoring_only'), true)
  assert.equal(isReviewMode('otra'), false)
  assert.equal(isReviewMode(null), false)
})
