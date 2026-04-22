import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'

const BUCKET = 'organization-logos'
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const fluxion = createFluxionClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: membership } = await fluxion
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo supera el límite de 2 MB' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = `${membership.organization_id}/logo.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('[upload-logo]', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  // Cache-bust añadiendo timestamp para que el navegador refresque la imagen
  const url = `${publicUrl}?t=${Date.now()}`

  return NextResponse.json({ url })
}
