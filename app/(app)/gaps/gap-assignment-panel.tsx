'use client'

import { CalendarClock, Loader2, UserCog } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type { GapAssignableMember, GapLayer } from '@/lib/gaps/data'
import { updateGapAssignment, updateGapGroupAssignment } from './actions'

type BaseProps = {
  members: GapAssignableMember[]
  layer: GapLayer
  currentOwnerId: string | null
  currentDueDate: string | null
}

type SingleProps = BaseProps & {
  mode: 'single'
  id: string
  systemId: string
}

type GroupProps = BaseProps & {
  mode: 'group'
  ids: string[]
  systemIds: string[]
}

type GapAssignmentPanelProps = SingleProps | GroupProps

export function GapAssignmentPanel(props: GapAssignmentPanelProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [ownerId, setOwnerId] = useState(props.currentOwnerId ?? '')
  const [dueDate, setDueDate] = useState(props.currentDueDate ?? '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isSupported = props.layer === 'normativo' || props.layer === 'control' || props.layer === 'caducidad'
  const dueLabel = props.layer === 'caducidad' ? 'Nueva caducidad' : 'Fecha objetivo'
  const buttonLabel =
    props.mode === 'group' ? 'Asignar grupo' : props.currentOwnerId || props.currentDueDate ? 'Editar asignación' : 'Asignar'

  const hasChanges = useMemo(
    () => (props.currentOwnerId ?? '') !== ownerId || (props.currentDueDate ?? '') !== dueDate,
    [dueDate, ownerId, props.currentDueDate, props.currentOwnerId]
  )

  if (!isSupported) {
    return null
  }

  const handleSave = () => {
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const payload =
        props.mode === 'group'
          ? await updateGapGroupAssignment({
              layer: props.layer,
              ids: props.ids,
              systemIds: props.systemIds,
              ownerId: ownerId || null,
              dueDate: dueDate || null,
            })
          : await updateGapAssignment({
              layer: props.layer,
              id: props.id,
              systemId: props.systemId,
              ownerId: ownerId || null,
              dueDate: dueDate || null,
            })

      if (payload?.error) {
        setError(payload.error)
        return
      }

      setSuccess(props.mode === 'group' ? 'Grupo actualizado.' : 'Asignación actualizada.')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[7px] border border-ltb bg-ltbg text-ltt2 font-sora text-[11px] hover:border-cyan-border hover:text-brand-cyan transition-colors"
      >
        <UserCog size={13} />
        {buttonLabel}
      </button>

      {isOpen ? (
        <div className="w-full rounded-[10px] border border-ltb bg-ltbg p-3 shadow-[0_4px_16px_rgba(0,74,173,0.06)]">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Responsable</span>
              <select
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value)}
                className="h-10 rounded-[8px] border border-ltb bg-white px-3 font-sora text-[12px] text-ltt outline-none focus:border-cyan-border"
              >
                <option value="">Sin owner</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} · {member.role}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">{dueLabel}</span>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="h-10 w-full rounded-[8px] border border-ltb bg-white px-3 pr-9 font-sora text-[12px] text-ltt outline-none focus:border-cyan-border"
                />
                <CalendarClock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lttm pointer-events-none" />
              </div>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
            <div className="min-h-[16px]">
              {error ? <p className="font-sora text-[11px] text-re">{error}</p> : null}
              {!error && success ? <p className="font-sora text-[11px] text-gr">{success}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setOwnerId(props.currentOwnerId ?? '')
                  setDueDate(props.currentDueDate ?? '')
                  setIsOpen(false)
                  setError(null)
                  setSuccess(null)
                }}
                className="px-3 py-1.5 rounded-[7px] border border-ltb bg-white text-ltt2 font-sora text-[11px] hover:bg-ltcard transition-colors"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={isPending || !hasChanges}
                onClick={handleSave}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[7px] border border-transparent bg-gradient-to-r from-brand-cyan to-brand-blue text-white font-sora text-[11px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
