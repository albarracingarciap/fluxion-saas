/**
 * Datos de entrada y vigilancia del funcionamiento (B28, DP-12).
 *
 * AI Act, Art. 26.4: el responsable del despliegue se asegura de que los datos
 * de entrada son pertinentes y suficientemente representativos, en la medida
 * en que los controla. Art. 26.5: vigila el funcionamiento según las
 * instrucciones e informa al proveedor. Fichas declarativas con verificaciones
 * periódicas y evidencias, como el registro de logs (B25c): la de los datos de
 * entrada se verifica cada seis meses y el funcionamiento se revisa cada tres
 * (modificables por sistema). Obligatorias en alto riesgo con la organización
 * como responsable del despliegue; opcionales en el resto.
 *
 * Módulo puro.
 */

export const INPUT_DATA_VERIFY_MONTHS = 6
export const MONITORING_REVIEW_MONTHS = 3
/** Días de antelación con que se crea la tarea de la próxima verificación. */
export const OPERATION_NOTICE_DAYS = 15

export type DataControl = 'organization' | 'provider' | 'shared'

export const DATA_CONTROL_LABEL: Record<DataControl, string> = {
  organization: 'La organización',
  provider: 'El proveedor',
  shared: 'Ambos',
}

export type CheckKind = 'input_data' | 'monitoring'
export type CheckResult = 'conforme' | 'desviaciones' | 'no_conforme'

export const CHECK_KIND_LABEL: Record<CheckKind, string> = {
  input_data: 'Verificación de los datos de entrada',
  monitoring: 'Revisión del funcionamiento',
}

export const CHECK_RESULT_LABEL: Record<CheckResult, string> = {
  conforme: 'Conforme',
  desviaciones: 'Con desviaciones',
  no_conforme: 'No conforme',
}

export type IndicatorSource = 'manual' | 'senales' | 'telemetria' | 'supervision_humana'

export const INDICATOR_SOURCE_LABEL: Record<IndicatorSource, string> = {
  manual: 'Manual',
  senales: 'Señales (API de ingesta)',
  telemetria: 'Telemetría (uso y coste)',
  supervision_humana: 'Supervisión humana (decisiones de revisión)',
}

export type Indicator = { id: string; name: string; threshold: string; source: IndicatorSource }

/** Indicadores habituales que se ofrecen al crear el plan. */
export const SUGGESTED_INDICATORS: ReadonlyArray<Omit<Indicator, 'id'>> = [
  { name: 'Tasa de error o de resultados incorrectos', threshold: '', source: 'manual' },
  { name: 'Deriva de los datos o del modelo (drift)', threshold: '', source: 'senales' },
  { name: 'Discordancia de la supervisión humana', threshold: '', source: 'supervision_humana' },
  { name: 'Uso fuera de la finalidad prevista', threshold: '', source: 'manual' },
  { name: 'Quejas o reclamaciones de las personas afectadas', threshold: '', source: 'manual' },
  { name: 'Errores y volumen de llamadas', threshold: '', source: 'telemetria' },
]

export function normalizeIndicators(raw: unknown): Indicator[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x, i) => ({
      id: typeof x.id === 'string' && x.id ? x.id : `i${i + 1}`,
      name: typeof x.name === 'string' ? x.name.trim() : '',
      threshold: typeof x.threshold === 'string' ? x.threshold.trim() : '',
      source: (Object.keys(INDICATOR_SOURCE_LABEL) as IndicatorSource[]).includes(x.source as IndicatorSource)
        ? (x.source as IndicatorSource)
        : 'manual',
    }))
    .filter((x) => x.name)
}

export type LastCheck = {
  checkedAt: string
  result: CheckResult
  /** Hay alguna evidencia válida vinculada. */
  validEvidence: boolean
}

export type OperationItem = { key: string; label: string; done: boolean }

export type OperationStatus = {
  /** Declarado y verificado en plazo: propone resolver la obligación. */
  complete: boolean
  /** Fecha límite de la próxima verificación (AAAA-MM-DD); null sin ficha. */
  nextDueOn: string | null
  /** Hay una verificación anterior y ya venció. */
  overdue: boolean
  items: OperationItem[]
}

export function addMonths(fecha: string, meses: number): string {
  const d = new Date(`${fecha.slice(0, 10)}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + meses)
  return d.toISOString().slice(0, 10)
}

export type InputDataRecord = {
  controlledBy: DataControl
  expectedData: string | null
  sources: string | null
  controls: string | null
  verifyMonths: number
}

/**
 * Estado de los datos de entrada. Si solo los controla el proveedor, basta con
 * declararlo y describir qué espera el sistema: el Art. 26.4 obliga «en la
 * medida en que» la organización los controle.
 */
export function inputDataStatus(r: InputDataRecord | null, last: LastCheck | null, today: string): OperationStatus {
  const propios = r ? r.controlledBy !== 'provider' : true
  const nextDueOn = r ? (last ? addMonths(last.checkedAt, r.verifyMonths) : today) : null
  const enPlazo = Boolean(last && nextDueOn && nextDueOn >= today)
  const items: OperationItem[] = [
    { key: 'declarado', label: 'Quién controla los datos y qué espera el sistema', done: Boolean(r?.expectedData?.trim()) },
  ]
  if (propios) {
    items.push(
      { key: 'fuentes', label: 'Fuentes de los datos y controles de calidad y representatividad', done: Boolean(r?.sources?.trim() && r?.controls?.trim()) },
      { key: 'verificacion', label: `Verificada en los últimos ${r?.verifyMonths ?? INPUT_DATA_VERIFY_MONTHS} meses, sin resultado «No conforme»`, done: enPlazo && last!.result !== 'no_conforme' },
      { key: 'evidencia', label: 'Informe de calidad o perfilado, o muestra anonimizada, válido en la última verificación', done: enPlazo && last!.validEvidence },
    )
  }
  return {
    complete: items.every((i) => i.done),
    nextDueOn: propios ? nextDueOn : null,
    overdue: Boolean(propios && last && nextDueOn && nextDueOn < today),
    items,
  }
}

export type MonitoringPlanRecord = {
  indicators: Indicator[]
  reviewMonths: number
  ownerProfileId: string | null
}

export function monitoringStatus(p: MonitoringPlanRecord | null, last: LastCheck | null, today: string): OperationStatus {
  const nextDueOn = p ? (last ? addMonths(last.checkedAt, p.reviewMonths) : today) : null
  const enPlazo = Boolean(last && nextDueOn && nextDueOn >= today)
  const items: OperationItem[] = [
    { key: 'indicadores', label: 'Indicadores con umbral y fuente', done: Boolean(p && p.indicators.length > 0 && p.indicators.every((i) => i.threshold)) },
    { key: 'responsable', label: 'Responsable de la vigilancia', done: Boolean(p?.ownerProfileId) },
    { key: 'revision', label: `Funcionamiento revisado en los últimos ${p?.reviewMonths ?? MONITORING_REVIEW_MONTHS} meses`, done: enPlazo },
  ]
  return {
    complete: items.every((i) => i.done),
    nextDueOn,
    overdue: Boolean(last && nextDueOn && nextDueOn < today),
    items,
  }
}

/** Si toca crear la tarea de la próxima verificación (con antelación). */
export function operationTaskDue(nextDueOn: string | null, today: string): boolean {
  if (!nextDueOn) return false
  const aviso = new Date(`${nextDueOn}T00:00:00Z`)
  aviso.setUTCDate(aviso.getUTCDate() - OPERATION_NOTICE_DAYS)
  return aviso.toISOString().slice(0, 10) <= today
}

export function operationTaskTitle(kind: CheckKind, systemName: string): string {
  return kind === 'input_data'
    ? `Verificar los datos de entrada · ${systemName}`
    : `Revisar el funcionamiento · ${systemName}`
}

/** Datos de la aplicación del periodo para la revisión del funcionamiento. */
export type MonitoringPeriodData = {
  from: string
  to: string
  signals: { total: number; high: number }
  hitl: { decisions: number; discordant: number }
  telemetry: { calls: number; errors: number } | null
  incidents: { total: number; serious: number }
  suspensions: number
  notices: number
}

export function monitoringDataSummary(d: MonitoringPeriodData): string {
  const f = (s: string) => new Date(`${s}T00:00:00Z`).toLocaleDateString('es-ES', { timeZone: 'UTC' })
  const lineas = [
    `Periodo: del ${f(d.from)} al ${f(d.to)}.`,
    `Señales recibidas: ${d.signals.total} (${d.signals.high} de severidad alta o crítica).`,
    `Supervisión humana: ${d.hitl.decisions} decisiones, ${d.hitl.discordant} discordantes${d.hitl.decisions ? ` (${Math.round((d.hitl.discordant / d.hitl.decisions) * 100)} %)` : ''}.`,
    d.telemetry ? `Telemetría: ${d.telemetry.calls} llamadas, ${d.telemetry.errors} con error.` : 'Telemetría: sin datos.',
    `Incidentes: ${d.incidents.total} (${d.incidents.serious} graves). Suspensiones del uso: ${d.suspensions}. Avisos a terceros: ${d.notices}.`,
  ]
  return lineas.join('\n')
}
