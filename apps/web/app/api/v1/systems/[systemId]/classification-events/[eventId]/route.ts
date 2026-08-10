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

// DELETE — cancela un evento pending_reconciliation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { systemId: string; eventId: string } }
) {
  const token = await getUserToken()
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const agentResponse = await fetch(
    `${AGENT_URL}/api/v1/systems/${params.systemId}/classification-events/${params.eventId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  )

  if (agentResponse.status === 204) {
    return new NextResponse(null, { status: 204 })
  }

  const data = await agentResponse.json()
  return NextResponse.json(data, { status: agentResponse.status })
}
