'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { composeDocument, type ComposedDocument } from '@/lib/documents/compose'
import { generateRender } from '@/lib/documents/render'

/**
 * Expediente técnico del Anexo IV, por sistema.
 *
 * El documento se crea la primera vez que alguien lo abre. No hay botón de
 * "crear expediente": la obligación del artículo 11 existe desde que el sistema
 * es de alto riesgo, no desde que a alguien se le ocurre pulsar un botón.
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

export async function getOrCreateAnnexIvDocument(
  aiSystemId: string,
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
    .eq('template_key', 'annex_iv')
    .neq('status', 'superseded')
    .maybeSingle()

  let documentId = existing?.id as string | undefined

  if (!documentId) {
    // Siempre la versión activa más alta del catálogo, o la adaptación de la
    // organización si la hubiera.
    const { data: template } = await fluxion
      .from('document_templates')
      .select('version')
      .eq('key', 'annex_iv')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!template) {
      return { error: 'No hay ninguna plantilla del Anexo IV activa. Revisa las migraciones.' }
    }

    const { data: created, error: insErr } = await fluxion
      .from('documents')
      .insert({
        organization_id: system.organization_id,
        ai_system_id: aiSystemId,
        template_key: 'annex_iv',
        template_version: template.version,
        title: `Documentación técnica · ${system.name}`,
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

  revalidatePath(`/inventario/${input.aiSystemId}/anexo-iv`)
  return { ok: true }
}

export async function setDocumentStatus(input: {
  documentId: string
  status: 'draft' | 'in_review' | 'approved'
  aiSystemId: string
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

  revalidatePath(`/inventario/${input.aiSystemId}/anexo-iv`)
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

  revalidatePath(`/inventario/${input.aiSystemId}/anexo-iv`)
  return { renderId: res.renderId, gaps: res.gaps ?? 0 }
}
