'use client';

import { CreditCard } from 'lucide-react';
import { SectionHeader } from './shared';

const PLAN_LABELS: Record<string, string> = {
  starter:    'Starter',
  pro:        'Pro',
  enterprise: 'Enterprise',
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
}

interface Props {
  plan: string | null | undefined
  planStartedAt: string | null | undefined
  planExpiresAt: string | null | undefined
}

export function PlanTab({ plan, planStartedAt, planExpiresAt }: Props) {
  return (
    <div>
      <SectionHeader
        icon={<CreditCard size={16} className="text-ltt2" />}
        title="Plan contratado"
        description="Información sobre la suscripción activa. Para cambiar de plan contacta con el equipo de Fluxion."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-[9px] border border-ltb bg-ltcard2 px-4 py-3">
          <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">Plan activo</div>
          <div className="font-sora text-[14px] font-semibold text-ltt">
            {PLAN_LABELS[plan ?? ''] ?? plan ?? '—'}
          </div>
        </div>
        <div className="rounded-[9px] border border-ltb bg-ltcard2 px-4 py-3">
          <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">Inicio</div>
          <div className="font-sora text-[13.5px] text-ltt2">{formatDate(planStartedAt)}</div>
        </div>
        <div className="rounded-[9px] border border-ltb bg-ltcard2 px-4 py-3">
          <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">Vigencia</div>
          <div className="font-sora text-[13.5px] text-ltt2">{formatDate(planExpiresAt)}</div>
        </div>
      </div>
    </div>
  )
}
