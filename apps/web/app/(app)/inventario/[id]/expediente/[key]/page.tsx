import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

import { getOrCreateDocument, listDocumentRenders, listTemplatesForSystem } from './actions'
import { isTemplateKey } from '@/lib/documents/templates'
import { ExpedienteClient } from './expediente-client'

export const dynamic = 'force-dynamic'

export default async function ExpedientePage({
  params,
}: {
  params: { id: string; key: string }
}) {
  // Clave desconocida es un 404, no un error de la aplicación: no existe ese
  // documento, igual que no existe un sistema con un id inventado.
  if (!isTemplateKey(params.key)) notFound()

  const [result, templates] = await Promise.all([
    getOrCreateDocument(params.id, params.key),
    listTemplatesForSystem(params.id),
  ])

  if ('error' in result) {
    return (
      <div className="max-w-[900px] w-full mx-auto py-10">
        <div className="border border-reb bg-red-dim rounded-[12px] p-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-re shrink-0 mt-0.5" />
          <div>
            <p className="font-sora text-[13.5px] text-ltt">{result.error}</p>
            <Link
              href={`/inventario/${params.id}`}
              className="font-sora text-[12.5px] text-brand-cyan mt-2 inline-block"
            >
              Volver al sistema
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const renders = await listDocumentRenders(result.document.id)

  return (
    <ExpedienteClient
      doc={result}
      renders={renders}
      templates={templates}
      templateKey={params.key}
      aiSystemId={params.id}
    />
  )
}
