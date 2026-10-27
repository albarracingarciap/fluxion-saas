// Requerimientos de la autoridad (lib/governance/authority-requests.ts, B25d).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { requestAlertThresholds, requestDeadline, requestDeadlineLabel } from '../lib/governance/authority-requests'

const HOY = '2026-10-28'

test('un requerimiento respondido o cerrado no tiene plazo vivo', () => {
  assert.deepEqual(requestDeadline('answered', '2026-10-01', HOY), { state: 'respondido' })
  assert.deepEqual(requestDeadline('closed', null, HOY), { state: 'respondido' })
})

test('sin fecha límite, sin plazo', () => {
  assert.deepEqual(requestDeadline('received', null, HOY), { state: 'sin_plazo' })
})

test('en plazo, próximo (5 días o menos) y vencido', () => {
  assert.deepEqual(requestDeadline('received', '2026-11-12', HOY), { state: 'en_plazo', daysLeft: 15 })
  assert.deepEqual(requestDeadline('in_progress', '2026-11-02', HOY), { state: 'proximo', daysLeft: 5 })
  assert.equal(requestDeadlineLabel(requestDeadline('received', HOY, HOY)), 'Vence hoy')
  assert.deepEqual(requestDeadline('received', '2026-10-27', HOY), { state: 'vencido', daysOverdue: 1 })
  assert.equal(requestDeadlineLabel(requestDeadline('received', '2026-10-26', HOY)), 'Plazo vencido hace 2 días')
})

test('avisos de plazo: próximo con 5 días o menos y vencido (B25e)', () => {
  assert.deepEqual(requestAlertThresholds('received', '2026-11-12', HOY), [])
  assert.deepEqual(requestAlertThresholds('in_progress', '2026-11-02', HOY), ['soon'])
  assert.deepEqual(requestAlertThresholds('received', '2026-10-20', HOY), ['soon', 'overdue'])
  assert.deepEqual(requestAlertThresholds('answered', '2026-10-20', HOY), [])
  assert.deepEqual(requestAlertThresholds('received', null, HOY), [])
})
