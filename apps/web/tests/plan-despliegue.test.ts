// Plan de despliegue de alto riesgo (lib/evaluation-status/deployment.ts, B18b).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  deploymentPlan,
  deploymentWarning,
  prohibitedStatusError,
  type DeploymentPlanFacts,
} from '../lib/evaluation-status/deployment'

const completo: DeploymentPlanFacts = {
  systemId: 's1',
  level: 'high',
  valueChainRoles: ['deployer'],
  providerInstructions: true,
  providerDeclaration: true,
  oversightDocumented: true,
  fria: { approved: true, notified: true },
  inputData: 'resolved',
  workersInformed: 'resolved',
  affectedInformed: 'resolved',
}
const con = (cambios: Partial<DeploymentPlanFacts>) => ({ ...completo, ...cambios })

test('solo aplica a alto riesgo con la organización como responsable del despliegue', () => {
  assert.equal(deploymentPlan(con({ level: 'limited' })), null)
  assert.equal(deploymentPlan(con({ valueChainRoles: ['provider'] })), null)
  assert.ok(deploymentPlan(con({ valueChainRoles: ['provider', 'deployer'] })))
})

test('completo con la documentación del proveedor, la supervisión, la FRIA y las obligaciones del Art. 26', () => {
  const plan = deploymentPlan(completo)!
  assert.equal(plan.complete, true)
  assert.equal(plan.items.length, 7)
  assert.equal(deploymentWarning(plan), null)
})

test('el marcado CE es la declaración UE del proveedor; la FRIA cuenta notificada', () => {
  const sinDeclaracion = deploymentPlan(con({ providerDeclaration: false }))!
  assert.deepEqual(sinDeclaracion.missing.map((i) => i.key), ['declaracion'])
  assert.match(sinDeclaracion.missing[0].label, /marcado CE/)
  assert.deepEqual(deploymentPlan(con({ fria: { approved: true, notified: false } }))!.missing.map((i) => i.key), ['fria'])
})

test('la FRIA y las obligaciones que no aplican no entran en el plan', () => {
  const plan = deploymentPlan(con({ fria: null, workersInformed: null, affectedInformed: null }))!
  assert.deepEqual(plan.items.map((i) => i.key), ['instrucciones', 'declaracion', 'supervision', 'datos_entrada'])
  const abierta = deploymentPlan(con({ workersInformed: 'open' }))!
  assert.deepEqual(abierta.missing.map((i) => i.key), ['trabajadores'])
})

test('el aviso enumera lo que falta', () => {
  const aviso = deploymentWarning(deploymentPlan(con({ oversightDocumented: false, providerInstructions: false })))
  assert.match(aviso!, /sin completar el plan de despliegue/)
  assert.match(aviso!, /Instrucciones de uso/)
  assert.match(aviso!, /Supervisión humana/)
})

test('una práctica prohibida no se pone en Producción ni en Piloto', () => {
  assert.match(prohibitedStatusError('produccion', ['prohibited'])!, /Art\. 5/)
  assert.match(prohibitedStatusError('piloto', [null, 'prohibited'])!, /no se puede poner/)
  assert.equal(prohibitedStatusError('desarrollo', ['prohibited']), null)
  assert.equal(prohibitedStatusError('retirado', ['prohibited']), null)
  assert.equal(prohibitedStatusError('produccion', ['high']), null)
})
