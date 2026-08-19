import 'server-only'

import { createFluxionClient, createAdminFluxionClient } from '@/lib/supabase/fluxion'
import { BUCKET_DOCUMENTS, objectKey, putObject, s3Configured } from '@/lib/storage/objects'
import { composeDocument } from './compose'
import { buildDocumentHtml, buildFooterHtml } from './render-html'

/**
 * Generación del entregable.
 *
 * Cuatro pasos y ninguno opcional: componer el estado, congelarlo en un
 * snapshot, convertirlo en PDF y registrarlo como evidencia con caducidad.
 *
 * El orden importa. El snapshot se guarda ANTES del PDF para que, si el
 * renderizador falla, quede rastro de qué se intentó generar; y la evidencia se
 * crea DESPUÉS del objeto, para no registrar un fichero que no llegó a existir.
 */

const RENDER_TIMEOUT_MS = 60_000

export type RenderResult =
  | { renderId: string; gaps: number; error?: never }
  | { renderId?: never; gaps?: never; error: string }

async function renderPdf(html: string, footerHtml: string): Promise<Buffer> {
  const url = process.env.RENDERER_URL
  const secret = process.env.RENDERER_SECRET

  if (!url || !secret) {
    throw new Error('El servicio de renderizado no está configurado (RENDERER_URL / RENDERER_SECRET).')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS)

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/render/v1/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ html, footer_html: footerHtml }),
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!res.ok) {
      const detalle = await res.text().catch(() => '')
      throw new Error(`el renderizador respondió ${res.status}: ${detalle.slice(0, 200)}`)
    }

    return Buffer.from(await res.arrayBuffer())
  } finally {
    clearTimeout(timer)
  }
}

export async function generateRender(input: {
  documentId: string
  profileId: string
  profileName: string
}): Promise<RenderResult> {
  if (!s3Configured()) {
    return { error: 'El almacenamiento de documentos no está configurado.' }
  }

  const composed = await composeDocument(input.documentId)
  if (!composed) return { error: 'No se pudo componer el expediente.' }

  const fluxion = createFluxionClient()
  const admin = createAdminFluxionClient()

  const { data: doc } = await fluxion
    .from('documents')
    .select('id, organization_id, ai_system_id, template_key, template_version')
    .eq('id', input.documentId)
    .maybeSingle()

  if (!doc) return { error: 'Expediente no encontrado.' }

  const { data: org } = await fluxion
    .from('organizations')
    .select('name')
    .eq('id', doc.organization_id)
    .maybeSingle()

  const { data: template } = await fluxion
    .from('document_templates')
    .select('validity_months')
    .eq('key', doc.template_key)
    .eq('version', doc.template_version)
    .maybeSingle()

  const generatedAt = new Date()

  // 1 · Congelar el estado. Es lo que da sentido a la huella del PDF: sin esto,
  // dentro de un año nadie podría decir con qué datos se generó.
  const { data: snapshot } = await admin
    .from('system_report_snapshots')
    .insert({
      ai_system_id: doc.ai_system_id,
      organization_id: doc.organization_id,
      report_type: 'annex_iv',
      title: composed.document.title,
      payload: composed as unknown as Record<string, unknown>,
      generated_by: input.profileId,
    })
    .select('id')
    .single()

  // 2 · PDF
  let pdf: Buffer
  try {
    const html = buildDocumentHtml(composed, {
      organizationName: org?.name ?? '—',
      generatedBy: input.profileName,
      generatedAt,
    })
    pdf = await renderPdf(html, buildFooterHtml(composed))
  } catch (e) {
    console.error('generateRender · renderizado:', e)
    return { error: e instanceof Error ? e.message : 'No se pudo generar el PDF.' }
  }

  // 3 · Objeto en MinIO. El bucket fluxion-documents tiene retención GOVERNANCE
  // a 10 años (art. 18): una vez escrito, la aplicación no puede borrarlo.
  const stamp = generatedAt.toISOString().slice(0, 10)
  const key = objectKey({
    organizationId: doc.organization_id,
    scope: 'documents',
    entityId: doc.id,
    filename: `anexo-iv-${stamp}.pdf`,
  })

  let stored: { checksum: string; size: number }
  try {
    stored = await putObject({
      bucket: BUCKET_DOCUMENTS,
      key,
      body: pdf,
      contentType: 'application/pdf',
    })
  } catch (e) {
    console.error('generateRender · almacenamiento:', e)
    return { error: 'El PDF se generó pero no se pudo guardar.' }
  }

  // 4 · Evidencia con caducidad, para que el cron existente avise cuando el
  // expediente envejezca. Sin esto, la documentación regulatoria se pudre en
  // silencio, que es como está la de casi todo el mundo.
  const validity = template?.validity_months ?? 12
  const expires = new Date(generatedAt)
  expires.setMonth(expires.getMonth() + validity)

  const { data: evidence } = await admin
    .from('system_evidences')
    .insert({
      organization_id: doc.organization_id,
      ai_system_id: doc.ai_system_id,
      scope: doc.ai_system_id ? 'system' : 'organization',
      title: `${composed.document.title} · ${stamp}`,
      description: `Expediente del Anexo IV generado desde Fluxion. Cobertura: ${Math.round(composed.completeness * 100)} % de los apartados obligatorios.`,
      evidence_type: 'regulatory_document',
      status: 'valid',
      storage_path: key,
      storage_backend: 's3',
      storage_bucket: BUCKET_DOCUMENTS,
      checksum_sha256: stored.checksum,
      mime_type: 'application/pdf',
      file_size_bytes: stored.size,
      owner_user_id: null,
      issued_at: stamp,
      expires_at: expires.toISOString().slice(0, 10),
      tags: ['anexo-iv', 'generado'],
    })
    .select('id')
    .single()

  const { data: render, error: renderErr } = await admin
    .from('document_renders')
    .insert({
      organization_id: doc.organization_id,
      document_id: doc.id,
      format: 'pdf',
      template_key: doc.template_key,
      template_version: doc.template_version,
      snapshot_id: snapshot?.id ?? null,
      storage_backend: 's3',
      storage_bucket: BUCKET_DOCUMENTS,
      storage_path: key,
      checksum_sha256: stored.checksum,
      byte_size: stored.size,
      gaps: composed.gaps,
      document_status: composed.document.status,
      evidence_id: evidence?.id ?? null,
      rendered_by: input.profileId,
    })
    .select('id')
    .single()

  if (renderErr || !render) {
    console.error('generateRender · registro:', renderErr)
    return { error: 'El PDF se guardó pero no se pudo registrar el render.' }
  }

  return { renderId: render.id, gaps: composed.gaps.length }
}
