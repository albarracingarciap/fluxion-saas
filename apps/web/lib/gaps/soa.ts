/**
 * Gaps «Control de la Declaración sin implantar» (B17e3, F-11).
 *
 * Un control del Anexo A aplicable en la Declaración de Aplicabilidad que no
 * está «Implantado» ni «Externalizado» es un gap en cada sistema vinculado a
 * él: uno por sistema (decisión del responsable, 2026-10-27). El gap se
 * identifica por el vínculo control-sistema (`organization_soa_system_links.id`),
 * que es único y sirve de origen de sus tareas.
 *
 * No se excluye desde el análisis de gaps: se resuelve en la Declaración
 * (implantándolo, externalizándolo o declarándolo no aplicable con su
 * justificación).
 *
 * Módulo puro.
 */

export type SoaGapControl = {
  id: string
  code: string
  isApplicable: boolean
  status: string
  links: ReadonlyArray<{ id: string; systemId: string }>
}

export type SoaGapCandidate = {
  /** Vínculo control-sistema: identificador del gap. */
  linkId: string
  controlId: string
  code: string
  systemId: string
  status: string
}

const CUBIERTOS = new Set(['implemented', 'externalized'])

export function soaGapCandidates(controls: readonly SoaGapControl[]): SoaGapCandidate[] {
  const out: SoaGapCandidate[] = []
  for (const c of controls) {
    if (!c.isApplicable || CUBIERTOS.has(c.status)) continue
    for (const l of c.links) {
      out.push({ linkId: l.id, controlId: c.id, code: c.code, systemId: l.systemId, status: c.status })
    }
  }
  return out
}

/** Estado del control en la Declaración, para el contexto del gap. */
export const SOA_STATUS_LABEL: Record<string, string> = {
  not_started: 'No iniciado',
  planned: 'Planificado',
  in_progress: 'En progreso',
}
