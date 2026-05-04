import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const AGENT_BASE_URL = process.env.AGENT_SERVER_URL ?? 'http://localhost:8001'

export async function POST(req: NextRequest) {
  const supabase = createClient()

  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })
  }

  const body = await req.json()

  let agentRes: Response
  try {
    agentRes = await fetch(`${AGENT_BASE_URL}/api/agent/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'Accept':        'text/event-stream',
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[chat] No se pudo conectar con el agente:', msg, '| URL:', AGENT_BASE_URL)
    return new Response(
      JSON.stringify({ error: `No se pudo conectar con el servidor de agentes: ${msg}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!agentRes.ok) {
    const text = await agentRes.text().catch(() => '')
    console.error('[chat] Error del agente:', agentRes.status, text)
    return new Response(text || `Error ${agentRes.status}`, { status: agentRes.status })
  }

  // Pass through the SSE stream directly
  return new Response(agentRes.body, {
    headers: {
      'Content-Type':    'text/event-stream',
      'Cache-Control':   'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
