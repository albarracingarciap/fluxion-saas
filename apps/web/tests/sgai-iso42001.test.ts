// Sistema de gestión ISO/IEC 42001 (lib/iso/management-system.ts, B20a).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { sgaiDataProposal, type SgaiFacts } from '../lib/iso/management-system'

const AHORA = '2026-10-28T10:00:00Z'
const base: SgaiFacts = { inScopeSystems: 3, riskEvaluationApproved: 3, aisiaApproved: 2, activeMembers: 5, literacyMembers: 5, lastManagementReviewAt: null }

test('§8.2 y §6.1.4 con todos los sistemas del alcance aprobados', () => {
  assert.match(sgaiDataProposal('ISO42001-8.2', base, AHORA)!.reason, /3 sistemas del alcance/)
  assert.equal(sgaiDataProposal('ISO42001-6.1.4', base, AHORA), null)
  assert.equal(sgaiDataProposal('ISO42001-8.2', { ...base, inScopeSystems: 0, riskEvaluationApproved: 0 }, AHORA), null)
})

test('§7.2 con todos los miembros activos alfabetizados', () => {
  assert.notEqual(sgaiDataProposal('ISO42001-7.2', base, AHORA), null)
  assert.equal(sgaiDataProposal('ISO42001-7.2', { ...base, literacyMembers: 4 }, AHORA), null)
})

test('§9.3 con una revisión por la dirección en los últimos 12 meses', () => {
  assert.equal(sgaiDataProposal('ISO42001-9.3', base, AHORA), null)
  assert.notEqual(sgaiDataProposal('ISO42001-9.3', { ...base, lastManagementReviewAt: '2026-01-15T10:00:00Z' }, AHORA), null)
  assert.equal(sgaiDataProposal('ISO42001-9.3', { ...base, lastManagementReviewAt: '2025-09-01T10:00:00Z' }, AHORA), null)
})

test('las demás cláusulas no tienen propuesta por datos', () => {
  assert.equal(sgaiDataProposal('ISO42001-9.2', base, AHORA), null)
})
