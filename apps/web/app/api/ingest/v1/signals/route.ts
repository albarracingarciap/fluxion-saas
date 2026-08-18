import { randomUUID } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'

import { requireApiKey } from '@/lib/auth/api-key'
import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import { dispatchSignal } from '@/lib/signals/dispatch'
import { parseBody, signalInputSchema, formatIssues } from '@/lib/signals/schema'
import type { SignalRow } from '@/lib/signals/types'

/**
 * POST /api/ingest/v1/signals
 *
 * Punto de entrada único de los módulos. Acepta una señal o un array de hasta
 * 100. Devuelve resultado POR ELEMENTO: si una señal del lote es inválida, las
 * demás entran igualmente. Un módulo que envía 50 no debe perderlas todas —ni
 * reintentarlas todas— porque una traía un campo mal.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ItemResult = {
  index: number
  accepted: boolean
  duplicate: boolean
  signal_id: string | null
  error?: string
}

export async function POST(request: NextRequest) {
  const auth = await requireApiKey(request, 'signals:write')
  if ('response' in auth) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'El cuerpo no es JSON válido.' },
      { status: 400 }
    )
  }

  const parsed = parseBody(body)
  if ('error' in parsed) {
    return NextResponse.json({ error: 'invalid_body', message: parsed.error }, { status: 400 })
  }

  const admin = createNoCacheAdminClient()

  // ── Validación por elemento ─────────────────────────────────────────────
  const results: ItemResult[] = []
  const valid: Array<{ index: number; id: string; data: Record<string, unknown> }> = []

  parsed.items.forEach((item, index) => {
    const check = signalInputSchema.safeParse(item)
    if (!check.success) {
      results[index] = {
        index,
        accepted: false,
        duplicate: false,
        signal_id: null,
        error: formatIssues(check.error),
      }
      return
    }

    const s = check.data
    // El id se genera aquí y no en la base de datos para poder emparejar de
    // vuelta qué filas se insertaron y cuáles eran duplicadas.
    const id = randomUUID()

    valid.push({
      index,
      id,
      data: {
        id,
        organization_id: auth.organizationId,   // NUNCA del cuerpo: viene de la clave
        api_key_id:      auth.keyId,
        system_id:       s.system_id ?? null,
        source_module:   s.source_module,
        source_ref:      s.source_ref ?? null,
        signal_type:     s.signal_type,
        severity:        s.severity,
        title:           s.title,
        summary:         s.summary ?? null,
        metric_name:     s.metric_name ?? null,
        metric_value:    s.metric_value ?? null,
        threshold:       s.threshold ?? null,
        payload:         s.payload ?? {},
        occurred_at:     s.occurred_at ?? new Date().toISOString(),
        dedupe_key:      s.dedupe_key ?? null,
      },
    })
  })

  // ── El system_id es entrada no confiable ────────────────────────────────
  // La clave determina la organización, pero el system_id lo elige quien llama.
  // Sin esta comprobación, cualquiera con una clave válida podría colgar señales
  // falsas de los sistemas de otro cliente pasando su UUID.
  const systemIds = Array.from(
    new Set(valid.map((v) => v.data.system_id).filter((x): x is string => typeof x === 'string'))
  )

  if (systemIds.length > 0) {
    const { data: owned } = await admin
      .from('ai_systems')
      .select('id')
      .eq('organization_id', auth.organizationId)
      .in('id', systemIds)

    const ownedIds = new Set((owned ?? []).map((r: { id: string }) => r.id))

    for (let i = valid.length - 1; i >= 0; i--) {
      const sid = valid[i].data.system_id as string | null
      if (sid && !ownedIds.has(sid)) {
        results[valid[i].index] = {
          index: valid[i].index,
          accepted: false,
          duplicate: false,
          signal_id: null,
          error: 'system_id no pertenece a la organización de esta clave.',
        }
        valid.splice(i, 1)
      }
    }
  }

  // ── Inserción idempotente ───────────────────────────────────────────────
  let insertedIds = new Set<string>()

  if (valid.length > 0) {
    const { data: inserted, error } = await admin
      .from('signals')
      .upsert(
        valid.map((v) => v.data),
        { onConflict: 'organization_id,dedupe_key', ignoreDuplicates: true }
      )
      .select('*')

    if (error) {
      console.error('[ingest/signals] insert:', error)
      return NextResponse.json(
        { error: 'insert_failed', message: error.message },
        { status: 500 }
      )
    }

    const rows = (inserted ?? []) as SignalRow[]
    insertedIds = new Set(rows.map((r) => r.id))

    for (const v of valid) {
      const wasInserted = insertedIds.has(v.id)
      results[v.index] = {
        index: v.index,
        accepted: wasInserted,
        duplicate: !wasInserted,
        signal_id: wasInserted ? v.id : null,
      }
    }

    // ── Despacho ──────────────────────────────────────────────────────────
    // La señal ya está guardada, que es lo importante. Un fallo despachando se
    // registra pero no invalida la ingesta ni provoca que el módulo reintente.
    for (const row of rows) {
      try {
        await dispatchSignal(admin, row)
      } catch (err) {
        console.error(`[ingest/signals] despacho de ${row.id}:`, err)
      }
    }
  }

  const accepted = results.filter((r) => r?.accepted).length
  const duplicates = results.filter((r) => r?.duplicate).length
  const rejected = results.filter((r) => r && !r.accepted && !r.duplicate).length

  return NextResponse.json({
    received: parsed.items.length,
    accepted,
    duplicates,
    rejected,
    results,
  })
}
