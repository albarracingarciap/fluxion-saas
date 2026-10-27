'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ChevronRight, Landmark, Loader2, Plus, X } from 'lucide-react';

import {
  REQUEST_KIND_LABEL,
  REQUEST_STATUS_LABEL,
  requestDeadline,
  requestDeadlineLabel,
  type AuthorityRequestKind,
  type RequestDeadline,
} from '@/lib/governance/authority-requests';

import { createAuthorityRequest, type AuthorityRequestRow } from './actions';

const inputCls =
  'w-full px-3 py-2 rounded-[8px] border border-ltb bg-ltcard font-sora text-[13px] ' +
  'text-ltt outline-none focus:border-brand-cyan'
const label = 'font-plex text-[10px] uppercase tracking-[0.7px] text-lttm'

const hoy = () => new Date().toISOString().slice(0, 10);

export const DEADLINE_CLS: Record<RequestDeadline['state'], string> = {
  respondido: 'text-gr',
  sin_plazo: 'text-lttm',
  en_plazo: 'text-ltt2',
  proximo: 'text-or',
  vencido: 'text-re',
};

export const STATUS_CLS: Record<string, string> = {
  received: 'text-re', in_progress: 'text-or', answered: 'text-brand-cyan', closed: 'text-lttm',
};

// ── Registrar ─────────────────────────────────────────────────────────────────

function NuevoRequerimiento({ systems, members, incidents, onDone, onCancel }: {
  systems: Array<{ id: string; name: string }>
  members: Array<{ id: string; name: string }>
  incidents: Array<{ id: string; reference: string; title: string }>
  onDone: (id: string) => void
  onCancel: () => void
}) {
  const [authority, setAuthority] = useState('')
  const [authorityRef, setAuthorityRef] = useState('')
  const [kind, setKind] = useState<AuthorityRequestKind>('information')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [receivedAt, setReceivedAt] = useState(hoy())
  const [dueAt, setDueAt] = useState('')
  const [incidentId, setIncidentId] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [systemIds, setSystemIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function toggle(id: string) {
    setSystemIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])
  }

  function submit() {
    setError(null)
    start(async () => {
      const res = await createAuthorityRequest({
        authority, authorityReference: authorityRef, kind, title, description,
        receivedAt, dueAt: dueAt || null, incidentId: incidentId || null, ownerId: ownerId || null, systemIds,
      })
      if ('error' in res) setError(res.error)
      else onDone(res.id)
    })
  }

  return (
    <div className="bg-ltbg border border-ltb rounded-[12px] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className={label}>Registrar requerimiento</p>
        <button onClick={onCancel} className="text-lttm hover:text-ltt"><X size={15} /></button>
      </div>
      <p className="font-sora text-[12.5px] text-lttm">
        Al registrarlo se crea la tarea «Responder al requerimiento…» con el plazo indicado, asignada al responsable.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={label}>Autoridad <span className="text-re">*</span></label>
          <input value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder="Ej. AESIA" className={inputCls + ' mt-1.5'} />
        </div>
        <div>
          <label className={label}>Su referencia</label>
          <input value={authorityRef} onChange={(e) => setAuthorityRef(e.target.value)} placeholder="Nº de expediente" className={inputCls + ' mt-1.5'} />
        </div>
        <div>
          <label className={label}>Tipo</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as AuthorityRequestKind)} className={inputCls + ' mt-1.5'}>
            {(Object.keys(REQUEST_KIND_LABEL) as AuthorityRequestKind[]).map((k) => <option key={k} value={k}>{REQUEST_KIND_LABEL[k]}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Qué se pide <span className="text-re">*</span></label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Documentación técnica e instrucciones de uso del sistema de scoring" className={inputCls + ' mt-1.5'} />
      </div>
      <div>
        <label className={label}>Detalle</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls + ' mt-1.5 resize-y'}
          placeholder="Alcance de lo pedido, medidas exigidas, forma de respuesta…" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className={label}>Recibido <span className="text-re">*</span></label>
          <input type="date" value={receivedAt} max={hoy()} onChange={(e) => setReceivedAt(e.target.value)} className={inputCls + ' mt-1.5'} />
        </div>
        <div>
          <label className={label}>Plazo de respuesta</label>
          <input type="date" value={dueAt} min={receivedAt} onChange={(e) => setDueAt(e.target.value)} className={inputCls + ' mt-1.5'} />
        </div>
        <div>
          <label className={label}>Responsable</label>
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputCls + ' mt-1.5'}>
            <option value="">Sin asignar</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Incidente relacionado</label>
          <select value={incidentId} onChange={(e) => setIncidentId(e.target.value)} className={inputCls + ' mt-1.5'}>
            <option value="">Ninguno</option>
            {incidents.map((i) => <option key={i.id} value={i.id}>{i.reference} · {i.title}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Sistemas afectados</label>
        <div className="mt-1.5 flex flex-col gap-1 max-h-[120px] overflow-y-auto">
          {systems.length === 0 && <span className="font-sora text-[12px] text-lttm">No hay sistemas en el inventario.</span>}
          {systems.map((s) => (
            <label key={s.id} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={systemIds.includes(s.id)} onChange={() => toggle(s.id)} className="accent-[var(--brand-cyan,#00a3c4)]" />
              <span className="font-sora text-[13px] text-ltt">{s.name}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-re text-[12px] font-sora flex items-center gap-1.5"><AlertCircle size={13} /> {error}</p>}

      <div className="flex gap-2">
        <button onClick={submit} disabled={pending || !authority.trim() || !title.trim()}
          className="px-4 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] disabled:opacity-50 flex items-center gap-2">
          {pending && <Loader2 size={13} className="animate-spin" />} Registrar requerimiento
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-[8px] border border-ltb font-sora text-[13px] text-lttm">Cancelar</button>
      </div>
    </div>
  )
}

// ── Listado ───────────────────────────────────────────────────────────────────

/**
 * Requerimientos de la autoridad (B25d, AI Act, Art. 26.12; decisión 4).
 * Cualquier miembro los consulta; los registran los roles de gobierno.
 */
export function RequerimientosClient({ requests, systems, members, incidents, canGovern }: {
  requests: AuthorityRequestRow[]
  systems: Array<{ id: string; name: string }>
  members: Array<{ id: string; name: string }>
  incidents: Array<{ id: string; reference: string; title: string }>
  canGovern: boolean
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const today = hoy()
  const vencidos = requests.filter((r) => requestDeadline(r.status, r.due_at, today).state === 'vencido')

  return (
    <div className="max-w-[1100px] w-full mx-auto flex flex-col gap-6 animate-fadein">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
            <Landmark size={12} /> Cumplimiento · Requerimientos
          </p>
          <h1 className="font-fraunces text-[26px] text-ltt mt-1">Requerimientos de la autoridad</h1>
          <p className="font-sora text-[13px] text-lttm mt-2 max-w-2xl">
            Peticiones de información y medidas correctoras de una autoridad, con su plazo, la respuesta y sus evidencias
            (AI Act, Art. 26.12). No son incidentes: su plazo no es el del artículo 73.
          </p>
        </div>
        {canGovern && !creating && (
          <button onClick={() => setCreating(true)}
            className="shrink-0 px-3.5 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] flex items-center gap-1.5">
            <Plus size={14} /> Registrar requerimiento
          </button>
        )}
      </div>

      {vencidos.length > 0 && (
        <div className="px-4 py-2.5 rounded-[10px] border border-reb bg-red-dim self-start">
          <span className="font-sora text-[13px] text-re"><strong>{vencidos.length}</strong> con el plazo vencido</span>
        </div>
      )}

      {creating && (
        <NuevoRequerimiento
          systems={systems} members={members} incidents={incidents}
          onCancel={() => setCreating(false)}
          onDone={(id) => { setCreating(false); router.push(`/incidentes/requerimientos/${id}`) }}
        />
      )}

      {requests.length === 0 && !creating && (
        <div className="border border-dashed border-ltb rounded-[12px] p-10 text-center">
          <p className="font-sora text-[13px] text-lttm">No hay requerimientos registrados.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {requests.map((r) => {
          const plazo = requestDeadline(r.status, r.due_at, today)
          return (
            <Link key={r.id} href={`/incidentes/requerimientos/${r.id}`}
              className="border border-ltb rounded-[12px] p-4 bg-ltcard hover:border-[var(--cyan-border)] transition-colors flex items-start justify-between gap-4">
              <div className="min-w-0 flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-plex text-[11px] text-lttm">{r.reference}</span>
                  <span className="font-sora text-[14.5px] text-ltt font-semibold">{r.title}</span>
                  <span className={`font-plex text-[10px] uppercase tracking-[0.4px] ${STATUS_CLS[r.status]}`}>{REQUEST_STATUS_LABEL[r.status]}</span>
                </div>
                <p className="font-sora text-[12px] text-lttm">
                  {r.authority} · {REQUEST_KIND_LABEL[r.kind]} · recibido el {new Date(r.received_at).toLocaleDateString('es-ES')}
                  {r.systems.length > 0 && <> · {r.systems.map((s) => s.name).join(' · ')}</>}
                </p>
                <span className={`font-sora text-[12.5px] ${DEADLINE_CLS[plazo.state]}`}>
                  {requestDeadlineLabel(plazo)}
                  {r.due_at && plazo.state !== 'respondido' && <span className="text-lttm"> · vence el {new Date(r.due_at).toLocaleDateString('es-ES')}</span>}
                </span>
              </div>
              <ChevronRight size={16} className="text-lttm shrink-0 mt-1" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
