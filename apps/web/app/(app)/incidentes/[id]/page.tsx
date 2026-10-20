import { notFound } from 'next/navigation'

import { getAppAuthState } from '@/lib/auth/app-state'
import { getIncident, getOrgMembers, getCorrectiveActions } from '../actions'
import { IncidenteDetalle } from './incidente-detalle'
import { hasAnyRole } from '@/lib/auth/roles'

export const dynamic = 'force-dynamic'

const GOVERNANCE_ROLES = ['org_admin', 'sgai_manager', 'caio', 'dpo', 'risk_analyst', 'compliance_analyst']

export default async function IncidentePage({ params }: { params: { id: string } }) {
  const [incident, members, actions, auth] = await Promise.all([
    getIncident(params.id),
    getOrgMembers(),
    getCorrectiveActions(params.id),
    getAppAuthState(),
  ])

  if (!incident) notFound()

  const canGovern = hasAnyRole(auth.membership, GOVERNANCE_ROLES)

  return (
    <IncidenteDetalle
      incident={incident}
      members={members}
      actions={actions}
      canGovern={canGovern}
    />
  )
}
