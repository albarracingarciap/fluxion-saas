'use client';

import { ShieldAlert, Shield, UserCheck, Eye } from 'lucide-react';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_BADGE_CLS } from './shared';

function RoleIcon({ role }: { role: string }) {
  const cls = 'w-4 h-4'
  if (role === 'org_admin') return <ShieldAlert className={cls} />
  if (['caio', 'sgai_manager', 'dpo'].includes(role)) return <Shield className={cls} />
  if (['system_owner', 'risk_analyst', 'compliance_analyst'].includes(role)) return <UserCheck className={cls} />
  return <Eye className={cls} />
}

const ROLE_ORDER = [
  'org_admin', 'sgai_manager', 'caio', 'dpo',
  'system_owner', 'risk_analyst', 'compliance_analyst',
  'executive', 'auditor', 'viewer',
]

export function RolesTab() {
  return (
    <div>
      <p className="font-sora text-[13px] text-ltt2 mb-5 leading-relaxed">
        Cada miembro tiene un único rol que determina qué puede leer y modificar en la plataforma.
        Solo el Administrador puede cambiar roles.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ROLE_ORDER.map((role) => {
          const badgeCls = ROLE_BADGE_CLS[role] ?? 'bg-ltcard2 border-ltb text-lttm'
          return (
            <div key={role} className="flex gap-3.5 p-4 bg-ltbg rounded-[10px] border border-ltb hover:border-ltbl transition-colors">
              <div className={`w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0 border ${badgeCls}`}>
                <RoleIcon role={role} />
              </div>
              <div>
                <p className="font-sora text-[13px] font-semibold text-ltt mb-0.5">
                  {ROLE_LABELS[role]}
                </p>
                <p className="font-sora text-[12px] text-ltt2 leading-relaxed">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
