'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient, createTelemetryClient } from '@/lib/supabase/fluxion'

/**
 * Tarifas de modelos.
 *
 * Dos niveles: el catálogo de Fluxion (`organization_id` nulo, solo lectura) y
 * las tarifas propias de la organización, que prevalecen sobre él. Un cliente
 * con precios negociados los pone aquí sin tocar lo que ven los demás.
 */

export type PriceRow = {
  id: string
  provider: string
  model: string
  effective_from: string
  input_per_million: number
  output_per_million: number
  cached_input_per_million: number | null
  reasoning_per_million: number | null
  currency: string
  source: string | null
  isCatalog: boolean
  /** Anulada por una tarifa propia más específica. */
  overridden: boolean
}

export type MissingPrice = {
  provider: string
  model: string
  calls: number
  tokensIn: number
  tokensOut: number
}

async function ctx() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const, profile: null }

  const fluxion = createFluxionClient()
  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile) return { error: 'No autenticado' as const, profile: null }
  return { error: null, profile }
}

export async function listPrices(): Promise<{ prices: PriceRow[]; missing: MissingPrice[] }> {
  const { profile } = await ctx()
  if (!profile) return { prices: [], missing: [] }

  const telemetry = createTelemetryClient()

  // RLS devuelve el catálogo y lo propio; no hace falta filtrar aquí.
  const { data } = await telemetry
    .from('model_prices')
    .select('*')
    .order('provider')
    .order('model')
    .order('effective_from', { ascending: false })

  const filas = (data ?? []) as Array<Record<string, unknown>>

  // Qué combinaciones tienen tarifa propia, para marcar la del catálogo como
  // anulada en vez de enseñar dos precios sin explicar cuál manda.
  const propias = new Set(
    filas
      .filter((f) => f.organization_id)
      .map((f) => `${f.provider}/${f.model}`),
  )

  const prices: PriceRow[] = filas.map((f) => {
    const isCatalog = !f.organization_id
    return {
      id: String(f.id),
      provider: String(f.provider),
      model: String(f.model),
      effective_from: String(f.effective_from),
      input_per_million: Number(f.input_per_million),
      output_per_million: Number(f.output_per_million),
      cached_input_per_million: f.cached_input_per_million != null ? Number(f.cached_input_per_million) : null,
      reasoning_per_million: f.reasoning_per_million != null ? Number(f.reasoning_per_million) : null,
      currency: String(f.currency),
      source: (f.source as string | null) ?? null,
      isCatalog,
      overridden: isCatalog && propias.has(`${f.provider}/${f.model}`),
    }
  })

  const { data: sinTarifa } = await telemetry
    .from('v_models_without_price')
    .select('provider_name, request_model, llamadas, tokens_entrada, tokens_salida')

  return {
    prices,
    missing: ((sinTarifa ?? []) as Array<Record<string, unknown>>).map((m) => ({
      provider: String(m.provider_name),
      model: String(m.request_model),
      calls: Number(m.llamadas ?? 0),
      tokensIn: Number(m.tokens_entrada ?? 0),
      tokensOut: Number(m.tokens_salida ?? 0),
    })),
  }
}

export async function savePrice(input: {
  id?: string
  provider: string
  model: string
  effectiveFrom: string
  inputPerMillion: number
  outputPerMillion: number
  cachedInputPerMillion?: number | null
  reasoningPerMillion?: number | null
  currency?: string
  source?: string
}): Promise<{ ok: true } | { error: string }> {
  const { error, profile } = await ctx()
  if (error || !profile) return { error: error ?? 'No autenticado' }

  if (!input.provider.trim() || !input.model.trim()) {
    return { error: 'Proveedor y modelo son obligatorios.' }
  }
  if (!Number.isFinite(input.inputPerMillion) || input.inputPerMillion < 0) {
    return { error: 'El precio de entrada no es válido.' }
  }
  if (!Number.isFinite(input.outputPerMillion) || input.outputPerMillion < 0) {
    return { error: 'El precio de salida no es válido.' }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom)) {
    return { error: 'La fecha de vigencia no es válida.' }
  }

  const telemetry = createTelemetryClient()

  const fila = {
    organization_id: profile.organization_id,
    provider: input.provider.trim(),
    model: input.model.trim(),
    effective_from: input.effectiveFrom,
    input_per_million: input.inputPerMillion,
    output_per_million: input.outputPerMillion,
    cached_input_per_million: input.cachedInputPerMillion ?? null,
    reasoning_per_million: input.reasoningPerMillion ?? null,
    currency: (input.currency || 'USD').toUpperCase(),
    source: input.source?.trim() || null,
  }

  const res = input.id
    ? await telemetry.from('model_prices').update(fila).eq('id', input.id)
    : await telemetry.from('model_prices').insert(fila)

  if (res.error) {
    if (res.error.code === '23505') {
      return { error: 'Ya existe una tarifa para ese modelo con esa fecha de vigencia.' }
    }
    console.error('savePrice:', res.error)
    return { error: 'No se pudo guardar la tarifa.' }
  }

  revalidatePath('/observabilidad/tarifas')
  revalidatePath('/observabilidad')
  return { ok: true }
}

export async function deletePrice(id: string): Promise<{ ok: true } | { error: string }> {
  const { error, profile } = await ctx()
  if (error || !profile) return { error: error ?? 'No autenticado' }

  const telemetry = createTelemetryClient()
  const { error: delErr } = await telemetry.from('model_prices').delete().eq('id', id)

  if (delErr) {
    console.error('deletePrice:', delErr)
    return { error: 'No se pudo borrar la tarifa. El catálogo no se puede editar.' }
  }

  revalidatePath('/observabilidad/tarifas')
  return { ok: true }
}
