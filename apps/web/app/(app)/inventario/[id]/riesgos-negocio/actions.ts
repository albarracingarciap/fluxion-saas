'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'

export type BusinessRiskRow = {
  failureModeId: string
  code:          string
  name:          string
  description:   string | null
  subcategoria:  string | null
  probability:   number | null
  impact:        number | null
  exposure:      number | null
  response:      string | null
  justification: string | null
  ownerId:       string | null
  reviewDue:     string | null
  assessedAt:    string | null
}

async function contexto(aiSystemId: string) {
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

  const { data: system } = await fluxion
    .from('ai_systems')
    .select('id, name')
    .eq('organization_id', profile.organization_id)
    .eq('id', aiSystemId)
    .maybeSingle()

  if (!system) return null

  return { fluxion, profile, system }
}

export async function getBusinessRisks(aiSystemId: string): Promise<
  { sistema: string; riesgos: BusinessRiskRow[] } | { error: string }
> {
  const ctx = await contexto(aiSystemId)
  if (!ctx) return { error: 'No se encontró el sistema.' }

  const { data, error } = await ctx.fluxion
    .from('v_business_risks')
    .select('failure_mode_id, code, name, description, subcategoria, probability, impact, exposure, response, justification, owner_id, review_due, assessed_at')
    .eq('ai_system_id', aiSystemId)

  if (error) return { error: 'No se pudieron leer los riesgos: ' + error.message }

  const riesgos: BusinessRiskRow[] = (data ?? []).map((r: Record<string, unknown>) => ({
    failureModeId: String(r.failure_mode_id),
    code:          String(r.code),
    name:          String(r.name),
    description:   (r.description as string | null) ?? null,
    subcategoria:  (r.subcategoria as string | null) ?? null,
    probability:   (r.probability as number | null) ?? null,
    impact:        (r.impact as number | null) ?? null,
    exposure:      (r.exposure as number | null) ?? null,
    response:      (r.response as string | null) ?? null,
    justification: (r.justification as string | null) ?? null,
    ownerId:       (r.owner_id as string | null) ?? null,
    reviewDue:     (r.review_due as string | null) ?? null,
    assessedAt:    (r.assessed_at as string | null) ?? null,
  }))

  // Los valorados primero y por exposición; los pendientes al final. Lo que hay
  // que mirar va arriba, y lo que falta por hacer se ve de un vistazo abajo.
  riesgos.sort((a, b) => {
    if (a.exposure === null && b.exposure === null) return a.code.localeCompare(b.code)
    if (a.exposure === null) return 1
    if (b.exposure === null) return -1
    return b.exposure - a.exposure
  })

  return { sistema: ctx.system.name, riesgos }
}

export async function saveBusinessRisk(input: {
  aiSystemId:    string
  failureModeId: string
  probability:   number
  impact:        number
  response:      'mitigar' | 'aceptar' | 'transferir' | 'evitar'
  justification: string
  reviewDue?:    string | null
}): Promise<{ success: true } | { error: string }> {
  const ctx = await contexto(input.aiSystemId)
  if (!ctx) return { error: 'No se encontró el sistema.' }

  if (input.probability < 1 || input.probability > 5 || input.impact < 1 || input.impact > 5) {
    return { error: 'Probabilidad e impacto tienen que estar entre 1 y 5.' }
  }

  // La única exigencia que se hereda del lado regulatorio, y por buen motivo:
  // aceptar un riesgo sin decir por qué es firmar en blanco.
  if (input.response === 'aceptar' && !input.justification.trim()) {
    return { error: 'Aceptar un riesgo exige decir por qué se acepta.' }
  }

  const { error } = await ctx.fluxion
    .from('business_risk_assessments')
    .upsert({
      organization_id: ctx.profile.organization_id,
      ai_system_id:    input.aiSystemId,
      failure_mode_id: input.failureModeId,
      probability:     input.probability,
      impact:          input.impact,
      response:        input.response,
      justification:   input.justification.trim() || null,
      review_due:      input.reviewDue || null,
      created_by:      ctx.profile.id,
    }, { onConflict: 'ai_system_id,failure_mode_id' })

  if (error) return { error: 'No se pudo guardar: ' + error.message }

  revalidatePath(`/inventario/${input.aiSystemId}/riesgos-negocio`)
  return { success: true }
}

export async function clearBusinessRisk(input: {
  aiSystemId:    string
  failureModeId: string
}): Promise<{ success: true } | { error: string }> {
  const ctx = await contexto(input.aiSystemId)
  if (!ctx) return { error: 'No se encontró el sistema.' }

  const { error } = await ctx.fluxion
    .from('business_risk_assessments')
    .delete()
    .eq('ai_system_id', input.aiSystemId)
    .eq('failure_mode_id', input.failureModeId)

  if (error) return { error: 'No se pudo retirar: ' + error.message }

  revalidatePath(`/inventario/${input.aiSystemId}/riesgos-negocio`)
  return { success: true }
}
