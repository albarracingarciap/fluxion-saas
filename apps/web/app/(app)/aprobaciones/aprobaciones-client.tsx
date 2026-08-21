'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, MinusCircle, Clock, ChevronDown, ChevronRight, UserCheck } from 'lucide-react'

import { APPROVAL_OBJECT_TYPES } from '@/lib/approvals/catalog'
import {
  decideApproval, cancelApproval, getApprovalDecisions,
  type ApprovalRequestRow, type ApprovalDecisionRow,
} from './actions'

const MOTIVO_LABELS: Record<string, string> = {
  role:       'Te corresponde por tu rol',
  profile:    'Estás designado en la política',
  committee:  'Eres miembro del comité',
  delegation: 'Por delegación',
}

const DECISION_LABELS: Record<string, string> = {
  approved:  'Aprobó',
  rejected:  'Rechazó',
  abstained: 'Se abstuvo',
}

function tipoLabel(t: string) {
  return APPROVAL_OBJECT_TYPES.find((x) => x.key === t)?.label ?? t
}

function fecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ── Histórico de una solicitud ──────────────────────────────────────────────

function Historico({ requestId }: { requestId: string }) {
  const [filas, setFilas] = useState<ApprovalDecisionRow[] | null>(null)

  if (filas === null) {
    getApprovalDecisions(requestId).then(setFilas)
    return <p className="font-sora text-[12px] text-lttm mt-3">Cargando histórico…</p>
  }

  if (!filas.length) {
    return <p className="font-sora text-[12px] text-lttm mt-3">Todavía no ha decidido nadie.</p>
  }

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {filas.map((d, i) => (
        <div key={i} className="flex items-start gap-2 font-sora text-[12px] text-ltt2">
          <span className="text-lttm shrink-0">Paso {d.position} ·</span>
          <span>
            <strong className="text-ltt">{d.actor_name ?? 'Alguien'}</strong>{' '}
            {DECISION_LABELS[d.decision]?.toLowerCase() ?? d.decision}
            {d.on_behalf_name && (
              <span className="text-lttm"> · por cuenta de {d.on_behalf_name}</span>
            )}
            <span className="text-lttm"> · {fecha(d.decided_at)}</span>
            {d.reason && <span className="block text-lttm mt-0.5">«{d.reason}»</span>}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Tarjeta ─────────────────────────────────────────────────────────────────

function Tarjeta({ row, decidible }: { row: ApprovalRequestRow; decidible: boolean }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, startTransition] = useTransition()

  function decidir(decision: 'approved' | 'rejected' | 'abstained') {
    if (decision === 'rejected' && !motivo.trim()) {
      setPidiendoMotivo(true)
      return
    }
    setError(null)
    startTransition(async () => {
      const r = await decideApproval({ requestId: row.id, decision, reason: motivo || undefined })
      if ('error' in r) { setError(r.error); return }
      setPidiendoMotivo(false)
      setMotivo('')
      router.refresh()
    })
  }

  function cancelar() {
    const razon = prompt('¿Por qué se cancela esta solicitud?')
    if (!razon?.trim()) return
    startTransition(async () => {
      const r = await cancelApproval(row.id, razon)
      if (r.error) { setError(r.error); return }
      router.refresh()
    })
  }

  return (
    <div className="border border-ltb rounded-[12px] bg-ltcard p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-sora text-[13.5px] font-semibold text-ltt">
              {row.object_label ?? tipoLabel(row.object_type)}
            </span>
            {row.object_label && (
              <span className="rounded-[5px] bg-ltcard2 border border-ltb px-1.5 py-0.5 font-plex text-[9.5px] uppercase tracking-[0.6px] text-lttm">
                {tipoLabel(row.object_type)}
              </span>
            )}
            {row.status !== 'pending' && (
              <span className={`rounded-[5px] px-1.5 py-0.5 font-plex text-[9.5px] uppercase tracking-[0.6px] ${
                row.status === 'approved' ? 'bg-emerald-50 text-emerald-700'
                : row.status === 'rejected' ? 'bg-red-50 text-red-700'
                : 'bg-ltcard2 text-lttm'
              }`}>
                {row.status === 'approved' ? 'Aprobada' : row.status === 'rejected' ? 'Rechazada' : 'Cancelada'}
              </span>
            )}
          </div>

          <p className="font-sora text-[12px] text-lttm mt-1">
            {row.policy_name ?? 'Sin política'} · Paso {row.current_position} de {row.total_steps}
            {row.quorum > 1 && ` · ${row.approvals_in_step} de ${row.quorum} votos`}
            {' · '}Solicitada por {row.requested_by_name ?? 'alguien'} el {fecha(row.requested_at)}
          </p>

          {row.can_decide && (
            <p className="font-sora text-[11.5px] text-cyan-700 mt-1.5 flex items-center gap-1.5">
              <UserCheck size={12} />
              {MOTIVO_LABELS[row.can_decide] ?? row.can_decide}
            </p>
          )}

          {row.closed_reason && (
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">Motivo: «{row.closed_reason}»</p>
          )}

          <button
            onClick={() => setAbierto(!abierto)}
            className="flex items-center gap-1 font-sora text-[12px] text-lttm hover:text-ltt mt-2"
          >
            {abierto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            Histórico de decisiones
          </button>

          {abierto && <Historico requestId={row.id} />}
        </div>

        {decidible && (
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex gap-1.5">
              <button
                onClick={() => decidir('approved')}
                disabled={pendiente}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-emerald-200 bg-emerald-50 font-sora text-[12px] text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                <Check size={13} /> Aprobar
              </button>
              <button
                onClick={() => decidir('rejected')}
                disabled={pendiente}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-red-200 bg-red-50 font-sora text-[12px] text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <X size={13} /> Rechazar
              </button>
              <button
                onClick={() => decidir('abstained')}
                disabled={pendiente}
                title="Consta, pero no acerca la aprobación"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-ltb bg-ltcard2 font-sora text-[12px] text-lttm hover:text-ltt disabled:opacity-50"
              >
                <MinusCircle size={13} /> Abstenerse
              </button>
            </div>
            <button onClick={cancelar} className="font-sora text-[11.5px] text-lttm hover:text-red-600">
              Cancelar solicitud
            </button>
          </div>
        )}
      </div>

      {pidiendoMotivo && (
        <div className="mt-3 border-t border-ltb pt-3">
          <label className="block font-plex text-[10px] uppercase tracking-[0.7px] text-ltt2 mb-1.5">
            Motivo del rechazo
          </label>
          <textarea
            className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] text-ltt font-sora outline-none focus:border-brand-cyan"
            rows={2}
            value={motivo}
            placeholder="Qué hay que corregir para que esto pueda aprobarse"
            onChange={(e) => setMotivo(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => { setPidiendoMotivo(false); setMotivo('') }}
              className="px-3 py-1.5 rounded-[7px] border border-ltb font-sora text-[12px] text-lttm"
            >
              Cancelar
            </button>
            <button
              onClick={() => decidir('rejected')}
              disabled={pendiente || !motivo.trim()}
              className="px-3 py-1.5 rounded-[7px] bg-red-600 font-sora text-[12px] text-white disabled:opacity-50"
            >
              Confirmar rechazo
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="font-sora text-[12px] text-red-700 mt-2">{error}</p>
      )}
    </div>
  )
}

// ── Pantalla ────────────────────────────────────────────────────────────────

export function AprobacionesClient({ pendientes, historico }: {
  pendientes: ApprovalRequestRow[]
  historico:  ApprovalRequestRow[]
}) {
  const [pestana, setPestana] = useState<'mias' | 'historico'>('mias')

  const filas = pestana === 'mias' ? pendientes : historico

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1.5">
        {([
          ['mias', `Me toca decidir (${pendientes.length})`],
          ['historico', 'Histórico'],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setPestana(k)}
            className={`px-3 py-1.5 rounded-[7px] border font-sora text-[12.5px] transition-colors ${
              pestana === k
                ? 'border-cyan-border bg-cyan-dim2 text-cyan-700'
                : 'border-ltb bg-ltcard2 text-lttm hover:border-ltb2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filas.length === 0 ? (
        <div className="border border-ltb rounded-[12px] bg-ltcard px-5 py-8 text-center">
          <Clock size={20} className="text-lttm mx-auto mb-2" />
          <p className="font-sora text-[13px] text-ltt">
            {pestana === 'mias' ? 'No tienes nada pendiente de decidir.' : 'Todavía no hay solicitudes cerradas.'}
          </p>
          {pestana === 'mias' && (
            <p className="font-sora text-[12px] text-lttm mt-1">
              Aquí aparecerá lo que te corresponda por tu rol, por designación, por comité
              o por delegación.
            </p>
          )}
        </div>
      ) : (
        filas.map((row) => (
          <Tarjeta key={row.id} row={row} decidible={pestana === 'mias'} />
        ))
      )}
    </div>
  )
}
