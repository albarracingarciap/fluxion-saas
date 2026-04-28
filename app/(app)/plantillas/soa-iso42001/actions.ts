'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getAppAuthState } from '@/lib/auth/app-state'
import { createFluxionClient, createAdminFluxionClient } from '@/lib/supabase/fluxion'
import { ISO_42001_CONTROLS } from '@/lib/templates/iso42001-catalog'
import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history'

export async function initializeSoA(formData: FormData) {
  const adminClient = createAdminFluxionClient()
  const fluxion = createFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  // Check if SoA is already initialized — usar adminClient para ignorar RLS
  const { count } = await adminClient
    .from('organization_soa_controls')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', membership.organization_id)

  if (count && count > 0) {
    return { success: true, message: 'SoA already initialized' }
  }

  // Upsert los 38 controles (ignoreDuplicates evita el error si alguno ya existe)
  const payload = ISO_42001_CONTROLS.map((control) => ({
    organization_id: membership.organization_id,
    control_code: control.id,
    is_applicable: false,
    status: 'not_started',
  }))

  const { error } = await adminClient
    .from('organization_soa_controls')
    .upsert(payload, { onConflict: 'organization_id,control_code', ignoreDuplicates: true })

  if (error) {
    console.error('Error initializing SoA:', error)
    throw new Error('Error al inicializar SoA: ' + error.message)
  }

  revalidatePath('/plantillas/soa-iso42001')
  return { success: true }
}

export type SoAControlUpdatePayload = {
  id: string
  isApplicable: boolean
  justification: string | null
  status: string
  ownerUserId: string | null
  notes: string | null
  validationEvidenceId: string | null
  linkedSystemIds: string[]
}

export async function updateSoAControl(input: SoAControlUpdatePayload) {
  const fluxion = createFluxionClient()
  const adminClient = createAdminFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  // 1. Update main control (adminClient — RLS roto hasta migración 058)
  const { data: control, error: updateError } = await adminClient
    .from('organization_soa_controls')
    .update({
      is_applicable: input.isApplicable,
      justification: input.justification,
      status: input.status,
      owner_user_id: input.ownerUserId,
      validation_evidence_id: input.validationEvidenceId,
      notes: input.notes,
    })
    .eq('id', input.id)
    .eq('organization_id', membership.organization_id)
    .select('control_code')
    .single()

  if (updateError) {
    console.error('Error updating SoA control:', updateError)
    return { error: 'No se pudo actualizar el control.' }
  }

  // 2. Synchronize System Links (adminClient — misma razón)
  await adminClient
    .from('organization_soa_system_links')
    .delete()
    .eq('soa_control_id', input.id)

  // Insert new links
  if (input.linkedSystemIds.length > 0) {
    const linkPayload = input.linkedSystemIds.map((systemId) => ({
      soa_control_id: input.id,
      ai_system_id: systemId,
    }))

    const { error: linkError } = await adminClient
      .from('organization_soa_system_links')
      .insert(linkPayload)

    if (linkError) {
      console.error('Error synchronizing SoA system links:', linkError)
      return { error: 'No se pudieron sincronizar los sistemas vinculados.' }
    }

    // 3. Push to History
    const historyEvents = input.linkedSystemIds.map((systemId) => ({
      ai_system_id: systemId,
      organization_id: membership.organization_id,
      event_type: 'soa_control_updated',
      event_title: `Actualización de control aplicable: ${control.control_code}`,
      event_summary: `El control ${control.control_code} ha sido documentado o actualizado en la Declaración de Aplicabilidad de la organización.`,
      actor_user_id: user.id,
      payload: {
        control_id: input.id,
        control_code: control.control_code,
        status: input.status,
      },
    }))

    await insertAiSystemHistoryEvents(fluxion, historyEvents)
  }

  // 4. Record in SoA Change Log
  const { error: logError } = await fluxion.from('soa_controls_log').insert({
    soa_control_id: input.id,
    organization_id: membership.organization_id,
    actor_user_id: user.id,
    control_code: control.control_code,
    is_applicable: input.isApplicable,
    justification: input.justification,
    status: input.status,
    notes: input.notes,
    validation_evidence_id: input.validationEvidenceId,
    linked_system_ids: input.linkedSystemIds,
  })

  if (logError) {
    console.error('Error recording SoA control log:', logError)
  }

  revalidatePath('/plantillas/soa-iso42001')
  return { success: true }
}

export async function bulkUpdateApplicability(
  controlDbIds: string[],
  isApplicable: boolean
) {
  const adminClient = createAdminFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')
  if (controlDbIds.length === 0) return { success: true }

  const { error } = await adminClient
    .from('organization_soa_controls')
    .update({
      is_applicable: isApplicable,
      status: isApplicable ? 'not_started' : 'not_started',
    })
    .in('id', controlDbIds)
    .eq('organization_id', membership.organization_id)

  if (error) {
    console.error('Error in bulk update:', error)
    return { error: 'No se pudo actualizar la aplicabilidad de los controles.' }
  }

  revalidatePath('/plantillas/soa-iso42001')
  return { success: true }
}

export async function updateSoAMetadata(input: {
  version: string
  owner_name: string
  approved_by: string
  approved_by_role: string
  approved_at: string | null
  next_review_date: string | null
  scope: string
  scope_system_tags: string[]
}) {
  const { user, membership, onboardingCompleted } = await getAppAuthState()
  const adminClient = createAdminFluxionClient()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  const { error } = await adminClient
    .from('organization_soa_metadata')
    .upsert({
      organization_id: membership.organization_id,
      version: input.version,
      owner_name: input.owner_name,
      approved_by: input.approved_by,
      approved_by_role: input.approved_by_role || null,
      approved_at: input.approved_at || null,
      next_review_date: input.next_review_date || null,
      scope: input.scope,
      scope_system_tags: input.scope_system_tags,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.error('Error updating SoA metadata:', error)
    return { error: 'No se pudieron actualizar los metadatos de la cabecera.' }
  }

  revalidatePath('/plantillas/soa-iso42001')
  return { success: true }
}

export async function getSoAHistory() {
  const fluxion = createFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  const { data, error } = await fluxion
    .from('soa_controls_log')
    .select(`
      *,
      profiles:actor_user_id ( first_name, last_name )
    `)
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching SoA history:', error)
    return { error: 'No se pudo cargar el historial.' }
  }

  return { data: data || [] }
}

export async function suggestSoAJustification(input: {
  controlId: string
  linkedSystemIds: string[]
  isApplicable: boolean
}) {
  const fluxion = createFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  // 1. Get Control Title
  const control = ISO_42001_CONTROLS.find((c) => c.id === input.controlId)
  if (!control) return { error: 'Control no encontrado.' }

  // 2. Fetch Context: Linked Systems
  let systemsContext = ''
  if (input.linkedSystemIds.length > 0) {
    const { data: systems } = await fluxion
      .from('ai_systems')
      .select('name, description, intended_use')
      .in('id', input.linkedSystemIds)

    if (systems && systems.length > 0) {
      systemsContext = systems
        .map(
          (s) => `- Sistema: ${s.name}\n  Descripción: ${s.description || '—'}\n  Uso previsto: ${s.intended_use || '—'}`
        )
        .join('\n\n')
    }
  }

  // 3. Fetch Context: SoA Metadata (Scope)
  const { data: metadata } = await fluxion
    .from('organization_soa_metadata')
    .select('scope')
    .eq('organization_id', membership.organization_id)
    .single()

  const scope = metadata?.scope || 'No definido'

  // 4. Construct Prompt
  const promptGoal = input.isApplicable 
    ? 'redactar una JUTIFICACIÓN DE APLICABILIDAD' 
    : 'redactar una JUSTIFICACIÓN DE EXCLUSIÓN'

  const instructions = input.isApplicable
    ? 'Explica por qué este control es necesario basándote en los sistemas vinculados y el alcance.'
    : 'Explica por qué este control NO aplica. IMPORTANTE: Si consideras que el control DEBERÍA APLICAR debido a la naturaleza de los sistemas descritos, indícalo claramente como una advertencia experta al final de la justificación.'

  const systemPrompt = `Eres un experto en cumplimiento normativo de la ISO 42001 (Sistemas de Gestión de Inteligencia Artificial). 
Tu tarea es ${promptGoal} para un control en la Declaración de Aplicabilidad (SoA).

Reglas:
1. Sé directo, técnico y profesional.
2. ${instructions}
3. Responde solo con el texto de la justificación/exclusión, sin introducciones ni comentarios adicionales.
4. Máximo 4 frases.
5. Idioma: Español profesional.`

  const userPrompt = `CONTROL ISO 42001:
Código: ${control.id}
Título: ${control.title}

ESTADO ACTUAL: ${input.isApplicable ? 'APLICA' : 'NO APLICA (EXCLUIDO)'}

ALCANCE DE LA ORGANIZACIÓN:
${scope}

SISTEMAS DE IA VINCULADOS:
${systemsContext || 'No hay sistemas específicos vinculados.'}

Redacta la justificación:`

  // 5. Call OpenAI
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
          body: JSON.stringify({
            model: 'gpt-5.4',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            max_completion_tokens: 400,
          }),
    })

    const data = await response.json()
    
    if (data.error) {
      console.error('OpenAI Error:', data.error)
      return { error: 'Error en el motor de IA: ' + (data.error.message || 'Error desconocido') }
    }

    const suggestion = data.choices[0].message.content.trim()
    return { data: suggestion }
  } catch (err) {
    console.error('AI suggestion error:', err)
    return { error: 'No se pudo generar la sugerencia en este momento.' }
  }
}


