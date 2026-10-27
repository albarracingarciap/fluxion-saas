import 'server-only'

import { applicabilityFacts, documentApplicability } from '@/lib/documents/applicability'
import { TEMPLATE_META } from '@/lib/documents/templates'
import { pickReferenceEvaluation } from '@/lib/fmea/lifecycle-rules'
import { createComplianceClient } from '@/lib/supabase/compliance'
import { deploymentPlan, deploymentPlanApplies, type DeploymentObligation, type DeploymentPlan } from './deployment'
import { loadOversightStatus } from '@/lib/governance/oversight-server'
import { pendingReevaluations } from './reevaluation'
import { loadOpenTriggers, loadReevaluationFacts } from './reevaluation-server'
import { systemStage, type RequiredDocumentFact, type SystemStage } from './stages'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FluxionClient = any

/** Documentos del expediente que cuentan para «Evaluado» (DP-02), además de la AISIA. */
const DOCUMENTOS_ETAPA = ['annex_iv', 'eu_registry', 'post_market_plan', 'fria'] as const
const PLAN_APROBADO = new Set(['approved', 'in_progress', 'closed'])
const MITIGACION_ABIERTA = new Set(['pending', 'in_progress', 'evidence_pending'])
/** Documentación del proveedor (B16a) por etiqueta o por tipo del catálogo (B17e1). */
const TIPO_INSTRUCCIONES = 'EVT-DOC-04'
const TIPO_DECLARACION = 'EVT-DOC-03'

export type SystemStageRow = {
  id: string
  name: string
  status: string
  level: string | null
  stage: SystemStage
  /** Plan de despliegue (B18b): solo alto riesgo con la organización como responsable del despliegue. */
  deployment: DeploymentPlan | null
}

type Sistema = Record<string, unknown> & {
  id: string
  name: string
  status: string
  aiact_result: { scope?: string; level?: string | null } | null
  aiact_risk_level: string | null
  aiact_review_pending: boolean | null
  aiact_obligations: string[] | null
  human_oversight_owner_id: string | null
}

/**
 * Etapa de cada sistema de la organización (B18a). Consultas por lotes para
 * la organización entera; con `systemIds`, solo esos. El cliente debe poder
 * leer la organización (sesión o service role filtrado).
 */
export async function loadSystemStages(
  fluxion: FluxionClient,
  organizationId: string,
  systemIds?: readonly string[],
): Promise<SystemStageRow[]> {
  const filtrar = <Q extends { in: (c: string, v: readonly string[]) => Q }>(q: Q, col: string): Q =>
    systemIds ? q.in(col, systemIds) : q

  const [sistemasR, obligacionesR, evaluacionesR, planesR, documentosR, evidenciasR] = await Promise.all([
    filtrar(fluxion.from('ai_systems')
      .select('id, name, status, aiact_result, aiact_risk_level, aiact_review_pending, aiact_obligations, aiact_inputs, value_chain_roles, is_gpai, manages_critical_infra, processes_personal_data, human_oversight_owner_id')
      .eq('organization_id', organizationId), 'id'),
    filtrar(fluxion.from('system_obligations')
      .select('ai_system_id, status, obligation_code')
      .eq('organization_id', organizationId)
      .is('archived_at', null), 'ai_system_id'),
    filtrar(fluxion.from('fmea_evaluations')
      .select('id, system_id, state, version, next_review_at')
      .eq('organization_id', organizationId), 'system_id'),
    filtrar(fluxion.from('treatment_plans')
      .select('id, system_id, evaluation_id, status, deadline')
      .eq('organization_id', organizationId), 'system_id'),
    filtrar(fluxion.from('documents')
      .select('id, ai_system_id, template_key, status, approved_at')
      .eq('organization_id', organizationId)
      .in('status', ['approved', 'superseded'])
      .not('approved_at', 'is', null), 'ai_system_id'),
    filtrar(fluxion.from('system_evidences')
      .select('ai_system_id, status, expires_at, tags, evidence_type_id')
      .eq('organization_id', organizationId), 'ai_system_id'),
  ])

  const sistemas = (sistemasR.data ?? []) as Sistema[]
  const obligaciones = (obligacionesR.data ?? []) as Array<{ ai_system_id: string; status: string; obligation_code: string | null }>
  const evaluaciones = (evaluacionesR.data ?? []) as Array<{ id: string; system_id: string; state: string; version: number; next_review_at: string | null }>
  const planes = (planesR.data ?? []) as Array<{ id: string; system_id: string; evaluation_id: string; status: string; deadline: string | null }>
  const documentos = (documentosR.data ?? []) as Array<{ id: string; ai_system_id: string; template_key: string }>
  const evidencias = (evidenciasR.data ?? []) as Array<{ ai_system_id: string | null; status: string; expires_at: string | null; tags: string[] | null; evidence_type_id: string | null }>

  // Evaluación de referencia de cada sistema (B07) y su plan.
  const porSistema = <T,>(rows: T[], key: (r: T) => string | null) => {
    const m = new Map<string, T[]>()
    for (const r of rows) {
      const k = key(r)
      if (k) (m.get(k) ?? m.set(k, []).get(k)!).push(r)
    }
    return m
  }
  const evalPorSistema = porSistema(evaluaciones, (e) => e.system_id)
  const referencia = new Map<string, (typeof evaluaciones)[number]>()
  for (const [id, rows] of Array.from(evalPorSistema.entries())) {
    const ref = pickReferenceEvaluation(rows)
    if (ref) referencia.set(id, ref)
  }
  const planDe = new Map<string, (typeof planes)[number]>()
  for (const p of planes) {
    if (p.status === 'superseded') continue
    if (referencia.get(p.system_id)?.id === p.evaluation_id) planDe.set(p.system_id, p)
  }

  const evaluationIds = Array.from(referencia.values()).map((e) => e.id)
  const planIds = Array.from(planDe.values()).map((p) => p.id)
  const [itemsR, accionesR] = await Promise.all([
    evaluationIds.length
      ? fluxion.from('fmea_items').select('id, evaluation_id, status, s_actual').in('evaluation_id', evaluationIds)
      : { data: [] },
    planIds.length
      ? fluxion.from('treatment_actions').select('plan_id, fmea_item_id, option, status, review_due_date').in('plan_id', planIds)
      : { data: [] },
  ])
  // Plan de despliegue (B18b): notificación de la FRIA y tipos del catálogo de
  // la documentación del proveedor.
  const friaIds = documentos.filter((d) => d.template_key === 'fria').map((d) => d.id)
  const [notificacionesR, tiposR] = await Promise.all([
    friaIds.length
      ? fluxion.from('document_notifications').select('document_id').in('document_id', friaIds)
      : { data: [] },
    createComplianceClient().from('evidence_types').select('id, code').in('code', [TIPO_INSTRUCCIONES, TIPO_DECLARACION]),
  ])
  // Supervisión humana documentada (B24): solo hace falta en los sistemas con plan de despliegue.
  const conPlan = sistemas
    .filter((s) => deploymentPlanApplies(s.aiact_result?.level ?? s.aiact_risk_level ?? null, applicabilityFacts(s).valueChainRoles))
    .map((s) => s.id)
  const supervision = await loadOversightStatus(fluxion, organizationId, conPlan)
  // Disparadores de reevaluación abiertos (B21a) y lo aprobado que los resuelve.
  const disparadores = await loadOpenTriggers(fluxion, organizationId, systemIds)
  const hechosReevaluacion = await loadReevaluationFacts(fluxion, organizationId, Array.from(disparadores.keys()))
  const friaNotificada = new Set(((notificacionesR.data ?? []) as Array<{ document_id: string }>).map((n) => n.document_id))
  const tipoId = new Map(((tiposR.data ?? []) as Array<{ id: string; code: string }>).map((t) => [t.code, t.id]))

  const items = (itemsR.data ?? []) as Array<{ id: string; evaluation_id: string; status: string; s_actual: number | null }>
  const acciones = (accionesR.data ?? []) as Array<{ plan_id: string; fmea_item_id: string; option: string | null; status: string; review_due_date: string | null }>

  const hoy = new Date().toISOString().slice(0, 10)
  const ahora = Date.now()
  const obligPorSistema = porSistema(obligaciones, (o) => o.ai_system_id)
  const docsPorSistema = porSistema(documentos, (d) => d.ai_system_id)
  const evidPorSistema = porSistema(evidencias, (e) => e.ai_system_id)
  const itemsPorEval = porSistema(items, (i) => i.evaluation_id)
  const accionesPorPlan = porSistema(acciones, (a) => a.plan_id)

  return sistemas.map((s) => {
    const level = s.aiact_result?.level ?? s.aiact_risk_level ?? null
    const obl = obligPorSistema.get(s.id) ?? []
    const evaluacion = referencia.get(s.id) ?? null
    const plan = planDe.get(s.id) ?? null
    const accionesPlan = plan ? accionesPorPlan.get(plan.id) ?? [] : []
    const conAccion = new Set(accionesPlan.filter((a) => a.status !== 'cancelled').map((a) => a.fmea_item_id))
    const aprobados = new Set((docsPorSistema.get(s.id) ?? []).map((d) => d.template_key))
    const evid = evidPorSistema.get(s.id) ?? []
    const mitigacionesAbiertas = accionesPlan.filter((a) => a.option === 'mitigar' && MITIGACION_ABIERTA.has(a.status)).length

    const facts = applicabilityFacts(s)
    const requiredDocuments: RequiredDocumentFact[] = DOCUMENTOS_ETAPA
      .filter((key) => documentApplicability(key, facts).mode === 'redactar')
      .map((key) => ({ key, label: TEMPLATE_META[key].label, approved: aprobados.has(key) }))

    const stage = systemStage({
      systemId: s.id,
      scope: (s.aiact_result?.scope ?? null) as Parameters<typeof systemStage>[0]['scope'],
      level,
      reviewPending: s.aiact_review_pending === true,
      // Sin filas guardadas, las obligaciones del motor están todas por aceptar.
      suggestedObligations: obl.length === 0 ? (s.aiact_obligations ?? []).length : obl.filter((o) => o.status === 'suggested').length,
      openObligations: obl.filter((o) => ['pending', 'in_progress', 'blocked'].includes(o.status)).length,
      evaluationApproved: evaluacion?.state === 'approved',
      planApproved: plan ? PLAN_APROBADO.has(plan.status) : false,
      aisiaApproved: aprobados.has('aisia'),
      requiredDocuments,
      oversightDesignated: Boolean(s.human_oversight_owner_id),
      openActions: mitigacionesAbiertas,
      untreatedSevereModes: evaluacion
        ? (itemsPorEval.get(evaluacion.id) ?? []).filter((i) => i.status === 'evaluated' && (i.s_actual ?? 0) >= 9 && !conAccion.has(i.id)).length
        : 0,
      expiredEvidences: evid.filter((e) => e.status === 'expired' || (e.status === 'valid' && e.expires_at !== null && Date.parse(e.expires_at) < ahora)).length,
      overdueReviews:
        (evaluacion?.state === 'approved' && evaluacion.next_review_at && evaluacion.next_review_at.slice(0, 10) < hoy ? 1 : 0)
        + accionesPlan.filter((a) => a.status === 'accepted' && a.review_due_date !== null && a.review_due_date < hoy).length,
      planDeadlineOverdue: Boolean(plan && (plan.status === 'approved' || plan.status === 'in_progress') && plan.deadline && plan.deadline < hoy),
      pendingReevaluations: hechosReevaluacion.has(s.id)
        ? pendingReevaluations(disparadores.get(s.id) ?? [], hechosReevaluacion.get(s.id)!)
        : 0,
    })

    // Documentación del proveedor válida: por su etiqueta o por su tipo del catálogo.
    const docProveedor = (tag: string, code: string) => evid.some((e) =>
      e.status === 'valid' && ((e.tags ?? []).includes(tag) || (e.evidence_type_id !== null && e.evidence_type_id === tipoId.get(code))))
    const obligacion = (code: string): DeploymentObligation => {
      const fila = obl.find((o) => o.obligation_code === code && o.status !== 'excluded')
      if (!fila) return null
      return fila.status === 'resolved' ? 'resolved' : 'open'
    }
    const friaAplica = documentApplicability('fria', facts).mode === 'redactar'
    // B27: registro del proveedor, si la organización no es la proveedora y el
    // sistema es del Anexo III fuera de la infraestructura crítica (registro nacional).
    const puntosIII = facts.highRiskRoute?.annex === 'III' ? facts.highRiskRoute.points : []
    const registroExigido = !facts.valueChainRoles.includes('provider') && puntosIII.some((p) => p !== '2')
    const registroProveedor = evid.some((e) => e.status === 'valid' && (e.tags ?? []).includes('doc-proveedor-tipo-registro'))
    const friaDocs = (docsPorSistema.get(s.id) ?? []).filter((d) => d.template_key === 'fria')
    const deployment = deploymentPlan({
      systemId: s.id,
      level,
      valueChainRoles: facts.valueChainRoles,
      providerInstructions: docProveedor('doc-proveedor-tipo-instrucciones', TIPO_INSTRUCCIONES),
      providerDeclaration: docProveedor('doc-proveedor-tipo-declaracion', TIPO_DECLARACION),
      providerRegistration: registroExigido ? { registered: registroProveedor, publicBody: facts.publicBody === true } : null,
      oversightDocumented: supervision.get(s.id)?.documented ?? false,
      fria: friaAplica ? { approved: friaDocs.length > 0, notified: friaDocs.some((d) => friaNotificada.has(d.id)) } : null,
      inputData: obligacion('AI-ACT-ART26-4'),
      workersInformed: obligacion('AI-ACT-ART26-7'),
      affectedInformed: obligacion('AI-ACT-ART26-11'),
    })

    return { id: s.id, name: s.name, status: s.status, level, stage, deployment }
  })
}
