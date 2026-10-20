'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { composeDocument, type ComposedDocument } from '@/lib/documents/compose'
import type { TemplateOption } from '@/lib/documents/templates'
import { generateRender } from '@/lib/documents/render'
import { DOCUMENT_STATUS_LABELS, isTemplateKey, templateMeta } from '@/lib/documents/templates'
import {
  DOCUMENT_TRANSITIONS,
  documentApprovalBlocker,
  documentAuthors,
  type DocumentAction,
} from '@/lib/documents/lifecycle-rules'
import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history'

/**
 * Expedientes regulatorios por sistema: Anexo IV, FRIA, DPIA y ficha de modelo.
 *
 * El documento se crea la primera vez que alguien lo abre. No hay botón de
 * "crear expediente": la obligación existe desde que el sistema entra en el
 * supuesto que la activa, no desde que a alguien se le ocurre pulsar un botón.
 */



async function ctx() {
  const supabase = createClient()
  const fluxion = createFluxionClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const, profile: null, fluxion }

  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, user_id, organization_id, full_name, role, roles')
    .eq('user_id', user.id)
    .single()

  if (!profile) return { error: 'No autenticado' as const, profile: null, fluxion }
  return { error: null, profile, fluxion }
}

/**
 * Mensaje de un error de la base de datos. Las reglas del ciclo
 * (`trg_document_lifecycle_rules`) ya devuelven el texto para el usuario.
 */
function dbError(error: { message: string; code?: string }, fallback: string): string {
  if (error.code === '23514' || error.code === '42501' || error.code === 'P0001') return error.message
  return fallback
}

/** Las plantillas del catálogo y si el sistema ya tiene expediente de cada una. */
export async function listTemplatesForSystem(aiSystemId: string): Promise<TemplateOption[]> {
  const { profile, fluxion } = await ctx()
  if (!profile) return []

  const { data: templates } = await fluxion
    .from('document_templates')
    .select('key, title, description, framework, version')
    .eq('is_active', true)
    .order('version', { ascending: false })

  const { data: docs } = await fluxion
    .from('documents')
    .select('template_key')
    .eq('ai_system_id', aiSystemId)
    .neq('status', 'superseded')

  const existentes = new Set((docs ?? []).map((d) => String(d.template_key)))
  const vistos = new Set<string>()

  return ((templates ?? []) as Array<Record<string, unknown>>)
    .filter((t) => {
      const k = String(t.key)
      // Solo las plantillas que esta pantalla sabe abrir. `document_templates`
      // tambien guarda el acta de aprobacion, que no es un expediente que se
      // componga sino el registro de algo que ya paso: aparecia como pestana y
      // su enlace daba 404, porque la ruta rechaza las claves que no son
      // editables. El acta se descarga desde la solicitud.
      if (!isTemplateKey(k)) return false
      if (vistos.has(k)) return false   // solo la versión más alta de cada clave
      vistos.add(k)
      return true
    })
    .map((t) => ({
      key: String(t.key),
      title: String(t.title),
      description: (t.description as string | null) ?? null,
      framework: String(t.framework),
      hasDocument: existentes.has(String(t.key)),
    }))
}

export async function getOrCreateDocument(
  aiSystemId: string,
  templateKey: string,
): Promise<ComposedDocument | { error: string }> {
  const { error, profile, fluxion } = await ctx()
  if (error || !profile) return { error: error ?? 'No autenticado' }

  // RLS decide si el sistema es de esta organización. Si no lo es, no hay fila
  // y no hay expediente que crear.
  const { data: system } = await fluxion
    .from('ai_systems')
    .select('id, name, organization_id')
    .eq('id', aiSystemId)
    .maybeSingle()

  if (!system) return { error: 'Sistema no encontrado.' }

  const { data: existing } = await fluxion
    .from('documents')
    .select('id')
    .eq('ai_system_id', aiSystemId)
    .eq('template_key', templateKey)
    .neq('status', 'superseded')
    .maybeSingle()

  let documentId = existing?.id as string | undefined

  if (!documentId) {
    // Siempre la versión activa más alta del catálogo, o la adaptación de la
    // organización si la hubiera.
    const { data: template } = await fluxion
      .from('document_templates')
      .select('version, title')
      .eq('key', templateKey)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!template) {
      return { error: `No hay ninguna plantilla activa para "${templateKey}". Revisa las migraciones.` }
    }

    const { data: created, error: insErr } = await fluxion
      .from('documents')
      .insert({
        organization_id: system.organization_id,
        ai_system_id: aiSystemId,
        template_key: templateKey,
        template_version: template.version,
        title: `${template.title} · ${system.name}`,
        created_by: profile.id,
      })
      .select('id')
      .single()

    if (insErr || !created) {
      console.error('getOrCreateAnnexIvDocument:', insErr)
      return { error: 'No se pudo crear el expediente.' }
    }
    documentId = created.id
  }

  if (!documentId) return { error: 'No se pudo resolver el expediente.' }

  const composed = await composeDocument(documentId)
  if (!composed) return { error: 'No se pudo componer el expediente.' }
  return composed
}

export async function saveDocumentSection(input: {
  documentId: string
  ref: string
  text: string
  aiSystemId: string
  templateKey: string
}): Promise<{ ok: true } | { error: string }> {
  const { error, profile, fluxion } = await ctx()
  if (error || !profile) return { error: error ?? 'No autenticado' }

  const { data: doc } = await fluxion
    .from('documents')
    .select('id, content, status, template_key, template_version')
    .eq('id', input.documentId)
    .maybeSingle()

  if (!doc) return { error: 'Expediente no encontrado.' }
  // Solo se edita en borrador (B09): en revisión o aprobado, lo que se revisa
  // tiene que ser lo que hay.
  if (doc.status === 'approved') {
    return { error: 'El expediente está aprobado. Reábrelo para crear una versión nueva y editarla.' }
  }
  if (doc.status === 'in_review') {
    return { error: 'El expediente está en revisión. Vuelve a borrador para editarlo.' }
  }

  // Que la referencia exista en la plantilla. Sin esto, `content` acabaría
  // acumulando claves de versiones antiguas que ya no se muestran en ningún
  // sitio y que nadie volvería a mirar.
  const { data: template } = await fluxion
    .from('document_templates')
    .select('sections')
    .eq('key', doc.template_key)
    .eq('version', doc.template_version)
    .maybeSingle()

  const refs = ((template?.sections ?? []) as Array<{ ref: string }>).map((s) => s.ref)
  if (!refs.includes(input.ref)) {
    return { error: `El apartado ${input.ref} no existe en esta versión de la plantilla.` }
  }

  const content = { ...((doc.content ?? {}) as Record<string, unknown>) }
  const text = input.text.trim()

  if (text) {
    content[input.ref] = {
      text,
      author_id: profile.id,
      updated_at: new Date().toISOString(),
    }
  } else {
    delete content[input.ref]
  }

  const { error: updErr } = await fluxion
    .from('documents')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', input.documentId)

  if (updErr) {
    console.error('saveDocumentSection:', updErr)
    return { error: dbError(updErr, 'No se pudo guardar el apartado.') }
  }

  revalidatePath(`/inventario/${input.aiSystemId}/expediente/${input.templateKey}`)
  return { ok: true }
}

const ACTION_EVENTS: Record<DocumentAction, { type: string; title: string }> = {
  submit:  { type: 'document_submitted', title: 'Expediente enviado a revisión' },
  return:  { type: 'document_returned',  title: 'Expediente devuelto a borrador' },
  approve: { type: 'document_approved',  title: 'Expediente aprobado' },
}

/**
 * Cambia el estado del expediente por el ciclo (B09): enviar a revisión,
 * devolver a borrador o aprobar. Aprobar exige la revisión previa, ningún
 * apartado obligatorio sin cubrir y que apruebe el Responsable del SGAI que no
 * lo redactó (DP-01). Cada cambio deja rastro en el historial del sistema.
 */
export async function changeDocumentStatus(input: {
  documentId: string
  action: DocumentAction
  aiSystemId: string
  templateKey: string
}): Promise<{ ok: true } | { error: string }> {
  const { error, profile, fluxion } = await ctx()
  if (error || !profile) return { error: error ?? 'No autenticado' }

  const { data: doc } = await fluxion
    .from('documents')
    .select('id, status, title, template_key, content, ai_system_id, organization_id, version')
    .eq('id', input.documentId)
    .maybeSingle()

  if (!doc) return { error: 'Expediente no encontrado.' }

  const transition = DOCUMENT_TRANSITIONS[input.action]
  if (doc.status !== transition.from) {
    return {
      error: `Esta acción no se puede aplicar a un expediente en estado «${DOCUMENT_STATUS_LABELS[doc.status] ?? doc.status}».`,
    }
  }

  if (input.action === 'approve') {
    if (!isTemplateKey(doc.template_key)) return { error: 'Plantilla desconocida.' }

    const blocker = documentApprovalBlocker({
      templateKey: doc.template_key,
      actor: profile,
      actorProfileId: profile.id,
      authorProfileIds: documentAuthors(doc.content),
    })
    if (blocker) return { error: blocker }

    // Un expediente no se aprueba con huecos obligatorios: es el acto que un
    // auditor va a mirar.
    const composed = await composeDocument(input.documentId)
    if (!composed) return { error: 'No se pudo componer el expediente.' }
    if (composed.gaps.length > 0) {
      const refs = composed.gaps.map((g) => g.ref).join(', ')
      return { error: `No se puede aprobar con apartados obligatorios sin cubrir: ${refs}.` }
    }
  }

  // Quién y cuándo aprobó lo rellena la base de datos (trg_document_lifecycle_rules).
  const { data: updated, error: updErr } = await fluxion
    .from('documents')
    .update({ status: transition.to, updated_at: new Date().toISOString() })
    .eq('id', input.documentId)
    .select('id')

  if (updErr) {
    console.error('changeDocumentStatus:', updErr)
    return { error: dbError(updErr, 'No se pudo cambiar el estado del expediente.') }
  }
  if (!updated || updated.length === 0) return { error: 'No tienes permisos para cambiar este expediente.' }

  if (doc.ai_system_id) {
    const { type, title } = ACTION_EVENTS[input.action]
    await insertAiSystemHistoryEvents(fluxion, [
      {
        ai_system_id: doc.ai_system_id,
        organization_id: doc.organization_id,
        event_type: type,
        event_title: title,
        event_summary: `${templateMeta(doc.template_key).label} · versión ${doc.version ?? 1}: ${title.toLowerCase()}.`,
        actor_user_id: profile.user_id,
        payload: {
          document_id: doc.id,
          template_key: doc.template_key,
          version: doc.version ?? 1,
          from_status: doc.status,
          to_status: transition.to,
        },
      },
    ])
  }

  revalidatePath(`/inventario/${input.aiSystemId}/expediente/${input.templateKey}`)
  return { ok: true }
}

/**
 * Reabre un expediente aprobado (B09): el aprobado pasa a «Sustituido» y nace
 * la versión siguiente en borrador con el mismo contenido. Lo hace
 * `fluxion.document_reopen` en una transacción.
 */
export async function reopenDocument(input: {
  documentId: string
  aiSystemId: string
  templateKey: string
}): Promise<{ ok: true } | { error: string }> {
  const { error, profile, fluxion } = await ctx()
  if (error || !profile) return { error: error ?? 'No autenticado' }

  const { data: doc } = await fluxion
    .from('documents')
    .select('id, template_key, ai_system_id, organization_id, version')
    .eq('id', input.documentId)
    .maybeSingle()
  if (!doc) return { error: 'Expediente no encontrado.' }

  const { data: nuevo, error: rpcErr } = await fluxion.rpc('document_reopen', { p_document_id: input.documentId })
  if (rpcErr || !nuevo) {
    console.error('reopenDocument:', rpcErr)
    return { error: rpcErr ? dbError(rpcErr, 'No se pudo reabrir el expediente.') : 'No se pudo reabrir el expediente.' }
  }

  if (doc.ai_system_id) {
    await insertAiSystemHistoryEvents(fluxion, [
      {
        ai_system_id: doc.ai_system_id,
        organization_id: doc.organization_id,
        event_type: 'document_reopened',
        event_title: 'Expediente reabierto',
        event_summary: `${templateMeta(doc.template_key).label}: la versión ${doc.version ?? 1} queda sustituida y se abre la versión ${(doc.version ?? 1) + 1} en borrador.`,
        actor_user_id: profile.user_id,
        payload: { document_id: nuevo, previous_document_id: doc.id, template_key: doc.template_key },
      },
    ])
  }

  revalidatePath(`/inventario/${input.aiSystemId}/expediente/${input.templateKey}`)
  return { ok: true }
}

/** Si quien mira puede aprobar este expediente y, si no, por qué (para la interfaz). */
export async function getDocumentApprovalContext(documentId: string): Promise<{ canApprove: boolean; reason: string | null }> {
  const { profile, fluxion } = await ctx()
  if (!profile) return { canApprove: false, reason: 'No autenticado' }

  const { data: doc } = await fluxion
    .from('documents')
    .select('template_key, content')
    .eq('id', documentId)
    .maybeSingle()
  if (!doc || !isTemplateKey(doc.template_key)) return { canApprove: false, reason: null }

  const reason = documentApprovalBlocker({
    templateKey: doc.template_key,
    actor: profile,
    actorProfileId: profile.id,
    authorProfileIds: documentAuthors(doc.content),
  })
  return { canApprove: reason === null, reason }
}

export type RenderRow = {
  id: string
  rendered_at: string
  byte_size: number
  checksum_sha256: string
  gaps: Array<{ ref: string; title: string }>
  document_status: string
  rendered_by_name: string | null
  /** Versión del expediente con la que se generó (B09). */
  document_version: number
}

/**
 * Entregables del expediente, de todas sus versiones: al reabrir un aprobado
 * nace otro documento, y los PDF de la versión aprobada siguen siendo la prueba.
 */
export async function listDocumentRenders(documentId: string): Promise<RenderRow[]> {
  const { profile, fluxion } = await ctx()
  if (!profile) return []

  const { data: doc } = await fluxion
    .from('documents')
    .select('ai_system_id, template_key')
    .eq('id', documentId)
    .maybeSingle()
  if (!doc) return []

  let versionsQuery = fluxion
    .from('documents')
    .select('id, version')
    .eq('template_key', doc.template_key)
    .is('approval_request_id', null)
  versionsQuery = doc.ai_system_id
    ? versionsQuery.eq('ai_system_id', doc.ai_system_id)
    : versionsQuery.eq('id', documentId)
  const { data: versions } = await versionsQuery

  const versionById = new Map(
    ((versions ?? []) as Array<{ id: string; version: number | null }>).map((v) => [v.id, v.version ?? 1]),
  )
  const ids = versionById.size ? Array.from(versionById.keys()) : [documentId]

  const { data } = await fluxion
    .from('document_renders')
    .select('id, document_id, rendered_at, byte_size, checksum_sha256, gaps, document_status, profiles:rendered_by(full_name)')
    .in('document_id', ids)
    .order('rendered_at', { ascending: false })

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    rendered_at: String(r.rendered_at),
    byte_size: Number(r.byte_size ?? 0),
    checksum_sha256: String(r.checksum_sha256 ?? ''),
    gaps: (r.gaps ?? []) as Array<{ ref: string; title: string }>,
    document_status: String(r.document_status ?? ''),
    rendered_by_name:
      (r.profiles as { full_name?: string } | null)?.full_name ?? null,
    document_version: versionById.get(String(r.document_id)) ?? 1,
  }))
}

export async function generateDocumentRender(input: {
  documentId: string
  aiSystemId: string
  templateKey: string
}): Promise<{ renderId: string; gaps: number } | { error: string }> {
  const { error, profile } = await ctx()
  if (error || !profile) return { error: error ?? 'No autenticado' }

  const res = await generateRender({
    documentId: input.documentId,
    profileId: profile.id,
    userId: profile.user_id,
    profileName: profile.full_name ?? 'Fluxion',
  })

  if (res.error) return { error: res.error }
  if (!res.renderId) return { error: 'No se pudo generar el entregable.' }

  revalidatePath(`/inventario/${input.aiSystemId}/expediente/${input.templateKey}`)
  return { renderId: res.renderId, gaps: res.gaps ?? 0 }
}

// ── Documentos generados ────────────────────────────────────────────────────
// Actas y demás registros que produce la plataforma sola. No son expedientes
// que alguien componga: no se editan, no tienen apartados pendientes y no
// aparecen en el selector de plantillas.
//
// Se listan aquí porque es donde un auditor los busca. Que existan en la base y
// solo se puedan alcanzar desde la bandeja de aprobaciones es tenerlos y no
// tenerlos.

export type GeneratedDocRow = {
  id:           string
  title:        string
  templateKey:  string
  templateName: string
  createdAt:    string
  renderId:     string | null
  byteSize:     number | null
  /** Solicitud de la que sale, para poder enlazarla. */
  approvalRequestId: string | null
}

export async function listGeneratedDocuments(aiSystemId: string): Promise<GeneratedDocRow[]> {
  const { profile, fluxion } = await ctx()
  if (!profile) return []

  const { data: docs } = await fluxion
    .from('documents')
    .select('id, title, template_key, created_at, approval_request_id')
    .eq('ai_system_id', aiSystemId)
    .neq('status', 'superseded')
    .not('approval_request_id', 'is', null)
    .order('created_at', { ascending: false })

  if (!docs?.length) return []

  const [{ data: renders }, { data: templates }] = await Promise.all([
    fluxion
      .from('document_renders')
      .select('id, document_id, byte_size, rendered_at')
      .in('document_id', docs.map((d: { id: string }) => d.id))
      .order('rendered_at', { ascending: false }),
    fluxion
      .from('document_templates')
      .select('key, title')
      .in('key', docs.map((d: { template_key: string }) => d.template_key)),
  ])

  // El primero de cada documento es el más reciente, por el orden de la consulta.
  const ultimoRender: Record<string, { id: string; byte_size: number }> = {}
  for (const r of (renders ?? []) as Array<{ id: string; document_id: string; byte_size: number }>) {
    if (!ultimoRender[r.document_id]) ultimoRender[r.document_id] = { id: r.id, byte_size: r.byte_size }
  }

  const nombreTemplate = (k: string) =>
    ((templates ?? []) as Array<{ key: string; title: string }>).find((t) => t.key === k)?.title ?? k

  return (docs as Array<{
    id: string; title: string; template_key: string
    created_at: string; approval_request_id: string | null
  }>).map((d) => ({
    id:                d.id,
    title:             d.title,
    templateKey:       d.template_key,
    templateName:      nombreTemplate(d.template_key),
    createdAt:         d.created_at,
    renderId:          ultimoRender[d.id]?.id ?? null,
    byteSize:          ultimoRender[d.id]?.byte_size ?? null,
    approvalRequestId: d.approval_request_id,
  }))
}
