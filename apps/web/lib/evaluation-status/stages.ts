/**
 * Etapa de evaluación de un sistema (DP-02, B18a, F-12).
 *
 * «Totalmente evaluado» no es un sí o un no: el sistema avanza por etapas
 * sucesivas (Clasificado, Evaluado, Tratado) y la vigencia es una condición
 * transversal. Lo exigible en cada etapa depende de la clasificación AI Act y
 * del rol de la organización. La Declaración de Aplicabilidad aprobada es un
 * requisito de la organización: se muestra, pero no penaliza al sistema.
 *
 * Casos que la tabla de DP-02 no cubre (decisión del responsable, 2026-10-27):
 *   - práctica prohibida: no se evalúa; etapa final «Retirada o rediseño»;
 *   - fuera del ámbito o no es un sistema de IA: se queda en «Clasificado»,
 *     porque no se le exige nada más;
 *   - proveedor de un modelo GPAI: los documentos del Art. 53 quedan pendientes
 *     de definir y no cuentan para «Evaluado».
 *
 * Es la única fuente de la tarjeta de etapa de la ficha, del siguiente paso
 * del Dashboard y de la etapa de Evaluaciones. Módulo puro.
 */

export type EvaluationStage = 'sin_clasificar' | 'clasificado' | 'evaluado' | 'tratado'
export type StageGroup = EvaluationStage | 'vigente'

export const STAGE_LABEL: Record<EvaluationStage | 'retirada', string> = {
  sin_clasificar: 'Sin clasificar',
  clasificado: 'Clasificado',
  evaluado: 'Evaluado',
  tratado: 'Tratado',
  retirada: 'Retirada o rediseño',
}

const ORDEN: EvaluationStage[] = ['sin_clasificar', 'clasificado', 'evaluado', 'tratado']

/** Documento del expediente que la aplicabilidad (DP-11) manda redactar. */
export type RequiredDocumentFact = { key: string; label: string; approved: boolean }

export type SystemStageFacts = {
  systemId: string
  /** `aiact_result.scope`; null si aún no hay resultado del motor. */
  scope: 'in_scope' | 'out_of_scope' | 'not_ai_system' | 'pending' | null
  /** Nivel del motor o, sin resultado, `aiact_risk_level`. */
  level: string | null
  /** Reclasificación pendiente de revisar (`aiact_review_pending`). */
  reviewPending: boolean
  /** Obligaciones sugeridas sin aceptar ni excluir. */
  suggestedObligations: number
  /** Obligaciones aceptadas sin resolver (ni resueltas ni excluidas). */
  openObligations: number
  /** Evaluación de riesgos vigente y su plan aprobados. */
  evaluationApproved: boolean
  planApproved: boolean
  aisiaApproved: boolean
  /** Documentos que hay que redactar según DP-11, sin la AISIA. */
  requiredDocuments: readonly RequiredDocumentFact[]
  /** Responsable de supervisión humana designado (solo se exige en alto riesgo). */
  oversightDesignated: boolean
  /** Mitigaciones del plan sin cerrar (pendientes, en curso o con evidencia pendiente). */
  openActions: number
  /** Modos con severidad actual 9 sin acción en el plan (también los diferidos). */
  untreatedSevereModes: number
  expiredEvidences: number
  /** Revisión de la evaluación o de acciones aceptadas con fecha pasada. */
  overdueReviews: number
  /** Plazo del plan vencido sin cerrarlo. */
  planDeadlineOverdue: boolean
  /** Disparadores de reevaluación abiertos que siguen pidiendo algo (B21a). */
  pendingReevaluations?: number
}

export type StageItem = {
  key: string
  group: StageGroup
  label: string
  done: boolean
  href: string
}

export type SystemStage = {
  systemId: string
  /** Etapa alcanzada; `retirada` en una práctica prohibida. */
  stage: EvaluationStage | 'retirada'
  label: string
  /** Sin evidencias caducadas, revisiones vencidas ni plazos del plan vencidos. */
  vigente: boolean
  /** Fuera del ámbito o no es un sistema de IA: no se le exige más. */
  terminal: boolean
  items: StageItem[]
  /** Lo primero que falta: para la siguiente etapa o para estar vigente. */
  next: StageItem | null
}

const ALTO = 'high'

export function systemStage(f: SystemStageFacts): SystemStage {
  const base = `/inventario/${f.systemId}`
  const item = (group: StageGroup, key: string, label: string, done: boolean, href: string): StageItem =>
    ({ key, group, label, done, href })

  if (f.level === 'prohibited') {
    const retirada = item('tratado', 'retirada', 'Práctica prohibida (AI Act, Art. 5): retirar o rediseñar el sistema', false, `${base}?tab=obligaciones`)
    return { systemId: f.systemId, stage: 'retirada', label: STAGE_LABEL.retirada, vigente: false, terminal: true, items: [retirada], next: retirada }
  }

  const fueraDeAmbito = f.scope === 'out_of_scope' || f.scope === 'not_ai_system'
  const clasificado = fueraDeAmbito || (f.level !== null && f.level !== 'pending')

  const items: StageItem[] = [
    item('clasificado', 'clasificacion',
      f.reviewPending ? 'Revisar la reclasificación pendiente' : 'Clasificación AI Act confirmada',
      clasificado && !f.reviewPending, `${base}?tab=obligaciones`),
  ]
  if (!fueraDeAmbito) {
    items.push(item('clasificado', 'obligaciones_aceptadas', 'Obligaciones aceptadas o excluidas con justificación', f.suggestedObligations === 0, `${base}?tab=obligaciones`))

    items.push(
      item('evaluado', 'evaluacion', 'Evaluación de riesgos y plan de tratamiento aprobados', f.evaluationApproved && f.planApproved, `${base}/fmea`),
      item('evaluado', 'aisia', 'AISIA aprobada', f.aisiaApproved, `${base}/expediente/aisia`),
      ...f.requiredDocuments.map((d) => item('evaluado', `doc_${d.key}`, `${d.label} aprobada`, d.approved, `${base}/expediente/${d.key}`)),
    )
    if (f.level === ALTO) {
      items.push(item('evaluado', 'supervision', 'Responsable de supervisión humana designado', f.oversightDesignated, base))
    }

    items.push(
      item('tratado', 'acciones', 'Mitigaciones del plan cerradas con evidencia', f.openActions === 0, `${base}/fmea`),
      item('tratado', 'modos_criticos', 'Sin modos de severidad 9 sin tratar', f.untreatedSevereModes === 0, `${base}/fmea`),
      item('tratado', 'obligaciones_resueltas', 'Obligaciones resueltas', f.openObligations === 0, `${base}?tab=obligaciones`),
    )
  }

  const vigencia = [
    item('vigente', 'evidencias', 'Sin evidencias caducadas', f.expiredEvidences === 0, `${base}?tab=evidencias`),
    item('vigente', 'revisiones', 'Sin revisiones vencidas', f.overdueReviews === 0, `${base}/fmea`),
    item('vigente', 'plazo_plan', 'Plazo del plan de tratamiento al día', !f.planDeadlineOverdue, `${base}/fmea`),
    // B21a: un disparador abierto (incidente grave, cambio de supuestos…) quita la vigencia.
    item('vigente', 'reevaluacion', 'Sin reevaluaciones pendientes', (f.pendingReevaluations ?? 0) === 0, base),
  ]
  items.push(...vigencia)

  // Etapa alcanzada: la última con todos sus requisitos y los de las anteriores.
  let stage: EvaluationStage = 'sin_clasificar'
  for (const etapa of ORDEN.slice(1)) {
    const pendientes = items.filter((i) => i.group === etapa && !i.done)
    if (pendientes.length > 0) break
    stage = etapa
    if (fueraDeAmbito && etapa === 'clasificado') break
  }

  const vigente = vigencia.every((i) => i.done)
  const siguiente = fueraDeAmbito && stage === 'clasificado' ? null : ORDEN[ORDEN.indexOf(stage) + 1] ?? null
  const next =
    (siguiente ? items.find((i) => i.group === siguiente && !i.done) : undefined)
    ?? (stage !== 'sin_clasificar' ? vigencia.find((i) => !i.done) : undefined)
    ?? null

  return {
    systemId: f.systemId,
    stage,
    label: STAGE_LABEL[stage],
    vigente,
    terminal: fueraDeAmbito,
    items,
    next,
  }
}

/** Orden para elegir el sistema más rezagado: retirada primero, después la etapa más baja. */
export function stageRank(s: SystemStage): number {
  if (s.stage === 'retirada') return -1
  return ORDEN.indexOf(s.stage)
}

const PRIORIDAD_NIVEL: Record<string, number> = { high: 0, limited: 1, minimal: 2 }

/**
 * Siguiente paso de la organización: el primero que falta en el sistema más
 * rezagado (práctica prohibida antes que nada; a igual etapa, el de mayor
 * riesgo). Null si no hay nada pendiente.
 */
export function organizationNextStep<T extends { stage: SystemStage; name: string; level: string | null }>(systems: readonly T[]): (T & { item: StageItem }) | null {
  const pendientes = systems
    .filter((s) => s.stage.next !== null)
    .sort((a, b) =>
      stageRank(a.stage) - stageRank(b.stage)
      || (PRIORIDAD_NIVEL[a.level ?? ''] ?? 3) - (PRIORIDAD_NIVEL[b.level ?? ''] ?? 3)
      || a.name.localeCompare(b.name, 'es'))
  const primero = pendientes[0]
  return primero ? { ...primero, item: primero.stage.next! } : null
}

export type NextStepCard = { title: string; description: string; href: string; cta: string }

/**
 * Tarjeta «Siguiente paso» del Dashboard y de Evaluaciones (F-12): el primer
 * punto que falta en el sistema más rezagado. No cuentan los sistemas
 * retirados.
 */
export function nextStepCard(
  systems: ReadonlyArray<{ id: string; name: string; status: string; level: string | null; stage: SystemStage }>,
): NextStepCard {
  const activos = systems.filter((s) => s.status !== 'retirado')
  if (activos.length === 0) {
    return {
      title: 'Registrar primer sistema',
      description: 'Da de alta el primer sistema para empezar a generar métricas y gobierno operativo.',
      href: '/inventario/nuevo',
      cta: 'Crear primer sistema',
    }
  }
  const siguiente = organizationNextStep(activos)
  if (!siguiente) {
    return {
      title: 'Todos los sistemas tratados y vigentes',
      description: 'Ningún sistema tiene requisitos pendientes de su etapa. Revisa el inventario para profundizar por sistema.',
      href: '/inventario',
      cta: 'Ver inventario',
    }
  }
  return {
    // Los puntos son criterios («AISIA aprobada»): la tarjeta dice qué falta.
    title: siguiente.stage.stage === 'retirada' ? siguiente.item.label : `Falta: ${siguiente.item.label}`,
    description: siguiente.stage.stage === 'retirada'
      ? `${siguiente.name} está clasificado como práctica prohibida: no se evalúa.`
      : `${siguiente.name} · etapa ${siguiente.stage.label}. Es el sistema más rezagado${siguiente.item.group === 'vigente' ? ', y le falta para seguir vigente' : ''}.`,
    href: siguiente.item.href,
    cta: 'Abrir',
  }
}
