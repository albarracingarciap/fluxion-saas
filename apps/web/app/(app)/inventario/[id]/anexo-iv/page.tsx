import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

import { getOrCreateAnnexIvDocument, listDocumentRenders } from './actions'
import { AnexoIvClient } from './anexo-iv-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Anexo IV · Fluxion' }

export default async function AnexoIvPage({ params }: { params: { id: string } }) {
  const result = await getOrCreateAnnexIvDocument(params.id)

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

  return <AnexoIvClient doc={result} renders={renders} aiSystemId={params.id} />
}
