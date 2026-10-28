// Revisión por la dirección (lib/iso/management-review.ts, B20c).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  MANAGEMENT_REVIEW_INPUTS, followsIso42001, managementReviewAgenda, managementReviewDue,
  refreshManagementReviewAgenda, type ManagementReviewData,
} from '../lib/iso/management-review'

const AHORA = '2026-10-28T10:00:00Z'
const datos: ManagementReviewData = {
  previousReviewAt: '2025-11-15T10:00:00Z',
  previousActions: { total: 4, done: 3, open: 1, overdue: 1 },
  systems: { active: 6, highRisk: 2, newSincePrevious: 3, retired: 1 },
  authorityRequests: 1,
  incidents: { total: 5, serious: 1, open: 2 },
  openReevaluations: 2,
  overdueTreatmentActions: 3,
  expiredEvidences: 4,
  sgai: { resolved: 6, total: 10 },
  soa: { lifecycle: 'approved', implemented: 20, applicable: 30 },
  internalAuditStatus: 'in_progress',
  literacy: { members: 8, withLiteracy: 7 },
}

test('orden del día con las entradas de §9.3.2 y los resultados de §9.3.3', () => {
  const a = managementReviewAgenda(datos)
  assert.equal(a.length, MANAGEMENT_REVIEW_INPUTS.length)
  assert.match(a[0]!.title, /§9\.3\.2 a/)
  assert.match(a[a.length - 1]!.title, /§9\.3\.3/)
  assert.match(a[0]!.data_summary!, /completados 3, abiertos 1 \(1 vencidos\)/)
  assert.match(a[3]!.data_summary!, /5 \(1 graves\)/)
  assert.match(a[4]!.data_summary!, /6 de 10/)
  assert.match(a[5]!.data_summary!, /En curso/)
  assert.equal(a[a.length - 1]!.data_summary, null)
})

test('primera revisión: sin acciones anteriores', () => {
  const a = managementReviewAgenda({ ...datos, previousReviewAt: null })
  assert.match(a[0]!.data_summary!, /Primera revisión/)
  assert.match(a[1]!.data_summary!, /sin revisión anterior/)
})

test('actualizar los datos no toca lo redactado y añade los puntos si faltan', () => {
  const a = managementReviewAgenda(datos).map((p) => ({ ...p, notes: 'Comentado' }))
  const b = refreshManagementReviewAgenda(a, { ...datos, incidents: { total: 9, serious: 2, open: 0 } })
  assert.equal(b[3]!.notes, 'Comentado')
  assert.match(b[3]!.data_summary!, /9 \(2 graves\)/)
  const libre = [{ id: 'p1', title: 'Otro', notes: '', approval_request_id: null }]
  const c = refreshManagementReviewAgenda(libre, datos)
  assert.equal(c.length, MANAGEMENT_REVIEW_INPUTS.length + 1)
  assert.equal(c[c.length - 1]!.title, 'Otro')
})

test('la tarea se crea 30 días antes de cumplirse los 12 meses', () => {
  assert.deepEqual(managementReviewDue(null, AHORA), { due: true, dueDate: '2026-11-27' })
  assert.deepEqual(managementReviewDue('2025-11-15T10:00:00Z', AHORA), { due: true, dueDate: '2026-11-15' })
  assert.equal(managementReviewDue('2026-01-10T10:00:00Z', AHORA).due, false)
})

test('quién sigue ISO/IEC 42001', () => {
  assert.equal(followsIso42001(['AI Act', 'ISO 42001'], false), true)
  assert.equal(followsIso42001(['AI Act'], false), false)
  assert.equal(followsIso42001(null, true), true)
})
