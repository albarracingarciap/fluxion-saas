import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

import { renderPdf } from '@/lib/documents/render'
import { loadEvidenceCatalogTypes } from '@/lib/evidences/catalog-type-server'
import { milestoneFooterHtml, type MilestoneCover } from '@/lib/milestones/milestone-html'
import { BUCKET_DOCUMENTS, objectKey, putObject, s3Configured } from '@/lib/storage/objects'
import { createNoCacheAdminClient } from '@/lib/supabase/ingest'

import { sessionMinutesHtml } from './committee-session-html'
import {
  APPROVAL_STATUS_LABEL, normalizeAgenda, normalizeAttendees, normalizeDecisions, sessionLabel, sessionQuorum,
  type SessionType,
} from './committee-sessions'

/**
 * Acta de una sesión de comité como evidencia (B20b, DP-09).
 *
 * Al cerrar la sesión se genera el PDF del acta bloqueada, se guarda en el
 * bucket de documentos (retención de 10 años, no se puede borrar) y se
 * registra como evidencia válida de la organización. El acta de una revisión
 * por la dirección lleva el tipo del catálogo «Acta de revisión por
 * dirección» (EVT-PRO-01), que es el que piden las cláusulas §9.3 y §9.2.
 *
 * No lanza: la sesión ya está cerrada. Si falla, devuelve el aviso y la
 * sesión ofrece regenerarla. Idempotente: si la sesión ya tiene evidencia, no
 * hace nada.
 */

const fecha = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('es-ES') : '—')

export async function generateSessionMinutesEvidence(params: {
  sessionId: string
  /** auth.users.id de quien cerró la sesión: responsable de la evidencia. */
  actorUserId: string | null
}): Promise<{ evidenceId?: string; aviso?: string }> {
  try {
    const admin = createNoCacheAdminClient()
    const { data: s } = await admin
      .from('committee_sessions')
      .select('id, organization_id, committee_id, session_number, session_type, scheduled_at, started_at, ended_at, location, agenda, attendees, decisions, minutes_text, minutes_locked, minutes_locked_at, minutes_locked_by, minutes_evidence_id, status, quorum_met')
      .eq('id', params.sessionId)
      .maybeSingle()
    if (!s || !s.minutes_locked) return {}
    if (s.minutes_evidence_id) return { evidenceId: s.minutes_evidence_id }
    if (!s3Configured()) return { aviso: 'El PDF del acta no se generó: el almacenamiento de documentos no está configurado.' }

    const [{ data: org }, { data: comite }] = await Promise.all([
      admin.from('organizations').select('name').eq('id', s.organization_id).maybeSingle(),
      admin.from('committees').select('name, type, quorum').eq('id', s.committee_id).maybeSingle(),
    ])

    const agenda = normalizeAgenda(s.agenda)
    const attendees = normalizeAttendees(s.attendees)
    const decisions = normalizeDecisions(s.decisions)

    const reqIds = agenda.map((p) => p.approval_request_id).filter((x): x is string => !!x)
    const { data: solicitudes } = reqIds.length
      ? await admin.from('v_approval_requests').select('id, object_label, object_type, status').in('id', reqIds).eq('organization_id', s.organization_id)
      : { data: [] }
    const porSolicitud = new Map(((solicitudes ?? []) as Array<{ id: string; object_label: string | null; object_type: string; status: string }>)
      .map((r) => [r.id, r]))

    const { data: perfiles } = await admin
      .from('profiles').select('id, user_id, full_name, display_name').eq('organization_id', s.organization_id)
    const filasPerfil = (perfiles ?? []) as Array<{ id: string; user_id: string; full_name: string | null; display_name: string | null }>
    const nombre = (p?: { full_name: string | null; display_name: string | null }) => (p ? p.display_name || p.full_name || 'Usuario' : null)
    const porPerfil = new Map(filasPerfil.map((p) => [p.id, p]))
    const cerradoPor = nombre(filasPerfil.find((p) => p.id === s.minutes_locked_by)) ?? '—'

    const tipo = s.session_type as SessionType
    const etiqueta = sessionLabel(s.session_number, tipo)
    const quorum = sessionQuorum(attendees, comite?.quorum ?? null)
    const renderId = randomUUID()
    const generatedAt = new Date()
    const stamp = generatedAt.toISOString().slice(0, 10)
    const datos = { agenda, attendees, decisions, minutes: s.minutes_text }

    const cover: MilestoneCover = {
      title: `Acta · ${comite?.name ?? 'Comité'}`,
      subtitle: etiqueta,
      organizationName: org?.name ?? '—',
      rows: [
        ['Convocada para', fecha(s.scheduled_at)],
        ['Inicio', fecha(s.started_at)],
        ['Fin', fecha(s.ended_at)],
        ['Lugar', s.location || '—'],
        ['Quórum', quorum.met ? 'Alcanzado' : 'No alcanzado'],
        ['Acta cerrada por', cerradoPor],
        ['Acta cerrada el', fecha(s.minutes_locked_at)],
        ['Generado', generatedAt.toLocaleString('es-ES')],
      ],
      renderId,
      contentChecksum: createHash('sha256').update(JSON.stringify(datos)).digest('hex'),
    }

    const html = sessionMinutesHtml({
      cover,
      agenda: agenda.map((p) => {
        const r = p.approval_request_id ? porSolicitud.get(p.approval_request_id) : undefined
        return { ...p, approval_label: r ? r.object_label ?? `APR-${r.id.slice(0, 8)}` : null, approval_status: r ? APPROVAL_STATUS_LABEL[r.status] ?? r.status : null }
      }),
      attendees,
      decisions: decisions.map((d) => ({ ...d, owner_name: d.owner_profile_id ? nombre(porPerfil.get(d.owner_profile_id)) : null })),
      minutesText: s.minutes_text ?? '',
      quorum,
    })

    const titulo = `Acta ${etiqueta.toLowerCase()} · ${comite?.name ?? 'Comité'}`
    const pdf = await renderPdf(html, milestoneFooterHtml(titulo, renderId))
    const key = objectKey({ organizationId: s.organization_id, scope: 'documents', entityId: s.id, filename: `acta-sesion-${s.session_number}-${stamp}.pdf` })
    const stored = await putObject({ bucket: BUCKET_DOCUMENTS, key, body: pdf, contentType: 'application/pdf' })

    const revision = tipo === 'management_review'
    const tipoCatalogo = revision ? (await loadEvidenceCatalogTypes()).find((t) => t.code === 'EVT-PRO-01')?.id ?? null : null
    const tags = ['acta-comite', `comite-${comite?.type ?? 'desconocido'}`, `sesion-${s.id}`, ...(revision ? ['revision-direccion'] : [])]

    const { data: evidencia, error } = await admin
      .from('system_evidences')
      .insert({
        organization_id: s.organization_id,
        ai_system_id: null,
        scope: 'organization',
        title: `${titulo} · ${stamp}`.slice(0, 300),
        description: `PDF del acta de la ${etiqueta.toLowerCase()} del ${comite?.name ?? 'comité'}, generado automáticamente al cerrar la sesión. Identificador ${renderId}.`,
        evidence_type: 'other',
        // Nace válida: el acta está cerrada y no cambia.
        status: 'valid',
        storage_path: key,
        storage_backend: 's3',
        storage_bucket: BUCKET_DOCUMENTS,
        checksum_sha256: stored.checksum,
        mime_type: 'application/pdf',
        file_size_bytes: stored.size,
        owner_user_id: params.actorUserId,
        issued_at: stamp,
        tags,
        evidence_type_id: tipoCatalogo,
      })
      .select('id')
      .single()
    if (error || !evidencia) return { aviso: 'El PDF del acta se guardó, pero no se pudo registrar como evidencia.' }

    await admin.from('committee_sessions').update({ minutes_evidence_id: evidencia.id }).eq('id', s.id)
    return { evidenceId: evidencia.id }
  } catch (e) {
    console.error('[committee-sessions] PDF del acta:', e)
    return { aviso: `El PDF del acta no se generó: ${e instanceof Error ? e.message : 'error desconocido'}.` }
  }
}
