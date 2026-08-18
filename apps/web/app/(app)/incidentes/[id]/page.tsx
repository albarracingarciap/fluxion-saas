import { notFound } from 'next/navigation'

import { getAppAuthState } from '@/lib/auth/app-state'
import { getIncident, getOrgMembers, getCorrectiveActions } from '../actions'
import { IncidenteDetalle } from './incidente-detalle'

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

  const canGovern = GOVERNANCE_ROLES.includes(auth.membership?.role ?? '')

  return (
    <IncidenteDetalle
      incident={incident}
      members={members}
      actions={actions}
      canGovern={canGovern}
    />
  )
}
