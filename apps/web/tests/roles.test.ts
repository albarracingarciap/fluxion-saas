// Comprobación de roles múltiples (lib/auth/roles.ts, B23a).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { findIncompatibleRoles, hasAnyRole, hasRole, rolesOf } from '../lib/auth/roles'

test('sin lista de roles se usa el principal', () => {
  assert.deepEqual(rolesOf({ role: 'viewer' }), ['viewer'])
  assert.deepEqual(rolesOf({ role: 'viewer', roles: [] }), ['viewer'])
  assert.deepEqual(rolesOf(null), [])
})

test('hasRole y hasAnyRole miran todos los roles', () => {
  const admin = { role: 'org_admin', roles: ['org_admin', 'sgai_manager'] }
  assert.equal(hasRole(admin, 'sgai_manager'), true)
  assert.equal(hasRole(admin, 'dpo'), false)
  assert.equal(hasAnyRole(admin, ['caio', 'sgai_manager']), true)
  assert.equal(hasAnyRole(admin, new Set(['caio'])), false)
})

test('DPO y Responsable del SGAI son incompatibles', () => {
  assert.deepEqual(findIncompatibleRoles(['dpo', 'sgai_manager']), ['dpo', 'sgai_manager'])
  assert.equal(findIncompatibleRoles(['org_admin', 'dpo']), null)
})

test('etiquetas de rol según el glosario', async () => {
  const { getRoleLabel, ROLE_LABELS } = await import('../lib/auth/role-labels')
  assert.equal(getRoleLabel('sgai_manager'), 'Responsable del SGAI')
  assert.equal(getRoleLabel('system_owner'), 'Responsable del sistema')
  assert.equal(getRoleLabel(null), 'Lector')
  assert.equal(Object.keys(ROLE_LABELS).length, 10)
})
