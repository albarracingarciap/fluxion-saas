import { GitBranch } from 'lucide-react'

import { getMyPendingApprovals, getApprovalHistory, getMyOpenRequests } from './actions'
import { getAppAuthState } from '@/lib/auth/app-state'
import { hasAnyRole } from '@/lib/auth/roles'
import { AprobacionesClient } from './aprobaciones-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Aprobaciones · CompaaS IA' }

export default async function AprobacionesPage() {
  const [pendientes, historico, mias, auth] = await Promise.all([
    getMyPendingApprovals(),
    getApprovalHistory(),
    getMyOpenRequests(),
    getAppAuthState(),
  ])
  // Cancelan cualquier solicitud el Administrador y el Responsable del SGAI; el
  // resto, las suyas (B11c).
  const puedeCancelarTodas = hasAnyRole(auth.profile, ['org_admin', 'sgai_manager'])

  return (
    <div className="max-w-[1100px] w-full mx-auto flex flex-col gap-5 animate-fadein pb-16">
      <div className="flex items-start gap-3">
        <div className="w-[34px] h-[34px] rounded-[9px] bg-ltcard2 border border-ltb flex items-center justify-center shrink-0 mt-0.5">
          <GitBranch size={16} className="text-ltt2" />
        </div>
        <div>
          <h1 className="font-fraunces text-[22px] text-ltt">Aprobaciones</h1>
          <p className="font-sora text-[12.5px] text-lttm mt-0.5 max-w-2xl">
            Decisiones que te corresponden y el rastro de las que ya se tomaron. Cada voto
            queda registrado a nombre de quien lo emite: es lo que convierte una aprobación
            en evidencia.
          </p>
        </div>
      </div>

      <AprobacionesClient
        pendientes={pendientes}
        historico={historico}
        mias={mias}
        puedeCancelarTodas={puedeCancelarTodas}
      />
    </div>
  )
}
