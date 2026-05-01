import { ShieldCheck, Mail, Calendar, Building2 } from 'lucide-react'
import { SectionHeader, ComingSoonNotice } from './shared'

type Props = {
  userEmail: string | null | undefined
  memberSince: string | null | undefined
  organizationName: string | null | undefined
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function CuentaTab({ userEmail, memberSince, organizationName }: Props) {
  return (
    <div>
      <SectionHeader
        icon={<ShieldCheck size={16} className="text-ltt2" />}
        title="Cuenta"
        description="Información de identidad corporativa y acceso a la plataforma."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <InfoCard icon={<Mail size={13} />} label="Email">
          {userEmail ?? '—'}
        </InfoCard>
        <InfoCard icon={<Calendar size={13} />} label="Miembro desde">
          {formatDate(memberSince)}
        </InfoCard>
        <InfoCard icon={<Building2 size={13} />} label="Organización" wide>
          {organizationName ?? '—'}
        </InfoCard>
      </div>

      <ComingSoonNotice>
        El cambio de email y la solicitud de eliminación de cuenta estarán disponibles
        en una próxima actualización.
      </ComingSoonNotice>
    </div>
  )
}

function InfoCard({
  icon,
  label,
  children,
  wide = false,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className={`rounded-[9px] border border-ltb bg-ltcard2 px-4 py-3 ${wide ? 'md:col-span-2' : ''}`}>
      <div className="flex items-center gap-1.5 font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">
        <span className="text-lttm">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="font-sora text-[13px] text-ltt truncate">{children}</div>
    </div>
  )
}
