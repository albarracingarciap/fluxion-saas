import { notFound } from 'next/navigation'

import { getSystemOperation } from './actions'
import { OperacionClient } from './operacion-client'

export const dynamic = 'force-dynamic'

/** Datos de entrada y vigilancia del funcionamiento del sistema (B28). */
export default async function OperacionPage({ params }: { params: { id: string } }) {
  const data = await getSystemOperation(params.id)
  if ('error' in data) notFound()
  return <OperacionClient systemId={params.id} data={data} />
}
