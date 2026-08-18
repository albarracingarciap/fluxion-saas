import { getDiscoveries, getSystemsForLinking, type DiscoveryRow } from './actions'
import { DescubrimientosClient } from './descubrimientos-client'

export const dynamic = 'force-dynamic'

export default async function DescubrimientosPage() {
  const [all, systems] = await Promise.all([
    getDiscoveries(),
    getSystemsForLinking(),
  ])

  const initial: Record<DiscoveryRow['status'], DiscoveryRow[]> = {
    pending: all.filter((d) => d.status === 'pending'),
    linked:  all.filter((d) => d.status === 'linked'),
    ignored: all.filter((d) => d.status === 'ignored'),
  }

  return <DescubrimientosClient initial={initial} systems={systems} />
}
