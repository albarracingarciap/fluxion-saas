'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { coherenceErrors, deriveTitle, missingRequired, type Answers } from '@/lib/preliminary-questionnaire/schema'
import { answersToInputs, answersToRoles } from '@/lib/preliminary-questionnaire/to-aiact'
import { classifyWithCatalog, loadAiActCatalog } from '@/lib/ai-act/server'

export type QuestionnaireSummary = {
  id: string
  title: string
  status: 'borrador' | 'completado'
  projectLead: string | null
  updatedAt: string
  /** Clasificación preliminar guardada al completar (B13b): etiqueta y fundamento. */
  classificationLabel: string | null
  classificationBasis: string | null
}

export type QuestionnaireDetail = QuestionnaireSummary & { answers: Answers }



function clasificacionGuardada(c: unknown): { classificationLabel: string | null; classificationBasis: string | null } {
  const display = (c as { result?: { display?: { label?: string; basis?: string } } } | null)?.result?.display
  return { classificationLabel: display?.label ?? null, classificationBasis: display?.basis ?? null }
}

async function contexto() {
  const supabase = createClient()
  const fluxion = createFluxionClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return null
  return { fluxion, profile }
}

export async function listQuestionnaires(): Promise<
  { items: QuestionnaireSummary[] } | { error: string }
> {
  const ctx = await contexto()
  if (!ctx) return { error: 'No se encontró la organización del usuario.' }

  const { data, error } = await ctx.fluxion
    .from('preliminary_questionnaires')
    .select('id, title, status, project_lead, updated_at, classification')
    .eq('organization_id', ctx.profile.organization_id)
    .order('updated_at', { ascending: false })

  if (error) return { error: 'No se pudieron leer los cuestionarios: ' + error.message }

  return {
    items: (data ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      title: String(r.title),
      status: r.status as QuestionnaireSummary['status'],
      projectLead: (r.project_lead as string | null) ?? null,
      updatedAt: String(r.updated_at),
      ...clasificacionGuardada(r.classification),
    })),
  }
}

export async function getQuestionnaire(id: string): Promise<QuestionnaireDetail | { error: string }> {
  const ctx = await contexto()
  if (!ctx) return { error: 'No se encontró la organización del usuario.' }

  const { data, error } = await ctx.fluxion
    .from('preliminary_questionnaires')
    .select('id, title, status, project_lead, answers, updated_at, classification')
    .eq('organization_id', ctx.profile.organization_id)
    .eq('id', id)
    .maybeSingle()

  if (error) return { error: 'No se pudo leer el cuestionario: ' + error.message }
  if (!data) return { error: 'No se encontró el cuestionario.' }

  return {
    id: data.id,
    title: data.title,
    status: data.status,
    projectLead: data.project_lead ?? null,
    updatedAt: data.updated_at,
    answers: (data.answers ?? {}) as Answers,
    ...clasificacionGuardada(data.classification),
  }
}

/**
 * Guarda el cuestionario. Un borrador admite cualquier respuesta parcial; para
 * completarlo hay que haber respondido lo obligatorio.
 */
export async function saveQuestionnaire(input: {
  id?: string
  answers: Answers
  complete: boolean
}): Promise<{ id: string; status: 'borrador' | 'completado' } | { error: string; missing?: { section: string; label: string }[] }> {
  const ctx = await contexto()
  if (!ctx) return { error: 'No se encontró la organización del usuario.' }

  const missing = input.complete ? missingRequired(input.answers) : []
  if (missing.length > 0) {
    return { error: `Faltan ${missing.length} campos obligatorios para completar el cuestionario.`, missing }
  }
  // Contradicciones (RN-V05, RN-V06, RN-V08): no se completa con ellas.
  const contradicciones = input.complete ? coherenceErrors(input.answers) : []
  if (contradicciones.length > 0) {
    return {
      error: 'Hay respuestas contradictorias: resuélvelas para completar el cuestionario.',
      missing: contradicciones.map((label) => ({ section: 'Coherencia', label })),
    }
  }

  // RN-V12: al completar se guarda la clasificación preliminar con la versión
  // de las reglas. Mismo motor que el alta (D1).
  let classification: Record<string, unknown> | null = null
  if (input.complete) {
    const c = classifyWithCatalog({
      inputs: answersToInputs(input.answers),
      fields: {},
      roles: answersToRoles(input.answers),
      catalog: await loadAiActCatalog(),
    })
    classification = { result: c.result, obligations: c.obligations, computed_at: new Date().toISOString() }
  }

  const status = input.complete ? 'completado' : 'borrador'
  const lead = typeof input.answers.responsable === 'string' ? input.answers.responsable.trim() : ''

  const fields = {
    title: deriveTitle(input.answers),
    status,
    project_lead: lead || null,
    answers: input.answers,
    completed_at: input.complete ? new Date().toISOString() : null,
    classification,
  }

  if (input.id) {
    const { data, error } = await ctx.fluxion
      .from('preliminary_questionnaires')
      .update(fields)
      .eq('organization_id', ctx.profile.organization_id)
      .eq('id', input.id)
      .select('id')
      .maybeSingle()

    if (error) return { error: 'No se pudo guardar: ' + error.message }
    if (!data) return { error: 'No se encontró el cuestionario.' }
    revalidatePath('/cuestionario-preliminar')
    return { id: data.id, status }
  }

  const { data, error } = await ctx.fluxion
    .from('preliminary_questionnaires')
    .insert({ ...fields, organization_id: ctx.profile.organization_id, created_by: ctx.profile.id })
    .select('id')
    .single()

  if (error) return { error: 'No se pudo guardar: ' + error.message }
  revalidatePath('/cuestionario-preliminar')
  return { id: data.id, status }
}

export async function deleteQuestionnaire(id: string): Promise<{ ok: true } | { error: string }> {
  const ctx = await contexto()
  if (!ctx) return { error: 'No se encontró la organización del usuario.' }

  const { error } = await ctx.fluxion
    .from('preliminary_questionnaires')
    .delete()
    .eq('organization_id', ctx.profile.organization_id)
    .eq('id', id)

  if (error) return { error: 'No se pudo eliminar: ' + error.message }
  revalidatePath('/cuestionario-preliminar')
  return { ok: true }
}
