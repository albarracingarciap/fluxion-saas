'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserCheck, ChevronDown, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

import type { TreatmentPlanMember } from '@/lib/fmea/treatment-plan'
import { bulkAssignTreatmentActionsOwnerAction } from './actions'

type Props = {
  selectedCount: number
  actionIds: string[]
  members: TreatmentPlanMember[]
  aiSystemId: string
  evaluationId: string
  onClose: () => void
  onSuccess: () => void
}

export function BulkAssignActionsModal({
  selectedCount,
  actionIds,
  members,
  aiSystemId,
  evaluationId,
  onClose,
  onSuccess,
}: Props) {
  const router = useRouter()
  const [ownerId, setOwnerId] = useState('')
  const [result, setResult] = useState<{ updated: number; skipped: { actionId: string; reason: string }[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isComplete = result !== null

  function handleSubmit() {
    if (!ownerId) return
    setError(null)

    startTransition(async () => {
      const res = await bulkAssignTreatmentActionsOwnerAction({
        aiSystemId,
        evaluationId,
        actionIds,
        ownerId,
      })

      if ('error' in res) {
        setError(res.error)
        return
      }

      setResult({ updated: res.updated, skipped: res.skipped })
      router.refresh()
    })
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[70]"
        style={{ background: 'rgba(0,0,0,0.2)' }}
        onClick={() => !isPending && onClose()}
      />
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div className="bg-ltcard border border-ltb rounded-[16px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[480px] overflow-hidden">
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck size={15} className="text-brand-cyan" />
              <p className="font-sora text-[14px] font-semibold text-ltt">
                Reasignar responsable — {selectedCount} {selectedCount === 1 ? 'acción' : 'acciones'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => !isPending && onClose()}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-lttm hover:text-ltt hover:bg-ltbg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-4 flex flex-col gap-4">
            {isComplete ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2 size={32} className="text-gr" />
                <p className="font-sora text-[14px] font-semibold text-ltt">
                  {result.updated} {result.updated === 1 ? 'acción actualizada' : 'acciones actualizadas'}
                </p>
                {result.skipped.length > 0 && (
                  <div className="w-full rounded-[8px] border border-orb bg-ordim px-3 py-2 flex items-start gap-2">
                    <AlertTriangle size={13} className="text-or mt-0.5 shrink-0" />
                    <p className="font-sora text-[12px] text-or">
                      {result.skipped.length} {result.skipped.length === 1 ? 'acción omitida' : 'acciones omitidas'} (estado terminal).
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div>
                  <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1.5">Nuevo responsable</p>
                  <div className="relative">
                    <select
                      value={ownerId}
                      onChange={(e) => setOwnerId(e.target.value)}
                      className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[12px] text-ltt font-sora outline-none appearance-none pr-7 focus:border-brand-cyan cursor-pointer"
                    >
                      <option value="">Seleccionar responsable…</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-lttm pointer-events-none" />
                  </div>
                </div>

                {error && (
                  <p className="font-sora text-[12px] text-re bg-red-dim border border-reb rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="px-5 py-4 border-t border-ltb bg-ltcard2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                if (isComplete) onSuccess()
                else if (!isPending) onClose()
              }}
              disabled={isPending}
              className="px-4 py-2 rounded-[8px] border border-ltb bg-ltbg text-ltt2 font-sora text-[12px] hover:border-ltbl transition-colors disabled:opacity-50"
            >
              {isComplete ? 'Cerrar' : 'Cancelar'}
            </button>

            {!isComplete && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !ownerId}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-[8px] font-sora text-[12px] font-medium disabled:opacity-50 shadow-[0_2px_8px_rgba(0,173,239,0.3)]"
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                Aplicar a {selectedCount} {selectedCount === 1 ? 'acción' : 'acciones'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
