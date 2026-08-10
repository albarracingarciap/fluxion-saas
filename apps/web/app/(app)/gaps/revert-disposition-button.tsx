'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Loader2 } from 'lucide-react'
import { revertGapDispositionAction } from './actions'

type Props = {
  dispositionId: string
}

export function RevertDispositionButton({ dispositionId }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRevert() {
    setLoading(true)
    setError(null)
    const result = await revertGapDispositionAction(dispositionId)
    setLoading(false)
    if ('error' in result) {
      setError(result.error)
      setConfirming(false)
    } else {
      router.refresh()
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {error && (
          <span className="font-sora text-[11px] text-re">{error}</span>
        )}
        <span className="font-sora text-[12px] text-ltt2">¿Reactivar este gap?</span>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 rounded-[7px] border border-ltb text-lttm font-sora text-[11px] hover:text-ltt transition-colors"
        >
          No
        </button>
        <button
          type="button"
          onClick={handleRevert}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-gradient-to-r from-brand-cyan to-brand-blue text-white font-sora text-[11px] font-medium disabled:opacity-40"
        >
          {loading && <Loader2 size={11} className="animate-spin" />}
          {loading ? 'Revirtiendo…' : 'Sí, reactivar'}
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-ltb bg-ltbg text-ltt2 font-sora text-[11px] hover:border-cyan-border hover:text-brand-cyan transition-colors"
    >
      <RotateCcw size={12} />
      Reactivar
    </button>
  )
}
