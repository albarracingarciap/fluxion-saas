import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history'

const AGENT_BASE_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? 'http://localhost:8001'

const LEVEL_LABELS: Record<string, string> = {
  prohibited: 'Prohibido',
  high:       'Alto Riesgo',
  limited:    'Riesgo Limitado',
  minimal:    'Riesgo Mínimo',
  pending:    'Pendiente',
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const fluxion  = createFluxionClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: membership } = await fluxion
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
  }

  const body = await req.json()
  const { session_id, system_id, risk_level, classification_basis } = body

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) {
    return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 })
  }

  // Confirmar en FastAPI (actualiza ai_systems)
  const agentRes = await fetch(`${AGENT_BASE_URL}/api/agent/classify-system/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ session_id }),
  })

  if (!agentRes.ok) {
    const text = await agentRes.text().catch(() => '')
    return NextResponse.json({ error: text || `Error ${agentRes.status}` }, { status: agentRes.status })
  }

  const agentData = await agentRes.json()

  // Insertar historial usando el helper centralizado (que usa adminClient para esquivar RLS)
  const levelLabel = LEVEL_LABELS[risk_level] ?? risk_level ?? 'desconocido'
  const summary = classification_basis
    ? `El agente clasificó el sistema como ${levelLabel}. ${classification_basis}`
    : `El agente clasificó el sistema como ${levelLabel}.`

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id:    system_id,
      organization_id: membership.organization_id,
      event_type:      'classification_recalculated',
      event_title:     'Clasificación AI Act actualizada por agente IA',
      event_summary:   summary,
      payload:         { risk_level, session_id, source: 'agent1' },
      actor_user_id:   user.id,
      created_at:      new Date().toISOString(),
    }
  ])

  return NextResponse.json(agentData)
}
