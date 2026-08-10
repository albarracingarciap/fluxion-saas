'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, UserCheck, ChevronDown, Loader2, CheckCircle2 } from 'lucide-react'

import type { UnifiedGapRecord, GapAssignableMember, GapLayer } from '@/lib/gaps/data'
import { bulkUpdateGapAssignmentAction } from './actions'

const ASSIGNABLE_LAYERS: GapLayer[] = ['normativo', 'control', 'caducidad']

type Props = {
  selectedGaps: UnifiedGapRecord[]
  members: GapAssignableMember[]
  onClose: () => void
  onSuccess: () => void
}

export function BulkAssignModal({ selectedGaps, members, onClose, onSuccess }: Props) {
  const router = useRouter()
  const [ownerId, setOwnerId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [result, setResult] = useState<{ updated: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const assignableGaps = selectedGaps.filter((g) => ASSIGNABLE_LAYERS.includes(g.layer))
  const skippedCount = selectedGaps.length - assignableGaps.length

  function handleSubmit() {
    if (!ownerId && !dueDate) return
    setError(null)

    startTransition(async () => {
      const res = await bulkUpdateGapAssignmentAction({
        gaps: assignableGaps.map((g) => ({ layer: g.layer, id: g.id, systemId: g.system_id })),
        ownerId: ownerId || null,
        dueDate: dueDate || null,
      })

      if ('error' in res) {
        setError(res.error)
        return
      }

      setResult({ updated: res.updated })
      router.refresh()
    })
  }

  const isComplete = result !== null

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
                Asignar {assignableGaps.length} gap{assignableGaps.length !== 1 ? 's' : ''}
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
            {skippedCount > 0 && (
              <div className="rounded-[8px] border border-orb bg-ordim px-3 py-2">
                <p className="font-sora text-[12px] text-or">
                  {skippedCount} gap{skippedCount !== 1 ? 's' : ''} de capa FMEA ser{skippedCount !== 1 ? 'án' : 'á'} omitido{skippedCount !== 1 ? 's' : ''} (no admiten asignación directa).
                </p>
              </div>
            )}

            {isComplete ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2 size={32} className="text-gr" />
                <p className="font-sora text-[14px] font-semibold text-ltt">
                  {result.updated} gap{result.updated !== 1 ? 's' : ''} actualizado{result.updated !== 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <>
                <div>
                  <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1.5">Responsable</p>
                  <div className="relative">
                    <select
                      value={ownerId}
                      onChange={(e) => setOwnerId(e.target.value)}
                      className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[12px] text-ltt font-sora outline-none appearance-none pr-7 focus:border-brand-cyan cursor-pointer"
                    >
                      <option value="">Sin cambios</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-lttm pointer-events-none" />
                  </div>
                </div>

                <div>
                  <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1.5">Fecha límite</p>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[12px] text-ltt font-sora outline-none focus:border-brand-cyan"
                  />
                </div>

                {error && (
                  <p className="font-sora text-[12px] text-re bg-redim border border-reb rounded-lg px-3 py-2">
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
                disabled={isPending || (!ownerId && !dueDate)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-[8px] font-sora text-[12px] font-medium disabled:opacity-50 shadow-[0_2px_8px_rgba(0,173,239,0.3)]"
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                Aplicar a {assignableGaps.length} gaps
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
