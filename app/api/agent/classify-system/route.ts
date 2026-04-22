/**
 * app/api/agent/classify-system/route.ts
 *
 * Proxy Next.js → Servidor de agentes (puerto 8001).
 * Reenvía el token de autenticación del usuario al servidor de agentes.
 * Hace streaming de la respuesta SSE directamente al cliente.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const AGENT_URL = process.env.AGENT_SERVER_URL || 'http://localhost:8001'

// ─── Helper: obtener token del usuario actual ──────────────
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


// ─── POST /api/agent/classify-system ──────────────────────
// Inicia una clasificación con streaming SSE
export async function POST(request: NextRequest) {
  const token = await getUserToken()
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await request.json()

  // Llamar al servidor de agentes con streaming
  const agentResponse = await fetch(`${AGENT_URL}/api/agent/classify-system`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!agentResponse.ok) {
    const error = await agentResponse.text()
    return NextResponse.json(
      { error: `Error del servidor de agentes: ${error}` },
      { status: agentResponse.status }
    )
  }

  // Hacer streaming de la respuesta SSE al cliente
  return new NextResponse(agentResponse.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
