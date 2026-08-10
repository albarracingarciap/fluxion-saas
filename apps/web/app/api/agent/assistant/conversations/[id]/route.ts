import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const AGENT_BASE_URL = process.env.AGENT_SERVER_URL ?? 'http://localhost:8001'

async function getToken() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await getToken()
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const res = await fetch(
    `${AGENT_BASE_URL}/api/agent/assistant/conversations/${params.id}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return NextResponse.json({ error: text }, { status: res.status })
  }

  return NextResponse.json(await res.json())
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await getToken()
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const res = await fetch(
    `${AGENT_BASE_URL}/api/agent/assistant/conversations/${params.id}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return NextResponse.json({ error: text }, { status: res.status })
  }

  return NextResponse.json({ status: 'deleted' })
}
