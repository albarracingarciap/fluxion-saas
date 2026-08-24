import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

import { getBusinessRisks } from './actions'
import { RiesgosNegocioClient } from './riesgos-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Riesgos de negocio · Fluxion' }

export default async function RiesgosNegocioPage({ params }: { params: { id: string } }) {
  const data = await getBusinessRisks(params.id)

  if ('error' in data) {
    return (
      <div className="max-w-[900px] w-full mx-auto py-10">
        <div className="border border-reb bg-red-dim rounded-[12px] p-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-re shrink-0 mt-0.5" />
          <div>
            <p className="font-sora text-[13.5px] text-ltt">{data.error}</p>
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

  return (
    <RiesgosNegocioClient
      sistema={data.sistema}
      riesgos={data.riesgos}
      aiSystemId={params.id}
    />
  )
}
