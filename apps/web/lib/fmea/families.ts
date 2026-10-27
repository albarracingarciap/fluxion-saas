/**
 * FMEA por familias y priorizado (B14, F-05).
 *
 * La evaluación arranca por las familias causales: una estimación de O y D por
 * familia cubre todos sus modos, y los modos solo se tocan como excepción. Una
 * excepción queda marcada como ajuste manual (`estimate_source = 'manual'`) y la
 * estimación por familia no la sobrescribe nunca.
 *
 * El trabajo se ordena por criticidad: la severidad de referencia de un modo es
 * la actual si está confirmado y la severidad por defecto si no.
 *
 * Módulo puro: lo usan las acciones de la evaluación, la pantalla y los tests.
 */
import { calculateSuggestedSActual, requiresSecondReview } from './domain'

/** Severidad a partir de la cual un modo se trata primero (DP-08: «severidad 8 o más»). */
export const CRITICAL_SEVERITY = 8

export type EstimateSource = 'family' | 'manual' | null

type SeverityItem = {
  status: string
  s_default_frozen: number
  s_actual: number | null
}

/** Severidad de referencia: la actual si el modo está confirmado; si no, la por defecto. */
export function referenceSeverity(item: SeverityItem): number {
  return item.status === 'evaluated' && item.s_actual !== null ? item.s_actual : item.s_default_frozen
}

export function isCritical(item: SeverityItem): boolean {
  return referenceSeverity(item) >= CRITICAL_SEVERITY
}

/**
 * Orden por criticidad: más severidad primero; a igualdad, pendientes antes que
 * resueltos, y después dimensión y código para que el orden sea estable.
 */
export function compareByCriticality<T extends SeverityItem & {
  dimension_order: number
  failure_mode_code: string
}>(a: T, b: T): number {
  const s = referenceSeverity(b) - referenceSeverity(a)
  if (s !== 0) return s
  const pa = a.status === 'pending' ? 0 : 1
  const pb = b.status === 'pending' ? 0 : 1
  if (pa !== pb) return pa - pb
  if (a.dimension_order !== b.dimension_order) return a.dimension_order - b.dimension_order
  return a.failure_mode_code.localeCompare(b.failure_mode_code, 'es')
}

/** Tramos de severidad con los que se agrupa la lista ordenada por criticidad. */
export function severityBand(item: SeverityItem): { id: string; label: string } {
  const s = referenceSeverity(item)
  if (s >= CRITICAL_SEVERITY) return { id: 'band_8', label: `Severidad ${CRITICAL_SEVERITY} o más` }
  if (s === 7) return { id: 'band_7', label: 'Severidad 7' }
  if (s >= 5) return { id: 'band_5', label: 'Severidad 5 y 6' }
  return { id: 'band_2', label: 'Severidad 4 o menos' }
}

// ─── Recalcular los modos que heredan de una familia ─────────────────────────

export type FamilyEstimate = {
  family_label: string
  o_value: number
  d_value: number
  justification: string
}

export type FamilyItem = {
  id: string
  s_default_frozen: number
  estimate_source: string | null
  status: string
  o_value: number | null
  d_real_value: number | null
  s_actual: number | null
}

export type FamilyItemUpdate = {
  itemId: string
  /** `estimated`: hereda de una o varias familias; `withdrawn`: se retiró la que lo cubría. */
  kind: 'estimated' | 'withdrawn'
  prev: { o: number | null; d: number | null; s: number | null; status: string }
  patch: {
    o_value: number | null
    d_real_value: number | null
    s_actual: number | null
    narrative_justification: string | null
    status: 'evaluated' | 'pending'
    estimate_source: 'family' | null
    estimate_families: string[] | null
    requires_second_review: boolean
  }
}

/**
 * Qué cambia en cada modo según las estimaciones de familia vigentes.
 *
 * Se recalcula todo el conjunto, no de forma incremental: con solapamiento (un
 * modo puede estar en varias familias) el resultado incremental dependería del
 * orden en que se guardaron las estimaciones. Ante varias familias manda el
 * valor más severo en cada eje (más O y más D suben la severidad).
 *
 * Los ajustes manuales no se tocan. Solo se devuelven los modos que cambian.
 */
export function resolveFamilyEstimates(input: {
  items: readonly FamilyItem[]
  memberships: ReadonlyArray<{ item_id: string; family_label: string }>
  estimates: readonly FamilyEstimate[]
}): FamilyItemUpdate[] {
  const porFamilia = new Map(input.estimates.map((e) => [e.family_label, e]))

  // modo -> familias con estimación que lo cubren, en orden alfabético para que
  // el texto de la justificación no dependa del orden de la consulta
  const cubiertoPor = new Map<string, string[]>()
  for (const m of input.memberships) {
    if (!porFamilia.has(m.family_label)) continue
    const lista = cubiertoPor.get(m.item_id) ?? []
    if (!lista.includes(m.family_label)) lista.push(m.family_label)
    cubiertoPor.set(m.item_id, lista)
  }

  const cambios: FamilyItemUpdate[] = []
  for (const item of input.items) {
    // Un ajuste manual no se pisa nunca.
    if (item.estimate_source === 'manual') continue

    const prev = { o: item.o_value, d: item.d_real_value, s: item.s_actual, status: item.status }
    const familias = (cubiertoPor.get(item.id) ?? []).sort((a, b) => a.localeCompare(b, 'es'))

    if (familias.length === 0) {
      // Se retiró la estimación que lo cubría: vuelve a pendiente en lugar de
      // quedarse con un valor huérfano que nadie sabría de dónde salió.
      if (item.estimate_source === 'family') {
        cambios.push({
          itemId: item.id, kind: 'withdrawn', prev,
          patch: {
            o_value: null, d_real_value: null, s_actual: null,
            narrative_justification: null,
            status: 'pending', estimate_source: null, estimate_families: null,
            requires_second_review: false,
          },
        })
      }
      continue
    }

    const oValue = Math.max(...familias.map((f) => porFamilia.get(f)!.o_value))
    const dValue = Math.max(...familias.map((f) => porFamilia.get(f)!.d_value))
    const sActual = calculateSuggestedSActual({
      oValue, dRealValue: dValue, sDefault: item.s_default_frozen,
    })

    // La justificación de la familia se copia al modo: sin ella, el expediente
    // mostraría los modos sin justificar aunque la decisión sí esté razonada.
    const textos = familias.map(
      (f) => `Estimación por familia «${f}»: ${porFamilia.get(f)!.justification}`
    )

    cambios.push({
      itemId: item.id, kind: 'estimated', prev,
      patch: {
        o_value: oValue,
        d_real_value: dValue,
        s_actual: sActual,
        narrative_justification: textos.join('\n\n'),
        status: 'evaluated',
        estimate_source: 'family',
        estimate_families: familias,
        requires_second_review: requiresSecondReview({
          sDefault: item.s_default_frozen, sActual, manualMode: false,
        }),
      },
    })
  }
  return cambios
}

/** El cambio no altera los valores del modo (no merece una entrada de historial). */
export function isNoopFamilyUpdate(u: FamilyItemUpdate): boolean {
  return u.prev.o === u.patch.o_value
    && u.prev.d === u.patch.d_real_value
    && u.prev.s === u.patch.s_actual
    && u.prev.status === u.patch.status
}

// ─── Excepciones guardadas por el autoguardado ──────────────────────────────

type DraftValues = {
  status: string
  o_value: number | null
  d_real_value: number | null
  s_actual: number | null
  narrative_justification: string | null
}

/**
 * Un modo que heredaba de una familia y se ha retocado en la lista pasa a ser
 * ajuste manual: si no, la siguiente estimación de familia pisaría el retoque.
 */
export function draftMakesManual(stored: DraftValues & { estimate_source: string | null }, incoming: DraftValues): boolean {
  if (stored.estimate_source !== 'family') return false
  const texto = (v: string | null) => v?.trim() || null
  return stored.status !== incoming.status
    || stored.o_value !== incoming.o_value
    || stored.d_real_value !== incoming.d_real_value
    || stored.s_actual !== incoming.s_actual
    || texto(stored.narrative_justification) !== texto(incoming.narrative_justification)
}

// ─── Resumen de familias para el panel ───────────────────────────────────────

export type FamilySummaryInput = {
  item_id: string
  family_label: string
  estimate_source: string | null
  status: string
  s_default_frozen: number
  s_actual: number | null
}

export type FamilySummary = {
  familyLabel: string
  modos: number
  manuales: number
  /** Modos con severidad de referencia 8 o más. */
  criticos: number
  /** Severidad de referencia más alta de la familia. */
  maxSeverity: number
  estimada: boolean
}

/**
 * Familias ordenadas por criticidad: primero las que tienen modos de severidad 8
 * o más, después por severidad máxima y por número de modos (donde está el ahorro).
 */
export function summarizeFamilies(
  rows: readonly FamilySummaryInput[],
  estimatedLabels: ReadonlySet<string>,
): FamilySummary[] {
  const acc = new Map<string, FamilySummary>()
  for (const r of rows) {
    const f = acc.get(r.family_label) ?? {
      familyLabel: r.family_label, modos: 0, manuales: 0, criticos: 0, maxSeverity: 0,
      estimada: estimatedLabels.has(r.family_label),
    }
    const s = referenceSeverity(r)
    f.modos += 1
    if (r.estimate_source === 'manual') f.manuales += 1
    if (s >= CRITICAL_SEVERITY) f.criticos += 1
    f.maxSeverity = Math.max(f.maxSeverity, s)
    acc.set(r.family_label, f)
  }
  return Array.from(acc.values()).sort((a, b) =>
    (b.criticos > 0 ? 1 : 0) - (a.criticos > 0 ? 1 : 0)
    || b.maxSeverity - a.maxSeverity
    || b.modos - a.modos
    || a.familyLabel.localeCompare(b.familyLabel, 'es'))
}

// ─── Resumen al entrar ───────────────────────────────────────────────────────

export type EvaluationOverview = {
  /** Modos de la evaluación (los priorizados). */
  total: number
  /** Modos con severidad de referencia 8 o más. */
  criticos: number
  criticosPendientes: number
  /** Modos que no están en ninguna familia: solo se evalúan uno a uno. */
  sinFamilia: number
  porFamilia: number
  manuales: number
}

export function evaluationOverview(
  items: ReadonlyArray<SeverityItem & { id: string; estimate_source: string | null }>,
  itemsConFamilia: ReadonlySet<string>,
): EvaluationOverview {
  let criticos = 0, criticosPendientes = 0, sinFamilia = 0, porFamilia = 0, manuales = 0
  for (const i of items) {
    if (isCritical(i)) {
      criticos += 1
      if (i.status === 'pending') criticosPendientes += 1
    }
    if (!itemsConFamilia.has(i.id)) sinFamilia += 1
    if (i.estimate_source === 'family') porFamilia += 1
    if (i.estimate_source === 'manual') manuales += 1
  }
  return { total: items.length, criticos, criticosPendientes, sinFamilia, porFamilia, manuales }
}
