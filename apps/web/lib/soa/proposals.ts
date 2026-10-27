/**
 * Propuestas de estado de la Declaración de Aplicabilidad (B17e2, F-11, GAP-29).
 *
 * Un control del Anexo A propone «Implantado» cuando todos los sistemas
 * vinculados a él tienen en su plan de tratamiento una acción de mitigación
 * completada, con evidencia válida, cuyo control sale de una plantilla que
 * corresponde a ese control del Anexo A
 * (`compliance.control_template_soa_controls`). Es la misma regla de «todos
 * los sistemas vinculados» que la AISIA (`lib/aisia/soa-sync.ts`).
 *
 * La propuesta no cambia nada sola: se acepta en la Declaración.
 *
 * Módulo puro.
 */

/** Acción del plan de tratamiento de un sistema, con lo que decide la propuesta. */
export type PlanControlFact = {
  systemId: string
  /** Plantilla de la que sale el control de la acción (null si es un control libre). */
  templateId: string | null
  templateCode: string | null
  option: string
  status: string
  /** Estado de la evidencia de la acción (null si no tiene). */
  evidenceStatus: string | null
}

export type SoaProposalControl = {
  code: string
  isApplicable: boolean
  status: string
  linkedSystemIds: readonly string[]
}

export type SoaProposal = {
  status: 'implemented'
  /** Por qué, en una frase; queda en las observaciones del control al aceptarla. */
  reason: string
}

const CERRADOS = new Set(['implemented', 'externalized'])

/** Control implantado en el plan: mitigación completada con evidencia válida. */
export function isImplementedPlanControl(fact: PlanControlFact): boolean {
  return fact.option === 'mitigar' && fact.status === 'completed' && fact.evidenceStatus === 'valid' && Boolean(fact.templateId)
}

/**
 * @param templatesByCode plantillas de control que corresponden a cada control del Anexo A.
 * @param systemNames nombre de cada sistema, para el motivo.
 */
export function soaControlProposal(
  control: SoaProposalControl,
  templatesByCode: Readonly<Record<string, readonly string[]>>,
  facts: readonly PlanControlFact[],
  systemNames: Readonly<Record<string, string>> = {},
): SoaProposal | null {
  if (!control.isApplicable || CERRADOS.has(control.status)) return null
  const plantillas = new Set(templatesByCode[control.code] ?? [])
  if (plantillas.size === 0 || control.linkedSystemIds.length === 0) return null

  const porSistema: string[] = []
  for (const systemId of control.linkedSystemIds) {
    const codigos = Array.from(new Set(
      facts
        .filter((f) => f.systemId === systemId && isImplementedPlanControl(f) && plantillas.has(f.templateId!))
        .map((f) => f.templateCode ?? f.templateId!),
    )).sort()
    if (codigos.length === 0) return null
    porSistema.push(`${systemNames[systemId] ?? 'Sistema'} (${codigos.join(', ')})`)
  }

  return {
    status: 'implemented',
    reason: `Control implantado con evidencia válida en el plan de tratamiento de todos los sistemas vinculados: ${porSistema.join('; ')}.`,
  }
}

/** Agrupa la correspondencia plantilla → Anexo A por control del Anexo A. */
export function templatesBySoaCode(rows: ReadonlyArray<{ template_id: string; soa_control_code: string }>): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const r of rows) (out[r.soa_control_code] ??= []).push(r.template_id)
  return out
}
