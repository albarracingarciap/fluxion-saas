'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Loader2, Sparkles } from 'lucide-react'

import { SGAI_STATUS_LABEL, type SgaiStatus } from '@/lib/iso/management-system'

import { acceptSgaiProposal, saveSgaiObligation, type SgaiObligationView, type SgaiView } from './actions'

const inputCls =
  'w-full px-3 py-2 rounded-[8px] border border-ltb bg-ltcard font-sora text-[13px] text-ltt outline-none focus:border-brand-cyan disabled:opacity-60'
const label = 'font-plex text-[10px] uppercase tracking-[0.7px] text-lttm'

const STATUS_CLS: Record<SgaiStatus, string> = {
  pending: 'bg-ltbg border-ltb text-lttm',
  in_progress: 'bg-ordim border-orb text-or',
  resolved: 'bg-grdim border-grb text-gr',
}

/**
 * Sistema de gestión ISO/IEC 42001 (B20a, DP-09): las cláusulas del catálogo
 * a nivel de organización.
 */
export function SgaiClient({ view }: { view: SgaiView }) {
  const [abierta, setAbierta] = useState<string | null>(null)
  const resueltas = view.obligations.filter((o) => o.status === 'resolved').length
  const f = view.facts

  return (
    <div className="max-w-[1100px] w-full mx-auto flex flex-col gap-6 animate-fadein pb-16">
      <div>
        <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
          <ClipboardList size={12} /> ISO 42001 · Sistema de gestión
        </p>
        <h1 className="font-fraunces text-[26px] text-ltt mt-1">Sistema de gestión de la IA</h1>
        <p className="font-sora text-[13px] text-lttm mt-2 max-w-3xl">
          Las cláusulas de ISO/IEC 42001 que se cumplen a nivel de organización: objetivos, competencia, auditoría interna,
          revisión por la dirección, no conformidades… Los controles del Anexo A están en la{' '}
          <Link href="/plantillas/soa-iso42001" className="text-brand-cyan hover:underline">Declaración de Aplicabilidad</Link>.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ['Cláusulas resueltas', `${resueltas} de ${view.obligations.length}`],
          ['Sistemas en el alcance', String(f.inScopeSystems)],
          ['Evaluación de riesgos aprobada', `${f.riskEvaluationApproved} de ${f.inScopeSystems}`],
          ['AISIA aprobada', `${f.aisiaApproved} de ${f.inScopeSystems}`],
          ['Alfabetización en IA', `${f.literacyMembers} de ${f.activeMembers}`],
        ].map(([k, v]) => (
          <div key={k} className="border border-ltb rounded-[10px] bg-ltcard px-4 py-3">
            <div className={label}>{k}</div>
            <div className="font-sora text-[17px] text-ltt font-semibold mt-1">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {view.obligations.map((o) => (
          <Clausula key={o.id} o={o} view={view} abierta={abierta === o.id} onToggle={() => setAbierta(abierta === o.id ? null : o.id)} />
        ))}
      </div>
    </div>
  )
}

function Clausula({ o, view, abierta, onToggle }: { o: SgaiObligationView; view: SgaiView; abierta: boolean; onToggle: () => void }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<SgaiStatus>(o.status)
  const [owner, setOwner] = useState(o.ownerUserId ?? '')
  const [dueDate, setDueDate] = useState(o.dueDate ?? '')
  const [notes, setNotes] = useState(o.notes)
  const [resolution, setResolution] = useState(o.resolutionNotes)
  const [evidenceIds, setEvidenceIds] = useState<string[]>(o.evidences.map((e) => e.id))
  const [filtro, setFiltro] = useState('')
  const visibles = view.evidences.filter((e) => evidenceIds.includes(e.id) || (filtro.trim() && e.title.toLowerCase().includes(filtro.trim().toLowerCase())))

  function run(fn: () => Promise<{ ok: true } | { error: string }>) {
    setError(null)
    start(async () => {
      const res = await fn()
      if ('error' in res) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="border border-ltb rounded-[12px] bg-ltcard">
      <button type="button" onClick={onToggle} className="w-full px-5 py-4 flex items-start justify-between gap-4 text-left">
        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-plex text-[11px] text-lttm">{o.clause}</span>
            <span className="font-sora text-[14px] text-ltt font-semibold">{o.title}</span>
            <span className={`px-2 py-0.5 rounded-[5px] border font-sora text-[11px] font-semibold ${STATUS_CLS[o.status]}`}>{o.statusLabel}</span>
          </div>
          <p className="font-sora text-[12px] text-lttm">{o.description}</p>
          <p className="font-sora text-[11.5px] text-lttm">
            {o.ownerName ? `Responsable: ${o.ownerName}` : 'Sin responsable'} · {o.evidences.length} {o.evidences.length === 1 ? 'evidencia' : 'evidencias'}
            {o.dueDate && <> · fecha límite {new Date(o.dueDate).toLocaleDateString('es-ES')}</>}
          </p>
          {o.proposal && (
            <p className="font-sora text-[12px] text-brand-cyan flex items-start gap-1.5"><Sparkles size={13} className="shrink-0 mt-0.5" /> Propuesta: Resuelta. {o.proposal.reason}</p>
          )}
        </div>
        {abierta ? <ChevronDown size={16} className="text-lttm shrink-0 mt-1" /> : <ChevronRight size={16} className="text-lttm shrink-0 mt-1" />}
      </button>

      {abierta && (
        <div className="px-5 pb-5 pt-1 border-t border-ltb flex flex-col gap-4">
          {o.proposal && view.canEdit && (
            <div>
              <button type="button" onClick={() => run(() => acceptSgaiProposal(o.id))} disabled={pending}
                className="px-3.5 py-1.5 rounded-[8px] bg-cyan-dim border border-cyan-border text-brand-cyan font-sora text-[12.5px] inline-flex items-center gap-1.5">
                {pending && <Loader2 size={13} className="animate-spin" />} Aceptar propuesta
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={label}>Estado</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as SgaiStatus)} disabled={!view.canEdit} className={inputCls + ' mt-1.5'}>
                {(Object.keys(SGAI_STATUS_LABEL) as SgaiStatus[]).map((s) => <option key={s} value={s}>{SGAI_STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Responsable</label>
              <select value={owner} onChange={(e) => setOwner(e.target.value)} disabled={!view.canEdit} className={inputCls + ' mt-1.5'}>
                <option value="">Sin responsable</option>
                {view.members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Fecha límite</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!view.canEdit} className={inputCls + ' mt-1.5'} />
            </div>
          </div>
          <div>
            <label className={label}>Notas de trabajo</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} disabled={!view.canEdit} className={inputCls + ' mt-1.5 resize-y'} />
          </div>
          <div>
            <label className={label}>Cómo se cumple</label>
            <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} disabled={!view.canEdit}
              placeholder="Obligatorio para marcarla como resuelta" className={inputCls + ' mt-1.5 resize-y'} />
          </div>
          <div>
            <label className={label}>Evidencias</label>
            {o.mandatoryTypes.length > 0 && (
              <p className="font-sora text-[11.5px] text-lttm mt-1">Tipos que pide el catálogo: {o.mandatoryTypes.join(', ')}.</p>
            )}
            {view.canEdit && (
              <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar evidencia para vincular…" className={inputCls + ' mt-1.5'} />
            )}
            <div className="mt-1.5 flex flex-col gap-1 max-h-[160px] overflow-y-auto">
              {visibles.length === 0 && <span className="font-sora text-[12px] text-lttm">Sin evidencias vinculadas.</span>}
              {visibles.map((e) => (
                <label key={e.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" disabled={!view.canEdit} checked={evidenceIds.includes(e.id)}
                    onChange={() => setEvidenceIds((p) => p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id])}
                    className="accent-[var(--brand-cyan,#00a3c4)]" />
                  <span className="font-sora text-[13px] text-ltt">{e.title}</span>
                  {e.status === 'valid' ? <CheckCircle2 size={12} className="text-gr" /> : <span className="font-plex text-[10px] text-lttm">no validada</span>}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="font-sora text-[12px] text-re flex items-center gap-1.5"><AlertCircle size={13} /> {error}</p>}
          {view.canEdit && (
            <div>
              <button type="button" disabled={pending}
                onClick={() => run(() => saveSgaiObligation({ id: o.id, status, ownerUserId: owner || null, dueDate: dueDate || null, notes, resolutionNotes: resolution, evidenceIds }))}
                className="px-4 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] disabled:opacity-50 inline-flex items-center gap-2">
                {pending && <Loader2 size={13} className="animate-spin" />} Guardar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
