'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient, createTelemetryClient } from '@/lib/supabase/fluxion'

/**
 * Presupuestos de gasto en IA.
 *
 * Solo hay uno vivo por ámbito —organización o sistema—: dos presupuestos para
 * lo mismo es la forma más rápida de que uno avise y el otro no, sin que nadie
 * sepa cuál rige. Lo garantiza un índice único parcial en la base de datos.
 */

export type BudgetRow = {
  id: string
  scope: 'organization' | 'system'
  ai_system_id: string | null
  system_name: string | null
  amount: number
  currency: string
  alert_at_pct: number[]
  spent: number
  pct: number
  calls: number
  calls_costed: number
}

async function ctx() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const, profile: null }

  const fluxion = createFluxionClient()
  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return { error: 'No autenticado' as const, profile: null }
  return { error: null, profile }
}

export async function listBudgets(): Promise<BudgetRow[]> {
  const { profile } = await ctx()
  if (!profile) return []

  const telemetry = createTelemetryClient()
  const fluxion = createFluxionClient()

  const [{ data: budgets }, { data: estados }] = await Promise.all([
    telemetry.from('cost_budgets').select('*').eq('is_active', true),
    telemetry.from('v_budget_status').select('*'),
  ])

  const porId = new Map(
    ((estados ?? []) as Array<Record<string, unknown>>).map((e) => [String(e.budget_id), e]),
  )

  const ids = (budgets ?? []).map((b) => b.ai_system_id).filter(Boolean) as string[]
  const nombres = new Map<string, string>()
  if (ids.length) {
    const { data: sistemas } = await fluxion.from('ai_systems').select('id, name').in('id', ids)
    for (const s of sistemas ?? []) nombres.set(String(s.id), String(s.name))
  }

  return ((budgets ?? []) as Array<Record<string, unknown>>).map((b) => {
    const estado = porId.get(String(b.id))
    return {
      id: String(b.id),
      scope: b.scope as 'organization' | 'system',
      ai_system_id: (b.ai_system_id as string | null) ?? null,
      system_name: b.ai_system_id ? nombres.get(String(b.ai_system_id)) ?? null : null,
      amount: Number(b.amount),
      currency: String(b.currency),
      alert_at_pct: (b.alert_at_pct ?? []) as number[],
      spent: Number(estado?.spent ?? 0),
      pct: Number(estado?.pct ?? 0),
      calls: Number(estado?.calls ?? 0),
      calls_costed: Number(estado?.calls_costed ?? 0),
    }
  })
}

export async function saveBudget(input: {
  id?: string
  scope: 'organization' | 'system'
  aiSystemId?: string | null
  amount: number
  currency?: string
  alertAtPct?: number[]
}): Promise<{ ok: true } | { error: string }> {
  const { error, profile } = await ctx()
  if (error || !profile) return { error: error ?? 'No autenticado' }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: 'El importe debe ser mayor que cero.' }
  }
  if (input.scope === 'system' && !input.aiSystemId) {
    return { error: 'Elige el sistema al que aplica el presupuesto.' }
  }

  const umbrales = (input.alertAtPct?.length ? input.alertAtPct : [50, 80, 100])
    .filter((u) => Number.isFinite(u) && u > 0 && u <= 500)
    .sort((a, b) => a - b)

  const telemetry = createTelemetryClient()

  const fila = {
    organization_id: profile.organization_id,
    scope: input.scope,
    ai_system_id: input.scope === 'system' ? input.aiSystemId : null,
    amount: input.amount,
    currency: input.currency || 'USD',
    alert_at_pct: umbrales,
    created_by: profile.id,
    updated_at: new Date().toISOString(),
  }

  const res = input.id
    ? await telemetry.from('cost_budgets').update(fila).eq('id', input.id)
    : await telemetry.from('cost_budgets').insert(fila)

  if (res.error) {
    // El índice único parcial da un error críptico; se traduce.
    if (res.error.code === '23505') {
      return { error: 'Ya existe un presupuesto activo para ese ámbito.' }
    }
    console.error('saveBudget:', res.error)
    return { error: 'No se pudo guardar el presupuesto.' }
  }

  revalidatePath('/observabilidad/presupuestos')
  revalidatePath('/observabilidad')
  return { ok: true }
}

export async function deleteBudget(id: string): Promise<{ ok: true } | { error: string }> {
  const { error, profile } = await ctx()
  if (error || !profile) return { error: error ?? 'No autenticado' }

  const telemetry = createTelemetryClient()
  const { error: delErr } = await telemetry.from('cost_budgets').delete().eq('id', id)

  if (delErr) {
    console.error('deleteBudget:', delErr)
    return { error: 'No se pudo borrar el presupuesto.' }
  }

  revalidatePath('/observabilidad/presupuestos')
  return { ok: true }
}

export async function getSystemsForBudget(): Promise<Array<{ id: string; name: string }>> {
  const { profile } = await ctx()
  if (!profile) return []

  const fluxion = createFluxionClient()
  const { data } = await fluxion.from('ai_systems').select('id, name').order('name')
  return ((data ?? []) as Array<{ id: string; name: string }>)
}
