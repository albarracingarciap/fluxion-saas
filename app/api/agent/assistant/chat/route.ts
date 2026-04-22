import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const AGENT_BASE_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? 'http://localhost:8001'

export async function POST(req: NextRequest) {
  const supabase = createClient()

  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })
  }

  const body = await req.json()

  const agentRes = await fetch(`${AGENT_BASE_URL}/api/agent/assistant/chat`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'Accept':        'text/event-stream',
    },
    body: JSON.stringify(body),
  })

  if (!agentRes.ok) {
    const text = await agentRes.text().catch(() => '')
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
