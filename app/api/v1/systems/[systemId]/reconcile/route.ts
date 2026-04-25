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

  return NextResponse.json(data)
}
