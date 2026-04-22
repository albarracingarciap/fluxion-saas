'use client'

import { FilePlus2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { saveGapAnalysisSnapshot } from './actions'

export function SaveGapAnalysisSnapshotButton() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    setError(null)

    startTransition(async () => {
      const result = await saveGapAnalysisSnapshot()

      if (result?.error) {
        setError(result.error)
        return
      }

      if (result?.snapshotId) {
        router.push(`/gaps/snapshots/${result.snapshotId}`)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-2 print:hidden">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] border border-ltb text-ltt font-sora text-[13px] font-medium bg-white hover:bg-ltbg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />}
        Guardar snapshot
      </button>
      {error ? <div className="max-w-[280px] text-right text-[11px] font-sora text-re">{error}</div> : null}
    </div>
  )
}
