import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

import { renderPdf } from '@/lib/documents/render'
import { loadEvidenceCatalogTypes } from '@/lib/evidences/catalog-type-server'
import { milestoneFooterHtml, type MilestoneCover } from '@/lib/milestones/milestone-html'
import { BUCKET_DOCUMENTS, objectKey, putObject, s3Configured } from '@/lib/storage/objects'
import { createNoCacheAdminClient } from '@/lib/supabase/ingest'

import { SESGO, detectarSesgo, type HitlOverview } from './data'
import { hitlReportHtml } from './report-html'
import { REVIEW_MODE_LABEL, isReviewMode } from './review-mode'

/**
 * Informe de supervisión humana como evidencia (B30b, DP-13).
 *
 * PDF de un sistema y un periodo con los indicadores, los revisores, los
 * motivos de discordancia y los indicios de sesgo de automatización. Se
 * guarda en el bucket de documentos y se registra como evidencia válida del
 * sistema con el tipo «Acta de supervisión humana» (EVT-PRO-04): son datos
 * registrados, no una declaración que haya que revisar. Se genera a demanda en
 * Supervisión humana y al registrar cada revisión del funcionamiento (B28).
 *
 * No lanza: devuelve el aviso.
 */

const fechaCorta = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('es-ES', { timeZone: 'UTC' })

function diasEntre(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1
}

export async function generateHitlReportEvidence(params: {
  organizationId: string
  systemId: string
  /** Periodo, AAAA-MM-DD, ambos incluidos. */
  from: string
  to: string
  /** auth.users.id de quien lo genera: responsable de la evidencia. */
  actorUserId: string | null
}): Promise<{ evidenceId?: string; decisions?: number; aviso?: string }> {
  try {
    if (!params.from || !params.to || params.from > params.to) return { aviso: 'El periodo del informe no es válido.' }
    if (!s3Configured()) return { aviso: 'El informe de supervisión humana no se generó: el almacenamiento de documentos no está configurado.' }
    const admin = createNoCacheAdminClient()

    // El sistema es de la organización: con el cliente de servicio, el filtro
    // por sistema es lo que acota los datos.
    const { data: sistema } = await admin
      .from('ai_systems').select('id, name, internal_id, oversight_review_mode')
      .eq('id', params.systemId).eq('organization_id', params.organizationId).maybeSingle()
    if (!sistema) return { aviso: 'Sistema no encontrado.' }

    const dias = diasEntre(params.from, params.to)
    const { data: raw, error: rpcError } = await admin.rpc('hitl_overview', {
      p_days: dias, p_system_id: params.systemId, p_until: `${params.to}T23:59:59.999Z`,
    })
    if (rpcError || !raw) return { aviso: 'No se pudieron leer las decisiones del periodo.' }
    const o = raw as HitlOverview
    const t = o.totales ?? ({} as HitlOverview['totales'])
    const sesgo = new Set(detectarSesgo({ ...o, por_revisor: o.por_revisor ?? [] }).map((s) => s.ref))

    const { data: org } = await admin.from('organizations').select('name').eq('id', params.organizationId).maybeSingle()
    const renderId = randomUUID()
    const generatedAt = new Date()
    const stamp = generatedAt.toISOString().slice(0, 10)
    const modo = isReviewMode(sistema.oversight_review_mode) ? REVIEW_MODE_LABEL[sistema.oversight_review_mode] : 'Sin indicar'
    const datos = { system: sistema.id, from: params.from, to: params.to, totales: t, por_revisor: o.por_revisor, por_motivo: o.por_motivo, serie: o.serie }

    const cover: MilestoneCover = {
      title: String(sistema.name),
      subtitle: 'Informe de supervisión humana (AI Act, Art. 14)',
      organizationName: org?.name ?? '—',
      rows: [
        ['Código del sistema', String(sistema.internal_id ?? '—')],
        ['Periodo', `${fechaCorta(params.from)} – ${fechaCorta(params.to)}`],
        ['Modalidad de supervisión', modo],
        ['Generado', generatedAt.toLocaleString('es-ES')],
      ],
      renderId,
      contentChecksum: createHash('sha256').update(JSON.stringify(datos)).digest('hex'),
    }

    const html = hitlReportHtml({
      cover,
      totals: {
        decisions: Number(t.decisiones ?? 0), agreements: Number(t.conformes ?? 0), discordant: Number(t.discordantes ?? 0),
        notUsed: Number(t.no_usadas ?? 0), reviewers: Number(t.revisores ?? 0), medianMs: t.mediana_ms ?? null, withoutReason: Number(t.sin_motivo ?? 0),
      },
      reviewers: (o.por_revisor ?? []).map((r) => ({
        ref: r.reviewer_ref, role: r.reviewer_role, decisions: Number(r.decisiones), agreements: Number(r.conformes), medianMs: r.mediana_ms, bias: sesgo.has(r.reviewer_ref),
      })),
      reasons: (o.por_motivo ?? []).map((m) => ({ label: m.label, times: Number(m.veces) })),
      daily: (o.serie ?? []).map((d) => ({ day: String(d.day), decisions: Number(d.decisiones), agreements: Number(d.conformes) })),
      thresholds: { minCases: SESGO.MIN_CASOS, agreement: SESGO.CONCORDANCIA, medianMs: SESGO.MEDIANA_MS },
    })

    const titulo = `Informe de supervisión humana · ${sistema.name} · ${fechaCorta(params.from)} – ${fechaCorta(params.to)}`
    const pdf = await renderPdf(html, milestoneFooterHtml(titulo, renderId))
    const key = objectKey({ organizationId: params.organizationId, scope: 'documents', entityId: sistema.id, filename: `supervision-humana-${params.from}-${params.to}-${stamp}.pdf` })
    const stored = await putObject({ bucket: BUCKET_DOCUMENTS, key, body: pdf, contentType: 'application/pdf' })

    const tipo = (await loadEvidenceCatalogTypes()).find((x) => x.code === 'EVT-PRO-04')?.id ?? null
    const { data: evidencia, error } = await admin.from('system_evidences').insert({
      organization_id: params.organizationId,
      ai_system_id: sistema.id,
      scope: 'system',
      title: titulo.slice(0, 300),
      description: `Informe generado automáticamente con las decisiones registradas en Supervisión humana del periodo. Identificador ${renderId}.`,
      evidence_type: 'monitoring_log',
      // Nace válida: son los datos registrados del periodo, no una declaración.
      status: 'valid',
      storage_path: key,
      storage_backend: 's3',
      storage_bucket: BUCKET_DOCUMENTS,
      checksum_sha256: stored.checksum,
      mime_type: 'application/pdf',
      file_size_bytes: stored.size,
      owner_user_id: params.actorUserId,
      issued_at: stamp,
      tags: ['informe-supervision-humana', `periodo-${params.from}-${params.to}`],
      evidence_type_id: tipo,
    }).select('id').single()
    if (error || !evidencia) return { aviso: 'El PDF del informe se guardó, pero no se pudo registrar como evidencia.' }

    return { evidenceId: String(evidencia.id), decisions: Number(t.decisiones ?? 0) }
  } catch (e) {
    console.error('[hitl] informe:', e)
    return { aviso: `El informe de supervisión humana no se generó: ${e instanceof Error ? e.message : 'error desconocido'}.` }
  }
}
