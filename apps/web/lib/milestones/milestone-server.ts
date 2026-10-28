import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history'
import { renderPdf } from '@/lib/documents/render'
import { resolveEvidenceCatalogTypeId } from '@/lib/evidences/catalog-type-server'
import { buildFmeaEvaluationData } from '@/lib/fmea/data'
import { getZoneLabel, type FmeaZone } from '@/lib/fmea/domain'
import { buildTreatmentPlanData } from '@/lib/fmea/treatment-plan'
import { getOptionLabel } from '@/lib/fmea/treatment-plan-utils'
import { SOA_STATUS_LABEL } from '@/lib/gaps/soa'
import { BUCKET_DOCUMENTS, objectKey, putObject, s3Configured } from '@/lib/storage/objects'
import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import { buildSoAData } from '@/lib/templates/data'

import { milestoneFooterHtml, riskEvaluationHtml, soaHtml, type MilestoneCover } from './milestone-html'

/**
 * Hitos como evidencia (B19, GAP-33).
 *
 * Al aprobarse en Flujos de aprobación la evaluación de riesgos (su plan de
 * tratamiento) o la Declaración de Aplicabilidad, se genera un PDF con el
 * estado aprobado, se guarda en el bucket de documentos (retención de 10
 * años, no se puede borrar) y se registra como evidencia válida: el hito
 * aprobado queda como prueba que no cambia aunque el objeto evolucione.
 *
 * No lanza: la decisión ya está registrada. Si falla, devuelve el aviso. Es
 * idempotente por solicitud (etiqueta `hito-<solicitud>`).
 */

const ITEM_STATUS: Record<string, string> = { pending: 'Pendiente', evaluated: 'Confirmado', skipped: 'Pospuesto' }
const ACTION_STATUS: Record<string, string> = {
  pending: 'Pendiente', in_progress: 'En progreso', evidence_pending: 'Evidencia pdte.',
  completed: 'Completada', accepted: 'Aceptada', cancelled: 'Cancelada',
}
const SOA_STATUS: Record<string, string> = { ...SOA_STATUS_LABEL, implemented: 'Implantado', externalized: 'Externalizado' }

const fecha = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('es-ES') : '—')

export async function generateMilestoneEvidence(params: {
  requestId: string
  /** auth.users.id de quien cerró la aprobación: responsable de la evidencia. */
  actorUserId: string | null
}): Promise<{ aviso?: string }> {
  try {
    const admin = createNoCacheAdminClient()
    const { data: request } = await admin
      .from('approval_requests')
      .select('id, organization_id, object_type, object_id, status, closed_at')
      .eq('id', params.requestId)
      .maybeSingle()
    if (!request || request.status !== 'approved') return {}
    if (request.object_type !== 'treatment_plan' && request.object_type !== 'soa') return {}
    if (!s3Configured()) return { aviso: 'El PDF del hito no se generó: el almacenamiento de documentos no está configurado.' }

    const etiqueta = `hito-${request.id}`
    const { data: existente } = await admin
      .from('system_evidences').select('id').eq('organization_id', request.organization_id).contains('tags', [etiqueta]).limit(1)
    if ((existente ?? []).length > 0) return {}

    const [{ data: org }, { data: decisiones }] = await Promise.all([
      admin.from('organizations').select('name').eq('id', request.organization_id).maybeSingle(),
      admin.from('approval_decisions').select('actor_profile_id').eq('request_id', request.id).eq('decision', 'approved'),
    ])
    const ids = ((decisiones ?? []) as Array<{ actor_profile_id: string }>).map((d) => d.actor_profile_id)
    const { data: aprobadores } = ids.length
      ? await admin.from('profiles').select('full_name, display_name').in('id', ids)
      : { data: [] }
    const aprobadoPor = ((aprobadores ?? []) as Array<{ full_name: string | null; display_name: string | null }>)
      .map((p) => p.display_name || p.full_name || 'Usuario').join(', ') || '—'

    const renderId = randomUUID()
    const generatedAt = new Date()
    const stamp = generatedAt.toISOString().slice(0, 10)
    const baseRows: Array<[string, string]> = [
      ['Aprobado por', aprobadoPor],
      ['Fecha de aprobación', fecha(request.closed_at)],
      ['Solicitud de aprobación', `APR-${request.id.slice(0, 8)}`],
      ['Generado', generatedAt.toLocaleString('es-ES')],
    ]

    let html: string
    let titulo: string
    let etiquetaTipo: string
    let systemId: string | null = null
    let entityId: string
    let expiresAt: string | null = null
    let evidenceType: string
    let datos: unknown

    if (request.object_type === 'treatment_plan') {
      const { data: plan } = await admin
        .from('treatment_plans').select('id, system_id, evaluation_id, code').eq('id', request.object_id).maybeSingle()
      if (!plan) return { aviso: 'El PDF del hito no se generó: el plan ya no existe.' }
      const [{ data: sistema }, { data: evaluacion }] = await Promise.all([
        admin.from('ai_systems').select('id, name, internal_id').eq('id', plan.system_id).maybeSingle(),
        admin.from('fmea_evaluations').select('version, cached_zone, next_review_at').eq('id', plan.evaluation_id).maybeSingle(),
      ])
      const fmea = await buildFmeaEvaluationData({
        organizationId: request.organization_id, aiSystemId: plan.system_id, evaluationId: plan.evaluation_id, viewerUserId: params.actorUserId ?? '',
      })
      const planData = await buildTreatmentPlanData({
        organizationId: request.organization_id, aiSystemId: plan.system_id, evaluationId: plan.evaluation_id,
      })
      const nombre = new Map((planData?.members ?? []).map((m) => [m.id, m.full_name]))
      const items = (fmea?.items ?? []).map((i) => ({
        dimension: i.dimension_name, code: i.failure_mode_code, name: i.failure_mode_name,
        sDefault: i.s_default_frozen ?? null, o: i.o_value ?? null, d: i.d_real_value ?? null,
        sActual: i.status === 'evaluated' ? i.s_actual ?? null : null,
        status: ITEM_STATUS[i.status] ?? i.status, justification: i.narrative_justification ?? null,
      }))
      const actions = (planData?.actions ?? []).map((a) => ({
        code: a.failure_mode_code, name: a.failure_mode_name, option: getOptionLabel(a.option),
        status: ACTION_STATUS[a.status] ?? a.status, owner: a.owner_id ? nombre.get(a.owner_id) ?? null : null,
        dueDate: a.due_date ? fecha(a.due_date) : null, target: a.s_residual_target ?? null,
      }))
      systemId = plan.system_id
      entityId = plan.id
      expiresAt = evaluacion?.next_review_at ? String(evaluacion.next_review_at).slice(0, 10) : null
      evidenceType = 'risk_assessment'
      etiquetaTipo = 'evaluacion-riesgos'
      titulo = `Evaluación de riesgos v${evaluacion?.version ?? '?'} y plan ${plan.code} aprobados · ${sistema?.name ?? ''}`
      datos = { plan: plan.code, version: evaluacion?.version, items, actions }
      const cover: MilestoneCover = {
        title: String(sistema?.name ?? 'Sistema'),
        subtitle: 'Hito aprobado · Evaluación de riesgos (FMEA) y plan de tratamiento',
        organizationName: org?.name ?? '—',
        rows: [
          ['Código del sistema', String(sistema?.internal_id ?? '—')],
          ['Evaluación', `v${evaluacion?.version ?? '?'}`],
          ['Zona', evaluacion?.cached_zone ? getZoneLabel(evaluacion.cached_zone as FmeaZone) : '—'],
          ['Plan de tratamiento', plan.code],
          ['Próxima revisión', fecha(evaluacion?.next_review_at)],
          ...baseRows,
        ],
        renderId,
        contentChecksum: createHash('sha256').update(JSON.stringify(datos)).digest('hex'),
      }
      html = riskEvaluationHtml({ cover, items, actions })
    } else {
      const soa = await buildSoAData(request.organization_id)
      const nombre = new Map(soa.members.map((m) => [m.user_id, m.display_name]))
      const controls = soa.controls.map((c) => ({
        code: c.id, group: c.group, title: c.title, applicable: c.isApplicable,
        status: SOA_STATUS[c.status] ?? c.status, justification: c.justification, owner: c.ownerUserId ? nombre.get(c.ownerUserId) ?? null : null,
      }))
      entityId = request.organization_id
      evidenceType = 'regulatory_document'
      etiquetaTipo = 'declaracion-aplicabilidad'
      titulo = `Declaración de Aplicabilidad ISO/IEC 42001 v${soa.metadata?.version ?? '1.0'} aprobada`
      datos = { version: soa.metadata?.version, controls }
      const cover: MilestoneCover = {
        title: 'Declaración de Aplicabilidad · ISO/IEC 42001',
        subtitle: 'Hito aprobado · Declaración de Aplicabilidad del Anexo A',
        organizationName: org?.name ?? '—',
        rows: [
          ['Versión', String(soa.metadata?.version ?? '1.0')],
          ['Controles aplicables', `${soa.kpis.applicableCount} de ${soa.kpis.totalControls}`],
          ['Implantados', `${soa.kpis.implementedCount} (${soa.kpis.completionPercentage} %)`],
          ['Próxima revisión', fecha(soa.metadata?.next_review_date)],
          ...baseRows,
        ],
        renderId,
        contentChecksum: createHash('sha256').update(JSON.stringify(datos)).digest('hex'),
      }
      html = soaHtml({ cover, controls })
    }

    const pdf = await renderPdf(html, milestoneFooterHtml(titulo, renderId))
    const key = objectKey({ organizationId: request.organization_id, scope: 'documents', entityId, filename: `hito-${etiquetaTipo}-${stamp}.pdf` })
    const stored = await putObject({ bucket: BUCKET_DOCUMENTS, key, body: pdf, contentType: 'application/pdf' })

    const tags = ['hito', etiquetaTipo, etiqueta]
    const { data: evidencia, error } = await admin
      .from('system_evidences')
      .insert({
        organization_id: request.organization_id,
        ai_system_id: systemId,
        scope: systemId ? 'system' : 'organization',
        title: `${titulo} · ${stamp}`.slice(0, 300),
        description: `PDF del hito aprobado en Flujos de aprobación (APR-${request.id.slice(0, 8)}), generado automáticamente. Identificador ${renderId}.`,
        evidence_type: evidenceType,
        // Nace válida: lo que prueba ya está aprobado por el circuito.
        status: 'valid',
        storage_path: key,
        storage_backend: 's3',
        storage_bucket: BUCKET_DOCUMENTS,
        checksum_sha256: stored.checksum,
        mime_type: 'application/pdf',
        file_size_bytes: stored.size,
        owner_user_id: params.actorUserId,
        issued_at: stamp,
        expires_at: expiresAt,
        tags,
        evidence_type_id: await resolveEvidenceCatalogTypeId({ chosenId: undefined, freeType: evidenceType, tags }),
      })
      .select('id')
      .single()
    if (error || !evidencia) return { aviso: 'El PDF del hito se guardó, pero no se pudo registrar como evidencia.' }

    if (systemId) {
      await insertAiSystemHistoryEvents(admin, [{
        ai_system_id: systemId,
        organization_id: request.organization_id,
        event_type: 'evidence_milestone_generated',
        event_title: 'PDF del hito registrado como evidencia',
        event_summary: titulo,
        payload: { evidence_id: evidencia.id, request_id: request.id, render_id: renderId },
        actor_user_id: params.actorUserId,
      }])
    }
    return {}
  } catch (e) {
    console.error('[milestones] PDF del hito:', e)
    return { aviso: `El PDF del hito no se generó: ${e instanceof Error ? e.message : 'error desconocido'}.` }
  }
}
