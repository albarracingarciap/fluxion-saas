'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, FileCheck2, Landmark, ListChecks, Loader2, Plus } from 'lucide-react';

import {
  REQUEST_KIND_LABEL,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_ORDER,
  requestDeadline,
  requestDeadlineLabel,
  type AuthorityRequestStatus,
} from '@/lib/governance/authority-requests';
import { TASK_STATUS_LABELS, type TaskStatus } from '@/lib/tasks/types';

import { addRequestTask, updateAuthorityRequest, type AuthorityRequestRow } from '../actions';
import { DEADLINE_CLS, STATUS_CLS } from '../requerimientos-client';

const inputCls =
  'w-full px-3 py-2 rounded-[8px] border border-ltb bg-ltcard font-sora text-[13px] ' +
  'text-ltt outline-none focus:border-brand-cyan disabled:opacity-60'
const label = 'font-plex text-[10px] uppercase tracking-[0.7px] text-lttm'

const hoy = () => new Date().toISOString().slice(0, 10);
const fecha = (d: string) => new Date(d).toLocaleDateString('es-ES');

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="border border-ltb rounded-[12px] p-5 bg-ltcard flex flex-col gap-4">
      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">{icon} {title}</p>
      {children}
    </section>
  )
}

/** Detalle de un requerimiento de la autoridad (B25d). */
export function RequerimientoDetalle({ request, members, tasks, evidences, canGovern }: {
  request: AuthorityRequestRow
  members: Array<{ id: string; name: string }>
  tasks: Array<{ id: string; title: string; status: string; due_date: string | null }>
  evidences: Array<{ id: string; title: string; status: string }>
  canGovern: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [status, setStatus] = useState<AuthorityRequestStatus>(request.status)
  const [dueAt, setDueAt] = useState(request.due_at ?? '')
  const [ownerId, setOwnerId] = useState(request.owner_id ?? '')
  const [response, setResponse] = useState(request.response ?? '')
  const [respondedAt, setRespondedAt] = useState(request.responded_at ?? '')
  const [evidenceIds, setEvidenceIds] = useState<string[]>(request.evidences.map((e) => e.id))
  const [filtro, setFiltro] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')

  const plazo = requestDeadline(request.status, request.due_at, hoy())
  const visibles = evidences.filter((e) => evidenceIds.includes(e.id) || e.title.toLowerCase().includes(filtro.trim().toLowerCase()))

  function run(fn: () => Promise<{ success?: true; error?: string }>, okText: string) {
    setMsg(null)
    start(async () => {
      const res = await fn()
      if (res.error) setMsg({ ok: false, text: res.error })
      else { setMsg({ ok: true, text: okText }); router.refresh() }
    })
  }

  return (
    <div className="max-w-[1000px] w-full mx-auto flex flex-col gap-6 animate-fadein">
      <div>
        <Link href="/incidentes?tab=requerimientos" className="font-sora text-[12.5px] text-lttm hover:text-ltt flex items-center gap-1.5">
          <ArrowLeft size={13} /> Requerimientos
        </Link>
        <div className="flex items-center gap-2.5 mt-2 flex-wrap">
          <span className="font-plex text-[12px] text-lttm">{request.reference}</span>
          <h1 className="font-fraunces text-[24px] text-ltt">{request.title}</h1>
          <span className={`font-plex text-[10px] uppercase tracking-[0.4px] ${STATUS_CLS[request.status]}`}>{REQUEST_STATUS_LABEL[request.status]}</span>
        </div>
        <p className="font-sora text-[13px] text-lttm mt-2">
          {request.authority}{request.authority_reference && <> · Ref. {request.authority_reference}</>} · {REQUEST_KIND_LABEL[request.kind]} ·
          recibido el {fecha(request.received_at)}
        </p>
        {request.description && <p className="font-sora text-[13px] text-lttm mt-2 whitespace-pre-line">{request.description}</p>}
        {request.systems.length > 0 && (
          <p className="font-sora text-[12.5px] text-lttm mt-2">
            Sistemas afectados:{' '}
            {request.systems.map((s, i) => (
              <span key={s.id}>{i > 0 && ' · '}<Link href={`/inventario/${s.id}`} className="text-brand-cyan hover:underline">{s.name}</Link></span>
            ))}
          </p>
        )}
        {request.incident && (
          <p className="font-sora text-[12.5px] text-lttm mt-1">
            Incidente relacionado:{' '}
            <Link href={`/incidentes/${request.incident.id}`} className="text-brand-cyan hover:underline">{request.incident.reference} · {request.incident.title}</Link>
          </p>
        )}
      </div>

      <div className="border border-ltb rounded-[12px] p-5 bg-ltbg">
        <span className={`font-sora text-[14px] ${DEADLINE_CLS[plazo.state]}`}>
          {requestDeadlineLabel(plazo)}
          {request.due_at && plazo.state !== 'respondido' && <span className="text-lttm"> · vence el {fecha(request.due_at)}</span>}
          {request.responded_at && plazo.state === 'respondido' && <span className="text-lttm"> el {fecha(request.responded_at)}</span>}
        </span>
      </div>

      {msg && (
        <p className={`font-sora text-[12.5px] flex items-center gap-1.5 ${msg.ok ? 'text-gr' : 'text-re'}`}>
          {msg.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />} {msg.text}
        </p>
      )}
      {!canGovern && (
        <p className="font-sora text-[12.5px] text-lttm border border-ltb rounded-[10px] p-3">
          Puedes consultar el requerimiento, pero gestionarlo corresponde a los roles de gobierno.
        </p>
      )}

      <Section icon={<Landmark size={12} />} title="Gestión y respuesta">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={label}>Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as AuthorityRequestStatus)} disabled={!canGovern} className={inputCls + ' mt-1.5'}>
              {REQUEST_STATUS_ORDER.map((s) => <option key={s} value={s}>{REQUEST_STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Plazo de respuesta</label>
            <input type="date" value={dueAt} min={request.received_at} onChange={(e) => setDueAt(e.target.value)} disabled={!canGovern} className={inputCls + ' mt-1.5'} />
          </div>
          <div>
            <label className={label}>Responsable</label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={!canGovern} className={inputCls + ' mt-1.5'}>
              <option value="">Sin asignar</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={label}>Respuesta</label>
          <textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={4} disabled={!canGovern}
            placeholder="Qué se respondió o qué medidas se adoptaron" className={inputCls + ' mt-1.5 resize-y'} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={label}>Fecha de la respuesta</label>
            <input type="date" value={respondedAt} min={request.received_at} max={hoy()} onChange={(e) => setRespondedAt(e.target.value)} disabled={!canGovern} className={inputCls + ' mt-1.5'} />
            <p className="font-sora text-[11px] text-lttm mt-1">Obligatoria para pasar a Respondido o Cerrado.</p>
          </div>
        </div>

        <div>
          <label className={label + ' flex items-center gap-1.5'}><FileCheck2 size={11} /> Evidencias de la respuesta</label>
          {canGovern && (
            <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar evidencia…" className={inputCls + ' mt-1.5'} />
          )}
          <div className="mt-1.5 flex flex-col gap-1 max-h-[160px] overflow-y-auto">
            {visibles.length === 0 && <span className="font-sora text-[12px] text-lttm">Sin evidencias.</span>}
            {visibles.map((e) => (
              <label key={e.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" disabled={!canGovern} checked={evidenceIds.includes(e.id)}
                  onChange={() => setEvidenceIds((p) => p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id])}
                  className="accent-[var(--brand-cyan,#00a3c4)]" />
                <span className="font-sora text-[13px] text-ltt">{e.title}</span>
                {e.status !== 'valid' && <span className="font-plex text-[10px] text-lttm">no validada</span>}
              </label>
            ))}
          </div>
        </div>

        {canGovern && (
          <div>
            <button
              onClick={() => run(() => updateAuthorityRequest(request.id, {
                status, dueAt: dueAt || null, ownerId: ownerId || null, response, respondedAt: respondedAt || null, evidenceIds,
              }), 'Requerimiento actualizado.')}
              disabled={pending}
              className="px-4 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] disabled:opacity-50 flex items-center gap-2">
              {pending && <Loader2 size={13} className="animate-spin" />} Guardar
            </button>
          </div>
        )}
      </Section>

      <Section icon={<ListChecks size={12} />} title={`Tareas (${tasks.length})`}>
        {tasks.length === 0 && (
          <p className="font-sora text-[12.5px] text-lttm">Sin tareas. Aparecen en el tablero de Ejecución con el origen «Requerimiento de la autoridad».</p>
        )}
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center gap-3 py-1.5 border-b border-ltb last:border-0">
            <span className={`font-plex text-[10px] uppercase tracking-[0.4px] w-24 shrink-0 ${t.status === 'done' ? 'text-gr' : 'text-lttm'}`}>
              {TASK_STATUS_LABELS[t.status as TaskStatus] ?? t.status}
            </span>
            <Link href={`/tareas?task=${t.id}`} className="font-sora text-[13px] text-ltt hover:underline">{t.title}</Link>
            {t.due_date && <span className="font-plex text-[11px] text-lttm ml-auto">{fecha(t.due_date)}</span>}
          </div>
        ))}
        {canGovern && (
          <div className="flex gap-2">
            <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Nueva tarea" className={inputCls} />
            <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className={inputCls + ' max-w-[160px]'} />
            <button
              onClick={() => run(async () => {
                const res = await addRequestTask(request.id, { title: taskTitle, dueDate: taskDue || null })
                if (!res.error) { setTaskTitle(''); setTaskDue('') }
                return res
              }, 'Tarea creada.')}
              disabled={pending || !taskTitle.trim()}
              className="px-4 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap">
              <Plus size={13} /> Añadir
            </button>
          </div>
        )}
      </Section>
    </div>
  )
}
