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

const ROLES_CAN_SUBMIT = new Set(['sgai_manager', 'caio', 'dpo', 'compliance_analyst', 'org_admin'])
const ROLES_CAN_APPROVE = new Set(['org_admin', 'sgai_manager', 'caio'])

export async function transitionSoAStatus(
  newStatus: 'under_review' | 'approved' | 'draft'
) {
  const adminClient = createAdminFluxionClient()
  const fluxion = createFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  // Fetch current user role
  const { data: profile } = await fluxion
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole: string = profile?.role ?? ''

  // Role-gate transitions
  if (newStatus === 'under_review' && !ROLES_CAN_SUBMIT.has(userRole)) {
    return { error: 'No tienes permisos para enviar el documento a revisión.' }
  }
  if (newStatus === 'approved' && !ROLES_CAN_APPROVE.has(userRole)) {
    return { error: 'No tienes permisos para aprobar el documento SoA.' }
  }
  if (newStatus === 'draft' && !ROLES_CAN_APPROVE.has(userRole)) {
    return { error: 'No tienes permisos para reabrir el documento SoA.' }
  }

  // Hard block: can't approve with incomplete controls
  if (newStatus === 'approved') {
    const { data: incomplete } = await adminClient
      .from('organization_soa_controls')
      .select('control_code', { count: 'exact', head: false })
      .eq('organization_id', membership.organization_id)
      .eq('is_applicable', true)
      .or('justification.is.null,justification.eq.')

    if (incomplete && incomplete.length > 0) {
      return {
        error: `No se puede aprobar: ${incomplete.length} control${incomplete.length > 1 ? 'es aplicables carecen' : ' aplicable carece'} de justificación (${incomplete.map((c) => c.control_code).slice(0, 5).join(', ')}${incomplete.length > 5 ? '…' : ''}).`,
      }
    }
  }

  // Fetch current status for audit log
  const { data: currentMeta } = await adminClient
    .from('organization_soa_metadata')
    .select('lifecycle_status, approved_by')
    .eq('organization_id', membership.organization_id)
    .maybeSingle()

  const fromStatus: string | null = currentMeta?.lifecycle_status ?? null

  // Build update payload
  const updatePayload: Record<string, unknown> = { lifecycle_status: newStatus }
  if (newStatus === 'approved') {
    updatePayload.approved_at = new Date().toISOString().split('T')[0]
    if (!currentMeta?.approved_by) {
      const { data: prof } = await fluxion
        .from('profiles')
        .select('display_name, full_name')
        .eq('id', user.id)
        .single()
      updatePayload.approved_by = (prof?.display_name || prof?.full_name || '').trim() || 'Desconocido'
    }
  }

  const { error } = await adminClient
    .from('organization_soa_metadata')
    .upsert(
      { organization_id: membership.organization_id, ...updatePayload },
      { onConflict: 'organization_id', ignoreDuplicates: false }
    )

  if (error) {
    console.error('Error transitioning SoA status:', error)
    return { error: 'No se pudo actualizar el estado del documento.' }
  }

  // Audit log — fire and forget (don't block on failure)
  adminClient
    .from('soa_lifecycle_log')
    .insert({
      organization_id: membership.organization_id,
      actor_user_id: user.id,
      from_status: fromStatus,
      to_status: newStatus,
    })
    .then(({ error: logError }) => {
      if (logError) console.error('Error writing SoA lifecycle log:', logError)
    })

  revalidatePath('/plantillas/soa-iso42001')
  return { success: true }
}

export async function analyzeSoAFromAisia() {
  const adminClient = createAdminFluxionClient()
  const fluxion = createFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  // 1. Get scope tags from metadata
  const { data: meta } = await adminClient
    .from('organization_soa_metadata')
    .select('scope_system_tags')
    .eq('organization_id', membership.organization_id)
    .maybeSingle()

  const scopeTags: string[] = (meta?.scope_system_tags as string[] | null) ?? []

  // 2. Fetch in-scope AI systems
  const { data: allSystems } = await fluxion
    .from('ai_systems')
    .select('id, name, tags')
    .eq('organization_id', membership.organization_id)

  const inScopeSystems = (allSystems ?? []).filter((s) => {
    if (scopeTags.length === 0) return true
    return ((s.tags as string[] | null) ?? []).some((t) => scopeTags.includes(t))
  })

  if (inScopeSystems.length === 0) {
    return { error: 'No hay sistemas en alcance. Define tags de alcance en la cabecera del SoA primero.' }
  }

  const inScopeIds = inScopeSystems.map((s) => s.id as string)

  // 3. Fetch approved AISIA assessments with their sections
  const { data: assessments } = await fluxion
    .from('aisia_assessments')
    .select('id, ai_system_id, aisia_sections(section_code, data)')
    .eq('organization_id', membership.organization_id)
    .eq('status', 'approved')
    .in('ai_system_id', inScopeIds)

  if (!assessments || assessments.length === 0) {
    return { error: 'No hay evaluaciones AISIA aprobadas para los sistemas en alcance. Aprueba al menos una AISIA antes de usar esta función.' }
  }

  // 4. Build compact context per system
  const nameMap = new Map(inScopeSystems.map((s) => [s.id as string, s.name as string]))
  const b = (v: unknown) => (v === true ? 'Sí' : v === false ? 'No' : '—')

  const systemContexts = assessments.map((a) => {
    const sections = (a.aisia_sections as { section_code: string; data: Record<string, unknown> }[]) ?? []
    const s = (code: string) => sections.find((x) => x.section_code === code)?.data ?? {}
    const s1 = s('S1'), s2 = s('S2'), s3 = s('S3'), s4 = s('S4'), s5 = s('S5'), s6 = s('S6')
    return [
      `SISTEMA: ${nameMap.get(a.ai_system_id as string) ?? '—'}`,
      `Uso previsto: ${s1.intended_use ?? '—'}`,
      `Usos prohibidos: ${s1.prohibited_uses ?? '—'}`,
      `Totalmente automatizado: ${b(s1.fully_automated)}`,
      `Interactúa directamente con personas: ${b(s1.interacts_persons)}`,
      `Contexto de despliegue: ${s1.deployment_context ?? '—'}`,
      `Stack tecnológico: ${s1.tech_stack ?? '—'}`,
      `Procesa datos personales: ${b(s2.processes_personal_data)}`,
      `Categorías especiales (Art.9 RGPD): ${s2.special_categories_description ?? 'Ninguna'}`,
      `Fuentes de datos: ${s2.data_sources_description ?? '—'}`,
      `Estado DPIA: ${s2.dpia_status ?? '—'}`,
      `Resumen de riesgos: ${s3.risk_summary ?? '—'}`,
      `Plan de monitoreo: ${s4.monitoring_plan ?? '—'}`,
      `Medidas de tratamiento: ${s4.treatment_summary ?? '—'}`,
      `Riesgo residual: ${s4.residual_risk_description ?? '—'}`,
      `Severidad impacto en personas: ${s5.impact_severity ?? '—'}`,
      `Grupos vulnerables afectados: ${b(s5.vulnerable_groups_affected)}`,
      `Derechos impactados: ${s5.rights_impacted ?? '—'}`,
      `Salvaguardas: ${s5.safeguards ?? '—'}`,
      `Impacto social: ${s6.social_impact_description ?? '—'}`,
      `Consideraciones ambientales: ${s6.environmental_consideration ?? '—'}`,
    ].join('\n')
  }).join('\n\n---\n\n')

  // 5. Build controls list
  const controlsList = ISO_42001_CONTROLS
    .map((c) => `${c.id} | ${c.title}: ${c.description}`)
    .join('\n')

  const systemPrompt = `Eres un experto certificado en ISO/IEC 42001:2023. Analiza los datos de evaluaciones AISIA de sistemas de IA y determina qué controles del Anexo A deben incluirse en la Declaración de Aplicabilidad (SoA).

Reglas:
1. Marca APPLICABLE si los sistemas requieren ese control según su perfil.
2. Proporciona una razón breve y específica basada en los datos (máx. 2 frases, español profesional).
3. Responde ÚNICAMENTE con un objeto JSON con clave "suggestions" que contiene un array.
4. Formato: {"suggestions":[{"control_code":"A.X.Y","applicable":true,"reason":"..."}]}
5. Incluye los ${ISO_42001_CONTROLS.length} controles sin omitir ninguno.`

  const userPrompt = `EVALUACIONES AISIA EN ALCANCE:\n\n${systemContexts}\n\n---\nCONTROLES ISO 42001 ANEXO A:\n\n${controlsList}\n\nGenera el JSON:`

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
        max_completion_tokens: 4000,
      }),
    })

    const data = await response.json()
    if (data.error) {
      console.error('OpenAI Error:', data.error)
      return { error: 'Error en el motor de IA: ' + (data.error.message ?? 'Error desconocido') }
    }

    const raw = data.choices[0].message.content.trim()
    const parsed = JSON.parse(raw)
    const suggestions: { control_code: string; applicable: boolean; reason: string }[] =
      Array.isArray(parsed) ? parsed : (parsed.suggestions ?? [])

    return { suggestions, systemCount: assessments.length }
  } catch (err) {
    console.error('AISIA analysis error:', err)
    return { error: 'No se pudo completar el análisis. Inténtalo de nuevo.' }
  }
}

export async function applySoASuggestions(
  items: { id: string; isApplicable: boolean; justification: string | null }[]
) {
  const adminClient = createAdminFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')
  if (items.length === 0) return { success: true }

  const results = await Promise.all(
    items.map((item) =>
      adminClient
        .from('organization_soa_controls')
        .update({ is_applicable: item.isApplicable, justification: item.justification })
        .eq('id', item.id)
        .eq('organization_id', membership.organization_id)
    )
  )

  const firstError = results.find((r) => r.error)
  if (firstError?.error) {
    console.error('Error applying suggestions:', firstError.error)
    return { error: 'No se pudieron aplicar todas las sugerencias.' }
  }

  revalidatePath('/plantillas/soa-iso42001')
  return { success: true }
}

export async function checkSoACompleteness() {
  const adminClient = createAdminFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  const { data, error } = await adminClient
    .from('organization_soa_controls')
    .select('control_code')
    .eq('organization_id', membership.organization_id)
    .eq('is_applicable', true)
    .or('justification.is.null,justification.eq.')

  if (error) {
    console.error('Error checking SoA completeness:', error)
    return { error: 'No se pudo verificar la completitud.' }
  }

  const missing = (data ?? []).map((r) => r.control_code as string)
  return { missing }
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
      profiles:actor_user_id ( full_name, display_name )
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

export async function getSoALifecycleLog() {
  const adminClient = createAdminFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  const { data, error } = await adminClient
    .from('soa_lifecycle_log')
    .select(`
      id,
      from_status,
      to_status,
      created_at,
      profiles:actor_user_id ( full_name, display_name )
    `)
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    console.error('Error fetching SoA lifecycle log:', error)
    return { error: 'No se pudo cargar el historial del documento.' }
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


