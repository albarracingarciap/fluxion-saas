'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, X } from 'lucide-react'

import type { EvidenceExpiryAlert } from '@/lib/evidences/expiry-alerts'
import { dismissExpiryAlert } from './actions'

const ALERT_META: Record<EvidenceExpiryAlert['alert_type'], { label: string; color: string }> = {
  expiry_7d:  { label: 'Vence en ≤ 7 días',  color: 'text-re' },
  expiry_30d: { label: 'Vence en ≤ 30 días', color: 'text-or' },
  expired:    { label: 'Caducada',            color: 'text-re' },
}

function formatDate(v: string) {
  return new Date(v).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ExpiryAlertsBanner({ alerts }: { alerts: EvidenceExpiryAlert[] }) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [isDismissing, startDismissTransition] = useTransition()

  const visible = alerts.filter((a) => !dismissed.has(a.id))
  if (visible.length === 0) return null

  const urgent = visible.filter((a) => a.alert_type === 'expiry_7d' || a.alert_type === 'expired')

  const handleDismiss = (alertId: string) => {
    setDismissed((prev) => new Set(Array.from(prev).concat(alertId)))
    startDismissTransition(async () => {
      await dismissExpiryAlert(alertId)
      router.refresh()
    })
  }

  return (
    <div className="rounded-[14px] border border-reb bg-red-dim px-5 py-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-re shrink-0" />
          <p className="font-sora text-[13px] font-semibold text-ltt">
            {visible.length} evidencia{visible.length !== 1 ? 's' : ''} con alerta de caducidad
            {urgent.length > 0 && (
              <span className="ml-2 font-plex text-[10px] uppercase tracking-[0.6px] text-re">
                · {urgent.length} urgente{urgent.length !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <Link
          href="/evidencias?scope=expiring"
          className="inline-flex items-center gap-1 font-sora text-[11.5px] text-brand-cyan hover:underline shrink-0"
        >
          Ver todas
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-2">
        {visible.slice(0, 5).map((alert) => {
          const meta = ALERT_META[alert.alert_type]
          return (
            <div
              key={alert.id}
              className="flex items-center justify-between gap-3 rounded-[10px] border border-reb bg-ltcard px-4 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`font-plex text-[9.5px] uppercase tracking-[0.6px] ${meta.color}`}>
                    {meta.label}
                  </span>
                  <span className="font-plex text-[9.5px] text-lttm">
                    {formatDate(alert.expires_at)}
                  </span>
                </div>
                <Link
                  href={`/evidencias/${alert.evidence_id}`}
                  className="font-sora text-[12.5px] text-ltt hover:text-brand-cyan transition-colors truncate block max-w-[480px]"
                >
                  {alert.evidence_title}
                </Link>
              </div>
              <button
                onClick={() => handleDismiss(alert.id)}
                disabled={isDismissing}
                className="shrink-0 p-1.5 rounded-[6px] text-lttm hover:bg-ltcard2 hover:text-ltt border border-transparent hover:border-ltb transition-colors disabled:opacity-50"
                title="Descartar alerta"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      {visible.length > 5 && (
        <p className="font-sora text-[11.5px] text-lttm text-center">
          y {visible.length - 5} más —{' '}
          <Link href="/evidencias?scope=expiring" className="text-brand-cyan hover:underline">
            ver todas
          </Link>
        </p>
      )}
    </div>
  )
}
