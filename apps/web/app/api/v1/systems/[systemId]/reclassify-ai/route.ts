import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import {
  classifyWithCatalog,
  enginePayload,
  fallbackFieldsFromRow,
  loadAiActCatalog,
} from '@/lib/ai-act/server'
import type { AiActInputs, FallbackFields } from '@/lib/ai-act'

const AGENT_URL = process.env.AGENT_SERVER_URL || 'http://localhost:8001'

/**
 * **Clasificar con IA** (B13a): el agente clasifica con RAG y el resultado del
 * motor único viaja como referencia para detectar divergencias.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { systemId: string } }
) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: row } = await createFluxionClient()
    .from('ai_systems')
    .select('*')
    .eq('id', params.systemId)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'Sistema no encontrado' }, { status: 404 })

  const fields: FallbackFields = fallbackFieldsFromRow(row)
  const reference = enginePayload(classifyWithCatalog({
    inputs: (row.aiact_inputs as AiActInputs | null) ?? null,
    fields,
    roles: (row.value_chain_roles as string[] | null) ?? [],
    catalog: await loadAiActCatalog(),
  }))

  let agentResponse: Response
  try {
    agentResponse = await fetch(
      `${AGENT_URL}/api/v1/systems/${params.systemId}/reclassify/ai`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reference }),
      }
    )
  } catch (err) {
    console.error('[reclassify-ai] No se pudo conectar al agente:', err)
    return NextResponse.json(
      { error: 'No se pudo conectar con el agente de clasificación. ¿Está arrancado en el puerto 8001?' },
      { status: 503 }
    )
  }

  let data: unknown
  try {
    data = await agentResponse.json()
  } catch {
    return NextResponse.json(
      { error: `El agente devolvió una respuesta inválida (HTTP ${agentResponse.status})` },
      { status: 502 }
    )
  }

  if (!agentResponse.ok) {
    return NextResponse.json(data, { status: agentResponse.status })
  }

  return NextResponse.json(data)
}
