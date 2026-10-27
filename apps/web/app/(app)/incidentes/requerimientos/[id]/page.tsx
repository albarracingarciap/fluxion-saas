import { notFound } from 'next/navigation'

import { getAppAuthState } from '@/lib/auth/app-state'
import { hasAnyRole } from '@/lib/auth/roles'

import { getOrgMembers } from '../../actions'
import { getAuthorityRequest, getRequestOptions, getRequestTasks } from '../actions'
import { RequerimientoDetalle } from './requerimiento-detalle'

export const dynamic = 'force-dynamic'

const GOVERNANCE_ROLES = ['org_admin', 'sgai_manager', 'caio', 'dpo', 'risk_analyst', 'compliance_analyst']

export default async function RequerimientoPage({ params }: { params: { id: string } }) {
  const [request, members, tasks, options, auth] = await Promise.all([
    getAuthorityRequest(params.id),
    getOrgMembers(),
    getRequestTasks(params.id),
    getRequestOptions(),
    getAppAuthState(),
  ])
  if (!request) notFound()

  return (
    <RequerimientoDetalle
      request={request}
      members={members}
      tasks={tasks}
      evidences={options.evidences}
      canGovern={hasAnyRole(auth.membership, GOVERNANCE_ROLES)}
    />
  )
}
