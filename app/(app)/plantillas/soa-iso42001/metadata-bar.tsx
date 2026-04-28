'use client'

import { FileText, User, CheckCircle2, MapPin, CalendarClock, Tag } from 'lucide-react'
import type { SoAMetadata } from '@/lib/templates/data'

type Props = {
  metadata: SoAMetadata
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No definida'
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function SoAMetadataBar({ metadata }: Props) {
  const approvedByLabel = [metadata.approved_by, metadata.approved_by_role]
    .filter(Boolean)
    .join(' · ') || 'No definido'

  const approvedAtLabel = metadata.approved_at ? formatDate(metadata.approved_at) : null

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <InfoItem
          icon={<FileText size={15} />}
          label="Versión"
          value={metadata.version || '1.0'}
        />
        <InfoItem
          icon={<User size={15} />}
          label="Propietario"
          value={metadata.owner_name || 'No definido'}
        />
        <InfoItem
          icon={<CheckCircle2 size={15} />}
          label="Aprobado por"
          value={approvedByLabel}
          sub={approvedAtLabel ?? undefined}
        />
        <InfoItem
          icon={<CalendarClock size={15} />}
          label="Próxima revisión"
          value={formatDate(metadata.next_review_date)}
          highlight={isReviewSoon(metadata.next_review_date)}
        />
        <div className="xl:col-span-2">
          <ScopeItem
            scope={metadata.scope}
            tags={metadata.scope_system_tags}
          />
        </div>
      </div>
    </div>
  )
}

function isReviewSoon(dateStr: string | null): boolean {
  if (!dateStr) return false
  const reviewDate = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const diffDays = (reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays <= 30 && diffDays >= 0
}

function InfoItem({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className={`bg-ltcard border rounded-[14px] px-4 py-3.5 shadow-[0_2px_12px_rgba(0,74,173,0.02)] flex items-start gap-3 group hover:border-brand-cyan/20 transition-all ${highlight ? 'border-amber-300/60' : 'border-ltb'}`}>
      <div className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center transition-all group-hover:text-brand-cyan group-hover:bg-cyan-dim2 group-hover:border-cyan-border ${highlight ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-ltbg border-ltb text-lttm'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-ltt2 mb-0.5">{label}</p>
        <p className="font-sora text-[12.5px] font-medium text-ltt truncate" title={value}>
          {value}
        </p>
        {sub && (
          <p className="font-sora text-[11px] text-ltt2 mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  )
}

function ScopeItem({ scope, tags }: { scope: string; tags: string[] }) {
  return (
    <div className="bg-ltcard border border-ltb rounded-[14px] px-4 py-3.5 shadow-[0_2px_12px_rgba(0,74,173,0.02)] flex items-start gap-3 group hover:border-brand-cyan/20 transition-all h-full">
      <div className="w-8 h-8 shrink-0 rounded-lg bg-ltbg border border-ltb flex items-center justify-center text-lttm group-hover:text-brand-cyan group-hover:bg-cyan-dim2 group-hover:border-cyan-border transition-all">
        <MapPin size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-ltt2 mb-1">Ámbito / Alcance</p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-cyan-dim2 border border-cyan-border text-brand-cyan font-sora text-[11px]"
              >
                <Tag size={9} />
                {tag}
              </span>
            ))}
          </div>
        )}
        {scope ? (
          <p className="font-sora text-[12px] text-ltt2 line-clamp-2" title={scope}>
            {scope}
          </p>
        ) : (
          <p className="font-sora text-[12px] text-ltt2 italic">No definido</p>
        )}
      </div>
    </div>
  )
}
