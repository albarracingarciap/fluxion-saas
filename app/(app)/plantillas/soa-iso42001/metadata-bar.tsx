'use client'

import { FileText, User, CheckCircle2, MapPin } from 'lucide-react'

type Props = {
  metadata: {
    version: string
    owner_name: string
    approved_by: string
    scope: string
  }
}

export function SoAMetadataBar({ metadata }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <InfoItem
        icon={<FileText size={16} />}
        label="Versión"
        value={metadata.version || '1.0'}
      />
      <InfoItem
        icon={<User size={16} />}
        label="Propietario"
        value={metadata.owner_name || 'No definido'}
      />
      <InfoItem
        icon={<CheckCircle2 size={16} />}
        label="Aprobado por"
        value={metadata.approved_by || 'No definido'}
      />
      <InfoItem
        icon={<MapPin size={16} />}
        label="Ámbito / Alcance"
        value={metadata.scope || 'No definido'}
      />
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-ltcard border border-ltb rounded-[14px] px-5 py-4 shadow-[0_2px_12px_rgba(0,74,173,0.02)] flex items-start gap-3.5 group hover:border-brand-cyan/20 transition-all">
      <div className="w-9 h-9 shrink-0 rounded-xl bg-ltbg border border-ltb flex items-center justify-center text-lttm group-hover:text-brand-cyan group-hover:bg-cyan-dim2 group-hover:border-cyan-border transition-all">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-ltt2 mb-1">{label}</p>
        <p className="font-sora text-[13px] font-medium text-ltt truncate" title={value}>
          {value}
        </p>
      </div>
    </div>
  )
}
