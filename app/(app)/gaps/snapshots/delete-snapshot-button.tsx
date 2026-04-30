'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, X, AlertTriangle } from 'lucide-react'
import { deleteGapAnalysisSnapshotAction } from '../actions'

type Props = {
  snapshotId: string
  snapshotTitle: string
}

export function DeleteSnapshotButton({ snapshotId, snapshotTitle }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteGapAnalysisSnapshotAction(snapshotId)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-7 h-7 flex items-center justify-center rounded-[7px] text-lttm hover:text-re hover:bg-redim transition-colors"
        title="Eliminar snapshot"
      >
        <Trash2 size={13} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[70]"
            style={{ background: 'rgba(0,0,0,0.2)' }}
            onClick={() => !isPending && setOpen(false)}
          />
          <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
            <div className="bg-ltcard border border-ltb rounded-[16px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[400px] overflow-hidden">
              <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-re" />
                  <p className="font-sora text-[14px] font-semibold text-ltt">Eliminar snapshot</p>
                </div>
                <button
                  type="button"
                  onClick={() => !isPending && setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-lttm hover:text-ltt hover:bg-ltbg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-5 py-4">
                <p className="font-sora text-[13px] text-ltt2">
                  ¿Eliminar <span className="font-semibold text-ltt">"{snapshotTitle}"</span>? Esta acción no se puede deshacer.
                </p>
                {error && (
                  <p className="mt-3 font-sora text-[12px] text-re bg-redim border border-reb rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
              </div>

              <div className="px-5 py-4 border-t border-ltb bg-ltcard2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => !isPending && setOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-[8px] border border-ltb bg-ltbg text-ltt2 font-sora text-[12px] hover:border-ltbl transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-re text-white rounded-[8px] font-sora text-[12px] font-medium disabled:opacity-50"
                >
                  {isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
