import { getAppAuthState } from '@/lib/auth/app-state'
import { hasAnyRole } from '@/lib/auth/roles'

import { getIncidents, getOrgMembers, getSystemsForIncident } from './actions'
import { IncidentesClient } from './incidentes-client'
import { IncidentesPestanas } from './pestanas'
import { getAuthorityRequests, getRequestOptions } from './requerimientos/actions'
import { RequerimientosClient } from './requerimientos/requerimientos-client'

export const dynamic = 'force-dynamic'

const GOVERNANCE_ROLES = ['org_admin', 'sgai_manager', 'caio', 'dpo', 'risk_analyst', 'compliance_analyst']

export default async function IncidentesPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const tab = searchParams?.tab === 'requerimientos' ? 'requerimientos' : 'incidentes'
  const [requests, systems] = await Promise.all([getAuthorityRequests(), getSystemsForIncident()])
  const abiertos = requests.filter((r) => r.status === 'received' || r.status === 'in_progress').length

  if (tab === 'requerimientos') {
    const [options, members, auth] = await Promise.all([getRequestOptions(), getOrgMembers(), getAppAuthState()])
    return (
      <>
        <IncidentesPestanas activa="requerimientos" requerimientosAbiertos={abiertos} />
        <RequerimientosClient
          requests={requests}
          systems={systems}
          members={members}
          incidents={options.incidents}
          canGovern={hasAnyRole(auth.membership, GOVERNANCE_ROLES)}
        />
      </>
    )
  }

  const incidents = await getIncidents()
  return (
    <>
      <IncidentesPestanas activa="incidentes" requerimientosAbiertos={abiertos} />
      <IncidentesClient incidents={incidents} systems={systems} />
    </>
  )
}
