/**
 * Supervisión humana documentada y formación (B24).
 *
 * AI Act, Art. 26.2: la supervisión se encomienda a personas con la
 * competencia, la formación y la autoridad necesarias; Art. 14.4: pueden no
 * usar, anular o revertir la salida y detener el sistema; Art. 4: la
 * organización garantiza la alfabetización en IA de su personal.
 *
 * Decisiones del responsable (2026-10-27):
 *   - una formación es válida si no ha caducado y su evidencia está validada
 *     (pasa por la revisión de evidencias);
 *   - la supervisión de un sistema está documentada cuando el responsable
 *     tiene competencia, autoridad y una formación válida (alfabetización en IA
 *     o supervisión de ese sistema), y el sistema tiene medidas de vigilancia.
 *     El suplente se documenta igual, pero no cuenta.
 *
 * Módulo puro.
 */

export type TrainingKind = 'ai_literacy' | 'system_oversight'

export const TRAINING_KIND_LABEL: Record<TrainingKind, string> = {
  ai_literacy: 'Alfabetización en IA (Art. 4)',
  system_oversight: 'Supervisión de un sistema (Art. 26.2)',
}

export type TrainingFact = {
  kind: TrainingKind
  aiSystemId: string | null
  completedAt: string
  expiresAt: string | null
  /** Estado de la evidencia que la acredita; null si no tiene. */
  evidenceStatus: string | null
}

export type TrainingStatus = 'valida' | 'caducada' | 'sin_acreditar'

export const TRAINING_STATUS_LABEL: Record<TrainingStatus, string> = {
  valida: 'Válida',
  caducada: 'Caducada',
  sin_acreditar: 'Sin acreditar',
}

/** `today` en formato AAAA-MM-DD. */
export function trainingStatus(t: TrainingFact, today: string): TrainingStatus {
  if (t.expiresAt && t.expiresAt < today) return 'caducada'
  return t.evidenceStatus === 'valid' ? 'valida' : 'sin_acreditar'
}

/** Alfabetización en IA válida (Art. 4). */
export function hasValidLiteracy(trainings: readonly TrainingFact[], today: string): boolean {
  return trainings.some((t) => t.kind === 'ai_literacy' && trainingStatus(t, today) === 'valida')
}

/** Formación válida para supervisar un sistema: alfabetización en IA o supervisión de ese sistema. */
export function hasValidOversightTraining(trainings: readonly TrainingFact[], systemId: string, today: string): boolean {
  return trainings.some((t) =>
    trainingStatus(t, today) === 'valida'
    && (t.kind === 'ai_literacy' || (t.kind === 'system_oversight' && t.aiSystemId === systemId)))
}

export type OversightPersonDoc = { competence: string | null; authorityConfirmed: boolean }

export type OversightCheck = { key: 'responsable' | 'competencia' | 'autoridad' | 'formacion' | 'medidas'; label: string; done: boolean }

/** Qué tiene documentado cada persona que supervisa. */
export function personOversightChecks(doc: OversightPersonDoc | null, trainedForSystem: boolean): OversightCheck[] {
  return [
    { key: 'competencia', label: 'Competencia anotada', done: Boolean(doc?.competence?.trim()) },
    { key: 'autoridad', label: 'Autoridad para no usar, anular o revertir la salida y detener el sistema (Art. 14.4)', done: doc?.authorityConfirmed === true },
    { key: 'formacion', label: 'Formación válida: alfabetización en IA o supervisión de este sistema', done: trainedForSystem },
  ]
}

/** Supervisión humana del sistema documentada (Art. 26.2): lo que falta. */
export function oversightDocumentation(params: {
  ownerId: string | null
  ownerDoc: OversightPersonDoc | null
  ownerTrained: boolean
  measures: string | null
}): { documented: boolean; checks: OversightCheck[] } {
  const checks: OversightCheck[] = [
    { key: 'responsable', label: 'Responsable de supervisión humana asignado', done: Boolean(params.ownerId) },
    ...(params.ownerId ? personOversightChecks(params.ownerDoc, params.ownerTrained) : []),
    { key: 'medidas', label: 'Medidas de vigilancia descritas', done: Boolean(params.measures?.trim()) },
  ]
  return { documented: Boolean(params.ownerId) && checks.every((c) => c.done), checks }
}
