/**
 * Identificación biométrica remota en diferido (B21c, AI Act, Art. 26.10).
 *
 * El responsable del despliegue presenta un informe anual a las autoridades de
 * vigilancia del mercado y de protección de datos. Decisión del responsable
 * (2026-10-28): la ficha marca si el uso es en diferido; solo entonces se crea
 * la tarea anual del informe, una por año natural.
 *
 * Módulo puro.
 */

/** El supuesto del Art. 26.10: alto riesgo del Anexo III, punto 1.a, como responsable del despliegue. */
export function postBiometricApplies(params: {
  level: string | null
  highRiskRoute: { annex?: string; points?: readonly string[] } | null | undefined
  valueChainRoles: readonly string[]
}): boolean {
  return params.level === 'high'
    && params.highRiskRoute?.annex === 'III'
    && (params.highRiskRoute.points ?? []).includes('1a')
    && params.valueChainRoles.includes('deployer')
}

/** Título de la tarea del informe de un año: sirve también para no duplicarla. */
export function annualReportTitle(year: number, systemName: string): string {
  return `Informe anual Art. 26.10 · ${year} · ${systemName}`.slice(0, 300)
}

/** Fecha límite de la tarea del año (AAAA-MM-DD): fin del año natural. */
export function annualReportDueDate(year: number): string {
  return `${year}-12-31`
}
