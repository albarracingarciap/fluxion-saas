import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import {
  callClassificationService,
  classifyWithCatalog,
  enginePayload,
  fallbackFieldsFromRow,
  loadAiActCatalog,
} from '@/lib/ai-act/server'
import type { AiActInputs, FallbackFields } from '@/lib/ai-act'

/**
 * Reclasificación desde **✏ Revisar clasificación** (B13a).
 *
 * El servidor clasifica con el motor único: los supuestos AI Act del sistema
 * si los tiene; si no, los campos de la ventana sobre los de la ficha. El
 * servicio Python solo compara con la clasificación vigente y abre la
 * conciliación. Los campos de la ventana viajan en el evento y se guardan en
 * la ficha al conciliar.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { systemId: string } }
) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { fields?: Partial<FallbackFields> & Record<string, unknown>; review_notes?: string }

  // RLS: solo se lee si el sistema es de la organización del usuario.
  const { data: row } = await createFluxionClient()
    .from('ai_systems')
    .select('*')
    .eq('id', params.systemId)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'Sistema no encontrado' }, { status: 404 })

  const fields: FallbackFields = { ...fallbackFieldsFromRow(row), ...(body.fields ?? {}) }
  const classification = classifyWithCatalog({
    inputs: (row.aiact_inputs as AiActInputs | null) ?? null,
    fields,
    roles: (row.value_chain_roles as string[] | null) ?? [],
    catalog: await loadAiActCatalog(),
  })

  let res
  try {
    res = await callClassificationService({
      path: `/api/v1/systems/${params.systemId}/reclassify`,
      accessToken: session.access_token,
      body: {
        classification: enginePayload(classification),
        factors: body.fields ?? {},
        review_notes: body.review_notes,
      },
    })
  } catch (err) {
    console.error('[reclassify] No se pudo conectar con el servicio de clasificación:', err)
    return NextResponse.json({ error: 'No se pudo conectar con el servicio de clasificación.' }, { status: 503 })
  }
  return NextResponse.json(res.data, { status: res.ok ? 200 : res.status })
}
