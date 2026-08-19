import { redirect } from 'next/navigation'

/**
 * La ruta original del Anexo IV, de cuando era la única plantilla.
 * Se conserva como redirección: hay enlaces guardados apuntando aquí.
 */
export default function AnexoIvLegacyPage({ params }: { params: { id: string } }) {
  redirect(`/inventario/${params.id}/expediente/annex_iv`)
}
