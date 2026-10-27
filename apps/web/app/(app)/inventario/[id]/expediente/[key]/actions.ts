'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { composeDocument, type ComposedDocument } from '@/lib/documents/compose'
import type { TemplateOption } from '@/lib/documents/templates'
import { generateRender } from '@/lib/documents/render'
import { DOCUMENT_NOTIFICATION, DOCUMENT_STATUS_LABELS, isTemplateKey, templateMeta } from '@/lib/documents/templates'
import {
  DOCUMENT_TRANSITIONS,
  documentAuthors,
  type DocumentAction,
} from '@/lib/documents/lifecycle-rules'
import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history'
import { resolveEvidenceCatalogTypeId } from '@/lib/evidences/catalog-type-server'
import {
  PROVIDER_DOC_TYPES,
  applicabilityFacts,
  documentApplicability,
  providerDocTags,
  type Applicability,
} from '@/lib/documents/applicability'
import {
  cancelLiveApprovalRequest,
  hasApprovalPolicy,
  openApprovalRequest,
} from '@/lib/approvals/open'

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

/** Columnas de `ai_systems` que decide la aplicabilidad (DP-11). */
const APPLICABILITY_COLUMNS =
  'value_chain_roles, aiact_result, aiact_risk_level, aiact_inputs, is_gpai, manages_critical_infra, processes_personal_data'

/** Aplicabilidad de una plantilla al sistema (DP-11). Sin sistema visible, no aplica. */
export async function templateApplicability(aiSystemId: string, templateKey: string): Promise<Applicability> {
  const { profile, fluxion } = await ctx()
  if (!profile) return { mode: 'no_aplica', reason: 'No autenticado.' }
  const { data: system } = await fluxion.from('ai_systems').select(APPLICABILITY_COLUMNS).eq('id', aiSystemId).maybeSingle()
  if (!system) return { mode: 'no_aplica', reason: 'Sistema no encontrado.' }
  return documentApplicability(templateKey, applicabilityFacts(system as Record<string, unknown>))
}

/**
 * Las plantillas del catálogo que aplican al sistema (DP-11) y si ya tiene
 * expediente de cada una. Una que no aplica se sigue mostrando si el sistema ya
 * tiene documento: lo redactado no desaparece porque cambie la clasificación.
 */
export async function listTemplatesForSystem(aiSystemId: string): Promise<TemplateOption[]> {
  const { profile, fluxion } = await ctx()
  if (!profile) return []

  const { data: system } = await fluxion.from('ai_systems').select(APPLICABILITY_COLUMNS).eq('id', aiSystemId).maybeSingle()
  const facts = system ? applicabilityFacts(system as Record<string, unknown>) : null

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
    .map((t) => {
      const a = facts
        ? documentApplicability(String(t.key), facts)
        : { mode: 'no_aplica' as const, reason: 'Sistema no encontrado.' }
      return {
        key: String(t.key),
        title: String(t.title),
        description: (t.description as string | null) ?? null,
        framework: String(t.framework),
        hasDocument: existentes.has(String(t.key)),
        mode: a.mode,
        reason: a.reason,
      }
    })
    .filter((t) => t.mode !== 'no_aplica' || t.hasDocument)
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
    // Solo se crea si la plantilla se redacta para este sistema (DP-11).
    const aplicabilidad = await templateApplicability(aiSystemId, templateKey)
    if (aplicabilidad.mode !== 'redactar') return { error: aplicabilidad.reason }

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
}

/**
 * Cambia el estado del expediente por el ciclo (B09): enviar a revisión o
 * devolver a borrador. La aprobación se decide siempre en Flujos de aprobación
 * (B11f): enviar abre la solicitud con la política de la plantilla, y quien
 * redactó algún apartado no puede decidirla (DP-01). Cada cambio deja rastro
 * en el historial del sistema.
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

  // Solo en el circuito (B11f): sin política para la plantilla no se envía, y
  // quien aprueba solo puede decir sí o no, así que los huecos se comprueban
  // antes de enviarlo, no al votar.
  if (input.action === 'submit') {
    if (!(await hasApprovalPolicy(doc.organization_id, 'document', { template_key: doc.template_key }))) {
      return {
        error: `No hay ninguna política de aprobación activa para ${templateMeta(doc.template_key).label}. `
          + 'Configúrala en Ajustes › Aprobaciones antes de enviar el expediente.',
      }
    }
    const composed = await composeDocument(input.documentId)
    if (!composed) return { error: 'No se pudo componer el expediente.' }
    if (composed.gaps.length > 0) {
      const refs = composed.gaps.map((g) => g.ref).join(', ')
      return { error: `No se puede enviar a aprobación con apartados obligatorios sin cubrir: ${refs}.` }
    }
  }

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

  if (input.action === 'submit') {
    const apertura = await openApprovalRequest({
      organizationId: doc.organization_id,
      objectType: 'document',
      objectId: doc.id,
      requestedByProfileId: profile.id,
      // Quien redactó algún apartado no decide (DP-01): el motor lo excluye.
      context: { template_key: doc.template_key, prepared_by: documentAuthors(doc.content) },
    })
    if ('error' in apertura || apertura.requestId === null) {
      // Sin solicitud, el expediente no puede quedarse «en revisión» esperando a nadie.
      await fluxion.from('documents').update({ status: 'draft' }).eq('id', doc.id)
      return { error: 'error' in apertura ? apertura.error : 'No se pudo abrir la solicitud de aprobación: no hay política aplicable.' }
    }
  }
  if (input.action === 'return') {
    await cancelLiveApprovalRequest('document', doc.id, 'Devuelto a borrador por quien lo preparó.')
  }

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

// ── Documentación del proveedor (DP-11) ─────────────────────────────────────
//
// Si la organización no es proveedora de un sistema de alto riesgo, el Anexo IV
// y el registro UE no se redactan: se adjunta como evidencia del sistema lo que
// entrega el proveedor. Las evidencias llevan etiquetas propias para saber de qué
// plantilla son, y siguen su ciclo de revisión habitual.

export type ProviderDocRow = {
  id: string
  title: string
  docType: string | null
  status: string
  externalUrl: string | null
  hasFile: boolean
  createdAt: string
}

export async function listProviderDocuments(aiSystemId: string, templateKey: string): Promise<ProviderDocRow[]> {
  const { profile, fluxion } = await ctx()
  if (!profile || !isTemplateKey(templateKey)) return []
  const slug = templateMeta(templateKey).slug

  const { data } = await fluxion
    .from('system_evidences')
    .select('id, title, status, external_url, storage_path, tags, created_at')
    .eq('ai_system_id', aiSystemId)
    .contains('tags', [`doc-proveedor-${slug}`])
    .order('created_at', { ascending: false })

  return ((data ?? []) as Array<Record<string, unknown>>).map((e) => {
    const tags = (e.tags as string[] | null) ?? []
    const tipo = tags.find((t) => t.startsWith('doc-proveedor-tipo-'))
    return {
      id: String(e.id),
      title: String(e.title),
      docType: tipo ? tipo.slice('doc-proveedor-tipo-'.length) : null,
      status: String(e.status),
      externalUrl: (e.external_url as string | null) ?? null,
      hasFile: Boolean(e.storage_path),
      createdAt: String(e.created_at),
    }
  })
}

export async function addProviderDocument(input: {
  aiSystemId: string
  templateKey: string
  docType: string
  title: string
  externalUrl?: string | null
  /** El fichero se sube después de crear la evidencia (`uploadEvidenceFile`). */
  hasPendingFile?: boolean
}): Promise<{ id: string } | { error: string }> {
  const { error, profile, fluxion } = await ctx()
  if (error || !profile) return { error: error ?? 'No autenticado' }
  if (!isTemplateKey(input.templateKey)) return { error: 'Plantilla desconocida.' }

  const aplicabilidad = await templateApplicability(input.aiSystemId, input.templateKey)
  if (aplicabilidad.mode !== 'proveedor') {
    return { error: 'Este documento no se adjunta como documentación del proveedor para este sistema.' }
  }

  const tipo = PROVIDER_DOC_TYPES.find((t) => t.value === input.docType)
  if (!tipo) return { error: 'Elige el tipo de documento.' }
  if (!input.title?.trim()) return { error: 'Indica el título del documento.' }

  const url = input.externalUrl?.trim() || ''
  if (url) {
    try { new URL(url) } catch { return { error: 'La URL no es válida.' } }
  }
  if (!url && !input.hasPendingFile) return { error: 'Adjunta un fichero o indica la URL del documento.' }

  const { data: system } = await fluxion
    .from('ai_systems').select('id, organization_id').eq('id', input.aiSystemId).maybeSingle()
  if (!system) return { error: 'Sistema no encontrado.' }

  const meta = templateMeta(input.templateKey)
  const { data, error: insErr } = await fluxion
    .from('system_evidences')
    .insert({
      organization_id: system.organization_id,
      ai_system_id: system.id,
      scope: 'system',
      title: input.title.trim(),
      description: `${tipo.label} · ${meta.label} (documentación del proveedor)`,
      evidence_type: tipo.evidenceType,
      external_url: url || null,
      // Toda evidencia nace en borrador y se valida con la revisión (B10).
      status: 'draft',
      owner_user_id: profile.user_id,
      tags: providerDocTags(meta.slug, tipo.value),
      evidence_type_id: await resolveEvidenceCatalogTypeId({ chosenId: undefined, freeType: tipo.evidenceType, tags: providerDocTags(meta.slug, tipo.value) }),
    })
    .select('id')
    .single()
  if (insErr || !data) return { error: dbError(insErr ?? { message: '' }, 'No se pudo registrar el documento.') }

  await insertAiSystemHistoryEvents(fluxion, [{
    ai_system_id: system.id,
    organization_id: system.organization_id,
    event_type: 'provider_document_added',
    event_title: 'Documentación del proveedor añadida',
    event_summary: `${tipo.label} para ${meta.label}: «${input.title.trim()}».`,
    actor_user_id: profile.user_id,
    payload: { evidence_id: data.id, template_key: input.templateKey, doc_type: tipo.value },
  }])

  revalidatePath(`/inventario/${input.aiSystemId}/expediente/${input.templateKey}`)
  return { id: String(data.id) }
}


// ── Notificación del documento aprobado (B17b) ──────────────────────────────
//
// La FRIA aprobada se notifica a la autoridad de vigilancia del mercado (Art.
// 27.3) y la ficha para el registro UE se presenta en la base de datos de la UE
// (Art. 49). Fluxion no lo envía: deja constancia de cuándo, a quién y con qué
// referencia. Solo de la versión aprobada; no se edita ni se borra.

export type DocumentNotificationRow = {
  id: string
  authority: string
  notifiedAt: string
  reference: string | null
  notes: string | null
  createdByName: string | null
  createdAt: string
}

export async function listDocumentNotifications(documentId: string): Promise<DocumentNotificationRow[]> {
  const { profile, fluxion } = await ctx()
  if (!profile) return []
  const { data } = await fluxion
    .from('document_notifications')
    .select('id, authority, notified_at, reference, notes, created_at, created_by')
    .eq('document_id', documentId)
    .order('notified_at', { ascending: false })
  const rows = (data ?? []) as Array<Record<string, unknown>>
  const autores = Array.from(new Set(rows.map((r) => r.created_by).filter(Boolean))) as string[]
  const { data: perfiles } = autores.length
    ? await fluxion.from('profiles').select('id, full_name').in('id', autores)
    : { data: [] }
  const nombre = new Map(((perfiles ?? []) as Array<{ id: string; full_name: string | null }>).map((p) => [p.id, p.full_name]))
  return rows.map((r) => ({
    id: String(r.id),
    authority: String(r.authority),
    notifiedAt: String(r.notified_at),
    reference: (r.reference as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    createdByName: r.created_by ? nombre.get(String(r.created_by)) ?? null : null,
    createdAt: String(r.created_at),
  }))
}

export async function addDocumentNotification(input: {
  documentId: string
  aiSystemId: string
  templateKey: string
  authority: string
  notifiedAt: string
  reference?: string | null
  notes?: string | null
}): Promise<{ success: true } | { error: string }> {
  const { error, profile, fluxion } = await ctx()
  if (error || !profile) return { error: error ?? 'No autenticado' }
  if (!isTemplateKey(input.templateKey) || !DOCUMENT_NOTIFICATION[input.templateKey]) {
    return { error: 'Este documento no se notifica a ninguna autoridad.' }
  }
  if (!input.authority?.trim()) return { error: 'Indica a qué autoridad o registro se notificó.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.notifiedAt ?? '')) return { error: 'Indica la fecha de la notificación.' }
  if (input.notifiedAt > new Date().toISOString().slice(0, 10)) {
    return { error: 'La fecha de la notificación no puede ser posterior a hoy.' }
  }

  const { data: doc } = await fluxion
    .from('documents')
    .select('id, organization_id, ai_system_id, status, version, template_key')
    .eq('id', input.documentId)
    .maybeSingle()
  if (!doc) return { error: 'Documento no encontrado.' }
  if (doc.status !== 'approved') return { error: 'Solo se registra la notificación de un documento aprobado.' }

  const { error: insErr } = await fluxion.from('document_notifications').insert({
    organization_id: doc.organization_id,
    document_id: doc.id,
    authority: input.authority.trim(),
    notified_at: input.notifiedAt,
    reference: input.reference?.trim() || null,
    notes: input.notes?.trim() || null,
    created_by: profile.id,
  })
  if (insErr) return { error: dbError(insErr, 'No se pudo registrar la notificación.') }

  const meta = DOCUMENT_NOTIFICATION[input.templateKey]!
  if (doc.ai_system_id) {
    await insertAiSystemHistoryEvents(fluxion, [{
      ai_system_id: doc.ai_system_id,
      organization_id: doc.organization_id,
      event_type: 'document_notified',
      event_title: meta.title,
      event_summary: `${templateMeta(doc.template_key).label} · versión ${doc.version ?? 1}: ${input.authority.trim()}, ${input.notifiedAt}`
        + (input.reference?.trim() ? ` (referencia ${input.reference.trim()})` : '') + '.',
      actor_user_id: profile.user_id,
      payload: { document_id: doc.id, template_key: doc.template_key, notified_at: input.notifiedAt, reference: input.reference?.trim() || null },
    }])
  }

  revalidatePath(`/inventario/${input.aiSystemId}/expediente/${input.templateKey}`)
  return { success: true }
}
