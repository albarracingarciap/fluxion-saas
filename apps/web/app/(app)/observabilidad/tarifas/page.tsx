import { listPrices } from './actions'
import { TarifasClient } from './tarifas-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tarifas de modelos · Fluxion' }

export default async function TarifasPage() {
  const { prices, missing } = await listPrices()
  return <TarifasClient prices={prices} missing={missing} />
}
