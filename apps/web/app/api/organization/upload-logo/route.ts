import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { revalidatePath } from 'next/cache'

const BUCKET = 'organization-logos'
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const fluxion = createFluxionClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await fluxion
    .from('profiles')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'org_admin') {
    return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo supera el límite de 2 MB' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = `${profile.organization_id}/logo.${ext}`
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

  // La URL se guarda AQUI, no en quien llame. Antes se devolvia y cada
  // pantalla decidia si persistirla: el formulario de organizacion lo hacia y
  // el onboarding no, asi que el logo se subia a Storage y la referencia se
  // perdia. Subir un fichero y no dejar constancia de donde esta es media
  // operacion.
  const { error: updateError } = await fluxion
    .from('organizations')
    .update({ logo_url: url })
    .eq('id', profile.organization_id)

  if (updateError) {
    console.error('[upload-logo] fichero subido pero no referenciado:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // El sidebar se pinta desde el layout, no desde la pagina que sube el logo.
  revalidatePath('/', 'layout')

  return NextResponse.json({ url })
}
