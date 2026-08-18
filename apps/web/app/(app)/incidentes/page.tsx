import { getIncidents, getSystemsForIncident } from './actions'
import { IncidentesClient } from './incidentes-client'

export const dynamic = 'force-dynamic'

export default async function IncidentesPage() {
  const [incidents, systems] = await Promise.all([
    getIncidents(),
    getSystemsForIncident(),
  ])

  return <IncidentesClient incidents={incidents} systems={systems} />
}
