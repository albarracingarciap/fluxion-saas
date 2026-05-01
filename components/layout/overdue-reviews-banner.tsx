'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, X } from 'lucide-react'

const DISMISS_KEY = 'fluxion_overdue_reviews_banner_dismissed_at'
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000 // 24h

type Props = {
  overdueCount: number
  upcomingCount: number
}

export function OverdueReviewsBanner({ overdueCount, upcomingCount }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (raw) {
      const dismissedAt = parseInt(raw, 10)
      if (!isNaN(dismissedAt) && Date.now() - dismissedAt < DISMISS_TTL_MS) {
        return
      }
    }
    setVisible(true)
  }, [])

  if (!visible || (overdueCount === 0 && upcomingCount === 0)) return null

  const isUrgent = overdueCount > 0

  return (
    <div className={`flex-shrink-0 border-b px-[26px] py-[9px] flex items-center gap-3 ${
      isUrgent ? 'bg-[#2a0a0a] border-[#5c1a1a]' : 'bg-[#1e1800] border-[#4a3500]'
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        isUrgent
          ? 'bg-re shadow-[0_0_8px_var(--re)] animate-pulse'
          : 'bg-or shadow-[0_0_6px_var(--or)]'
      }`} />
      <RefreshCw size={12} className={isUrgent ? 'text-re shrink-0' : 'text-or shrink-0'} />
      <span className={`font-plex text-[11px] flex-1 ${isUrgent ? 'text-[#ffb3b3]' : 'text-[#ffd580]'}`}>
        {isUrgent ? (
          <>
            <strong className={isUrgent ? 'text-re' : 'text-or'}>
              {overdueCount} {overdueCount === 1 ? 'revisión vencida' : 'revisiones vencidas'}
            </strong>
            {upcomingCount > 0 && ` y ${upcomingCount} próximas`}
            {' '}— acciones aceptadas o diferidas requieren re-evaluación inmediata.
          </>
        ) : (
          <>
            <strong className="text-or">
              {upcomingCount} {upcomingCount === 1 ? 'revisión periódica' : 'revisiones periódicas'}
            </strong>
            {' '}vence{upcomingCount === 1 ? '' : 'n'} en los próximos 30 días.
          </>
        )}
        {' '}
        <Link
          href="/planes/revisiones-pendientes"
          className={`underline underline-offset-2 hover:no-underline transition-all ${
            isUrgent ? 'text-re' : 'text-or'
          }`}
        >
          Ver revisiones
        </Link>
      </span>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, String(Date.now()))
          setVisible(false)
        }}
        className={`ml-1 transition-colors ${isUrgent ? 'text-[#ffb3b3] hover:text-re' : 'text-[#ffd580] hover:text-or'}`}
        title="Descartar por 24h"
      >
        <X size={12} />
      </button>
    </div>
  )
}
