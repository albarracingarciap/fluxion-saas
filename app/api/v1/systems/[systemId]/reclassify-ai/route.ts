import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
  _request: NextRequest,
  { params }: { params: { systemId: string } }
) {
  const token = await getUserToken()
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

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
