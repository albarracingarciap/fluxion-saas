'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { composeDocument, type ComposedDocument } from '@/lib/documents/compose'
import type { TemplateOption } from '@/lib/documents/templates'
import { generateRender } from '@/lib/documents/render'
import { isTemplateKey } from '@/lib/documents/templates'

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
    .select('id, organization_id, full_name')
    .eq('user_id', user.id)
    .single()

  if (!profile) return { error: 'No autenticado' as const, profile: null, fluxion }
  return { error: null, profile, fluxion }
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
  if (doc.status === 'approved') {
    return { error: 'El expediente está aprobado. Reábrelo para poder editarlo.' }
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
    return { error: 'No se pudo guardar el apartado.' }
  }

  revalidatePath(`/inventario/${input.aiSystemId}/expediente/${input.templateKey}`)
  return { ok: true }
}

export async function setDocumentStatus(input: {
  documentId: string
  status: 'draft' | 'in_review' | 'approved'
  aiSystemId: string
  templateKey: string
}): Promise<{ ok: true } | { error: string }> {
  const { error, profile, fluxion } = await ctx()
  if (error || !profile) return { error: error ?? 'No autenticado' }

  // Un expediente no se aprueba con huecos obligatorios. Es la única puerta de
  // este módulo que impide algo, y tiene que estar aquí y no solo en la
  // pantalla: aprobar es el acto que un auditor va a mirar.
  if (input.status === 'approved') {
    const composed = await composeDocument(input.documentId)
    if (!composed) return { error: 'No se pudo componer el expediente.' }
    if (composed.gaps.length > 0) {
      const refs = composed.gaps.map((g) => g.ref).join(', ')
      return { error: `No se puede aprobar con apartados obligatorios sin cubrir: ${refs}.` }
    }
  }

  const patch: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  }
  if (input.status === 'approved') {
    patch.approved_by = profile.id
    patch.approved_at = new Date().toISOString()
  } else {
    patch.approved_by = null
    patch.approved_at = null
  }

  const { error: updErr } = await fluxion
    .from('documents')
    .update(patch)
    .eq('id', input.documentId)

  if (updErr) {
    console.error('setDocumentStatus:', updErr)
    return { error: 'No se pudo cambiar el estado del expediente.' }
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
}

export async function listDocumentRenders(documentId: string): Promise<RenderRow[]> {
  const { profile, fluxion } = await ctx()
  if (!profile) return []

  const { data } = await fluxion
    .from('document_renders')
    .select('id, rendered_at, byte_size, checksum_sha256, gaps, document_status, profiles:rendered_by(full_name)')
    .eq('document_id', documentId)
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
