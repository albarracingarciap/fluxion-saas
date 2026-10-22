import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history'
import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'

const AGENT_URL = process.env.AGENT_SERVER_URL || 'http://localhost:8001'

async function getUserToken(): Promise<string | null> {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  )
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

export async function POST(
  request: NextRequest,
  { params }: { params: { systemId: string } }
) {
  const token = await getUserToken()
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await request.json()

  const agentResponse = await fetch(
    `${AGENT_URL}/api/v1/systems/${params.systemId}/reconcile`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }
  )

  const data = await agentResponse.json()

  if (!agentResponse.ok) {
    return NextResponse.json(data, { status: agentResponse.status })
  }

  // Rastro en el historial del sistema (B13a, I10): la conciliación fija la
  // clasificación vigente y sus obligaciones.
  try {
    const fluxion = createFluxionClient()
    const { data: { user } } = await createClient().auth.getUser()
    const { data: sistema } = await fluxion
      .from('ai_systems')
      .select('organization_id, aiact_risk_level, aiact_risk_basis')
      .eq('id', params.systemId)
      .maybeSingle()
    if (sistema) {
      const version = (data as { data?: { version?: number } } | null)?.data?.version
      await insertAiSystemHistoryEvents(fluxion, [{
        ai_system_id: params.systemId,
        organization_id: sistema.organization_id,
        event_type: 'classification_reconciled',
        event_title: 'Clasificación AI Act conciliada',
        event_summary: `Queda vigente la clasificación${version ? ` v${version}` : ''}: ${sistema.aiact_risk_basis ?? sistema.aiact_risk_level}.`,
        payload: { version: version ?? null, risk_level: sistema.aiact_risk_level, event_id: body?.event_id ?? null },
        actor_user_id: user?.id ?? null,
      }])
    }
  } catch (e) {
    console.error('[reconcile] historial (no bloqueante):', e)
  }

  return NextResponse.json(data)
}
