/**
 * Plan de despliegue de un sistema de alto riesgo (B18b, informe del flujo de
 * trabajo, fase 2).
 *
 * Lo que el responsable del despliegue tiene que tener antes de poner en
 * servicio un sistema de alto riesgo (AI Act, Art. 26 y 27). Solo aplica si el
 * sistema es de alto riesgo y la organización tiene el rol de responsable del
 * despliegue.
 *
 * Decisiones del responsable (2026-10-27):
 *   - pasar a producción sin completarlo avisa, no bloquea (decisión 2);
 *   - el marcado CE se acredita con la declaración UE de conformidad del
 *     proveedor (Art. 47) adjunta y válida, sin campo propio;
 *   - una práctica prohibida no se puede poner en Producción ni en Piloto
 *     (`prohibitedStatusError`).
 *
 * Las obligaciones del Art. 26 cuentan si el sistema las tiene (aceptadas y no
 * excluidas); si no las tiene, no aplican. Módulo puro.
 */

/** Estado de una obligación del Art. 26 en el sistema: null si no la tiene o está excluida. */
export type DeploymentObligation = 'resolved' | 'open' | null

export type DeploymentPlanFacts = {
  systemId: string
  level: string | null
  valueChainRoles: readonly string[]
  /** Documentación del proveedor válida, por tipo (B16a, B17e1). */
  providerInstructions: boolean
  providerDeclaration: boolean
  oversightDesignated: boolean
  /** null si la FRIA no aplica (DP-11). */
  fria: { approved: boolean; notified: boolean } | null
  /** AI-ACT-ART26-4, 26-7 y 26-11. */
  inputData: DeploymentObligation
  workersInformed: DeploymentObligation
  affectedInformed: DeploymentObligation
}

export type DeploymentItem = { key: string; label: string; done: boolean; href: string }

export type DeploymentPlan = {
  items: DeploymentItem[]
  complete: boolean
  missing: DeploymentItem[]
}

export function deploymentPlanApplies(level: string | null, valueChainRoles: readonly string[]): boolean {
  return level === 'high' && valueChainRoles.includes('deployer')
}

export function deploymentPlan(f: DeploymentPlanFacts): DeploymentPlan | null {
  if (!deploymentPlanApplies(f.level, f.valueChainRoles)) return null
  const base = `/inventario/${f.systemId}`
  const obligaciones = `${base}?tab=obligaciones`
  const proveedor = `${base}/expediente/annex_iv`

  const items: DeploymentItem[] = [
    { key: 'instrucciones', label: 'Instrucciones de uso del proveedor verificadas (Art. 13 y 26.1)', done: f.providerInstructions, href: proveedor },
    { key: 'declaracion', label: 'Declaración UE de conformidad del proveedor verificada: marcado CE (Art. 47 y 48)', done: f.providerDeclaration, href: proveedor },
    { key: 'supervision', label: 'Supervisión humana asignada (Art. 26.2)', done: f.oversightDesignated, href: base },
  ]
  if (f.fria) {
    items.push({ key: 'fria', label: 'FRIA aprobada y notificada a la autoridad (Art. 27)', done: f.fria.approved && f.fria.notified, href: `${base}/expediente/fria` })
  }
  const obligacion = (key: string, label: string, estado: DeploymentObligation) => {
    if (estado) items.push({ key, label, done: estado === 'resolved', href: obligaciones })
  }
  obligacion('datos_entrada', 'Datos de entrada pertinentes y representativos (Art. 26.4)', f.inputData)
  obligacion('trabajadores', 'Trabajadores y sus representantes informados (Art. 26.7)', f.workersInformed)
  obligacion('afectados', 'Personas afectadas informadas (Art. 26.11)', f.affectedInformed)

  const missing = items.filter((i) => !i.done)
  return { items, complete: missing.length === 0, missing }
}

/** Estados en los que el sistema está en servicio o en pruebas reales. */
const EN_SERVICIO = new Set(['produccion', 'piloto'])

/** Error si se intenta poner en servicio una práctica prohibida; null si se admite. */
export function prohibitedStatusError(status: string | null | undefined, levels: ReadonlyArray<string | null | undefined>): string | null {
  if (!status || !EN_SERVICIO.has(status)) return null
  if (!levels.includes('prohibited')) return null
  return 'Práctica prohibida (AI Act, Art. 5): el sistema no se puede poner en Producción ni en Piloto. Retíralo o rediséñalo y vuelve a clasificarlo.'
}

/** Aviso al pasar a producción sin completar el plan (decisión 2: no bloquea). */
export function deploymentWarning(plan: DeploymentPlan | null): string | null {
  if (!plan || plan.complete) return null
  return `El sistema ha pasado a Producción sin completar el plan de despliegue. Falta:\n${plan.missing.map((i) => `- ${i.label}`).join('\n')}`
}
