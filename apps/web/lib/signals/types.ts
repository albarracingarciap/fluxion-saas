/**
 * Contrato de señales.
 *
 * Una señal es una observación que un módulo hace sobre un sistema de IA. Este
 * fichero es la única definición del formato: lo consumen el endpoint de
 * ingesta, el despachador y la interfaz.
 */

export const SIGNAL_SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'] as const
export type SignalSeverity = (typeof SIGNAL_SEVERITIES)[number]

export const SIGNAL_STATUSES = ['new', 'acknowledged', 'actioned', 'dismissed'] as const
export type SignalStatus = (typeof SIGNAL_STATUSES)[number]

/** Orden de gravedad, para comparar umbrales sin listas mágicas repartidas. */
const SEVERITY_RANK: Record<SignalSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

export function severityAtLeast(value: SignalSeverity, floor: SignalSeverity): boolean {
  return SEVERITY_RANK[value] >= SEVERITY_RANK[floor]
}

/**
 * Lo que un módulo envía a POST /api/ingest/v1/signals.
 *
 * `organization_id` no forma parte del cuerpo: se deduce de la clave API. Un
 * módulo nunca debe poder escribir en una organización que no sea la suya.
 */
export type SignalInput = {
  /** Sistema afectado. Omitir en señales de ámbito organización. */
  system_id?: string | null

  /** Identificador del módulo emisor: 'drift-monitor', 'connector-mlflow'… */
  source_module: string

  /** Identificador del hecho en el sistema de origen, para poder rastrearlo. */
  source_ref?: string | null

  /** Naturaleza de la observación: 'drift.data', 'quality.faithfulness'… */
  signal_type: string

  severity: SignalSeverity
  title: string
  summary?: string | null

  metric_name?: string | null
  metric_value?: number | null
  threshold?: number | null

  payload?: Record<string, unknown>

  /** Momento del hecho según el origen. Por defecto, la recepción. */
  occurred_at?: string | null

  /**
   * Clave de idempotencia. Convención: `<modulo>:<recurso>:<periodo>`.
   * Reenviar la misma clave no crea una segunda señal.
   */
  dedupe_key?: string | null
}

/** Fila tal y como vive en la base de datos. */
export type SignalRow = {
  id: string
  organization_id: string
  system_id: string | null
  source_module: string
  source_ref: string | null
  api_key_id: string | null
  signal_type: string
  severity: SignalSeverity
  title: string
  summary: string | null
  metric_name: string | null
  metric_value: number | null
  threshold: number | null
  payload: Record<string, unknown>
  occurred_at: string
  created_at: string
  status: SignalStatus
  acknowledged_at: string | null
  acknowledged_by: string | null
  dismissed_reason: string | null
  task_id: string | null
  dedupe_key: string | null
}

/** Resultado de ingerir una señal, para la respuesta del endpoint. */
export type SignalIngestResult = {
  accepted: boolean
  /** false cuando la dedupe_key ya existía: no es un error. */
  duplicate: boolean
  signal_id: string | null
  error?: string
}
