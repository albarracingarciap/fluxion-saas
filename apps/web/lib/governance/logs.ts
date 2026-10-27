/**
 * Registro de logs por sistema (B25c, AI Act, Art. 26.6).
 *
 * El responsable del despliegue conserva los registros que el sistema genera
 * automáticamente, en la medida en que estén bajo su control, al menos seis
 * meses. Registro declarativo (decisión 5): dónde están, quién los controla y
 * cuántos meses se guardan, con evidencia y verificación periódica. Una
 * retención menor de seis meses avisa, no bloquea (2026-10-28).
 *
 * Módulo puro.
 */

export const LOG_MIN_MONTHS = 6
/** Cada cuánto se vuelve a comprobar que los registros se conservan como se declara (decisión del 2026-10-28). */
export const LOG_VERIFY_MONTHS = 12

export type LogControl = 'organization' | 'provider' | 'shared'

export const LOG_CONTROL_LABEL: Record<LogControl, string> = {
  organization: 'La organización',
  provider: 'El proveedor',
  shared: 'Ambos',
}

export type LogRetentionFact = {
  controlledBy: LogControl
  storageLocation: string | null
  retentionMonths: number | null
  /** Último día verificado (AAAA-MM-DD). */
  verifiedAt: string | null
  /** Estado de la evidencia vinculada; null si no tiene. */
  evidenceStatus: string | null
}

export type LogCheck = { key: 'ubicacion' | 'retencion' | 'evidencia' | 'verificacion'; label: string; done: boolean }

export type LogRetentionStatus = {
  /** Todo lo declarado y vigente: propone el Art. 26.6. */
  complete: boolean
  /** La organización controla los registros y declara menos del mínimo. */
  belowMinimum: boolean
  /** Fecha hasta la que vale la última verificación (AAAA-MM-DD). */
  verificationDueOn: string | null
  checks: LogCheck[]
}

function sumarMeses(fecha: string, meses: number): string {
  const d = new Date(`${fecha}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + meses)
  return d.toISOString().slice(0, 10)
}

/** `today` en formato AAAA-MM-DD. Sin registro: nada hecho. */
export function logRetentionStatus(r: LogRetentionFact | null, today: string): LogRetentionStatus {
  const nuestra = r ? r.controlledBy !== 'provider' : true
  const belowMinimum = Boolean(r && nuestra && r.retentionMonths !== null && r.retentionMonths < LOG_MIN_MONTHS)
  const verificationDueOn = r?.verifiedAt ? sumarMeses(r.verifiedAt, LOG_VERIFY_MONTHS) : null

  const checks: LogCheck[] = [
    { key: 'ubicacion', label: 'Dónde se guardan los registros y quién los controla', done: Boolean(r?.storageLocation?.trim()) },
    nuestra
      ? { key: 'retencion', label: `Conservación de al menos ${LOG_MIN_MONTHS} meses`, done: Boolean(r && r.retentionMonths !== null && !belowMinimum) }
      : { key: 'retencion', label: 'Conservación a cargo del proveedor', done: true },
    { key: 'evidencia', label: 'Evidencia válida de la conservación', done: r?.evidenceStatus === 'valid' },
    {
      key: 'verificacion',
      label: `Verificada en los últimos ${LOG_VERIFY_MONTHS} meses`,
      done: Boolean(verificationDueOn && verificationDueOn >= today && r!.verifiedAt! <= today),
    },
  ]
  return { complete: checks.every((c) => c.done), belowMinimum, verificationDueOn, checks }
}
