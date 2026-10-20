// Reglas del plan de tratamiento y roles del circuito (DP-01).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  getApprovalLevelForZone,
  getApprovalLevelLabel,
  getDefaultDeadlineForZone,
  getReviewCadenceForZone,
  pickPlanApprover,
  type ApproverCandidate,
} from '../lib/fmea/treatment-plan-rules'
import { canPrepareTreatmentPlan, canResolveFmeaSecondReview } from '../lib/auth/roles-flujo'

test('nivel de aprobación por zona', () => {
  assert.equal(getApprovalLevelForZone('zona_i'), 'level_3')
  assert.equal(getApprovalLevelForZone('zona_ii'), 'level_2')
  assert.equal(getApprovalLevelForZone('zona_iii'), 'level_1')
  assert.equal(getApprovalLevelForZone('zona_iv'), 'level_1')
})

test('nombre de negocio del nivel', () => {
  assert.equal(getApprovalLevelLabel('level_1'), 'Nivel 1 · Responsable')
  assert.equal(getApprovalLevelLabel('level_3'), 'Nivel 3 · Dirección')
  assert.equal(getApprovalLevelLabel('otro'), 'Nivel sin definir')
})

test('cadencia de revisión por zona', () => {
  assert.equal(getReviewCadenceForZone('zona_i'), 'monthly')
  assert.equal(getReviewCadenceForZone('zona_ii'), 'quarterly')
  assert.equal(getReviewCadenceForZone('zona_iii'), 'biannual')
  assert.equal(getReviewCadenceForZone('zona_iv'), 'annual')
})

test('plazo del plan por zona: 30, 90, 180 y 365 días', () => {
  const desde = new Date('2026-01-01T12:00:00Z')
  assert.equal(getDefaultDeadlineForZone('zona_i', desde), '2026-01-31')
  assert.equal(getDefaultDeadlineForZone('zona_ii', desde), '2026-04-01')
  assert.equal(getDefaultDeadlineForZone('zona_iii', desde), '2026-06-30')
  assert.equal(getDefaultDeadlineForZone('zona_iv', desde), '2027-01-01')
})

test('preparan el plan el Analista de riesgos y el Responsable del sistema; el DPO no', () => {
  assert.equal(canPrepareTreatmentPlan('risk_analyst'), true)
  assert.equal(canPrepareTreatmentPlan('system_owner'), true)
  assert.equal(canPrepareTreatmentPlan('dpo'), false)
  assert.equal(canPrepareTreatmentPlan('org_admin'), false)
  assert.equal(canPrepareTreatmentPlan(null), false)
})

test('la segunda revisión la resuelve el Responsable del SGAI', () => {
  assert.equal(canResolveFmeaSecondReview('sgai_manager'), true)
  assert.equal(canResolveFmeaSecondReview('dpo'), false)
})

const miembro = (user_id: string, role: string, is_active: boolean | null = true): ApproverCandidate => ({
  user_id,
  role,
  is_active,
})

test('aprobador sin política: Responsable del SGAI activo y distinto de quien envía', () => {
  const miembros = [
    miembro('sgai-baja', 'sgai_manager', false),
    miembro('analista', 'risk_analyst'),
    miembro('sgai-1', 'sgai_manager'),
    miembro('sgai-2', 'sgai_manager'),
  ]
  assert.equal(pickPlanApprover(miembros, 'level_1', 'analista'), 'sgai-1')
  // quien prepara no aprueba
  assert.equal(pickPlanApprover(miembros, 'level_1', 'sgai-1'), 'sgai-2')
  // niveles 2 y 3 sin política: también el Responsable del SGAI
  assert.equal(pickPlanApprover(miembros, 'level_3', 'analista'), 'sgai-1')
})

test('sin candidato no se asigna a nadie', () => {
  const miembros = [miembro('dpo', 'dpo'), miembro('admin', 'org_admin'), miembro('sgai', 'sgai_manager', false)]
  assert.equal(pickPlanApprover(miembros, 'level_1', 'otro'), null)
  assert.equal(pickPlanApprover([miembro('sgai', 'sgai_manager')], 'level_1', 'sgai'), null)
})
