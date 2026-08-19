import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { signedDownloadUrl, BUCKET_DOCUMENTS } from '@/lib/storage/objects'

export const dynamic = 'force-dynamic'

/**
 * Descarga de un render.
 *
 * La comprobación de organización va ANTES de firmar, y la hace RLS: si el
 * usuario no puede ver la fila de `document_renders`, no hay URL. MinIO no
 * volverá a preguntar.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const fluxion = createFluxionClient()
  const { data: render } = await fluxion
    .from('document_renders')
    .select('storage_bucket, storage_path, rendered_at, document_id, documents(title)')
    .eq('id', params.id)
    .maybeSingle()

  if (!render) return NextResponse.json({ error: 'Render no encontrado' }, { status: 404 })

  const titulo = (render.documents as { title?: string } | null)?.title ?? 'expediente'
  const fecha = String(render.rendered_at).slice(0, 10)
  const filename = `${titulo.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ.-]/g, '')} ${fecha}.pdf`.trim()

  try {
    const url = await signedDownloadUrl({
      bucket: render.storage_bucket ?? BUCKET_DOCUMENTS,
      key: render.storage_path,
      filename,
    })
    return NextResponse.redirect(url, 302)
  } catch (e) {
    console.error('descarga de render:', e)
    return NextResponse.json({ error: 'No se pudo generar el enlace' }, { status: 500 })
  }
}
