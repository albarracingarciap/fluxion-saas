'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Plus, X, Loader2, AlertCircle, ChevronRight } from 'lucide-react';

import { reportIncident, type IncidentRow } from './actions';
import { DeadlineClock } from './deadline-clock';

const inputCls =
  'w-full px-3 py-2 rounded-[8px] border border-ltb bg-ltcard font-sora text-[13px] ' +
  'text-ltt outline-none focus:border-brand-cyan'

const STATUS_LABEL: Record<string, string> = {
  open: 'Abierto', investigating: 'En investigación',
  contained: 'Contenido', closed: 'Cerrado',
}

const STATUS_CLS: Record<string, string> = {
  open: 'text-re', investigating: 'text-or',
  contained: 'text-brand-cyan', closed: 'text-lttm',
}

// ── Dar parte ─────────────────────────────────────────────────────────────────

function ReportForm({ systems, onDone, onCancel }: {
  systems: Array<{ id: string; name: string }>
  onDone: () => void
  onCancel: () => void
}) {
  const [title, setTitle]       = useState('')
  const [description, setDesc]  = useState('')
  const [occurredAt, setOcc]    = useState('')
  const [systemIds, setSystems] = useState<string[]>([])
  const [error, setError]       = useState<string | null>(null)
  const [pending, start]        = useTransition()

  function toggle(id: string) {
    setSystems((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])
  }

  function submit() {
    setError(null)
    start(async () => {
      const res = await reportIncident({
        title,
        description,
        occurred_at: occurredAt ? new Date(occurredAt).toISOString() : null,
        system_ids: systemIds,
      })
      if ('error' in res) setError(res.error)
      else onDone()
    })
  }

  return (
    <div className="bg-ltbg border border-ltb rounded-[12px] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Dar parte de un incidente</p>
        <button onClick={onCancel} className="text-lttm hover:text-ltt"><X size={15} /></button>
      </div>

      <p className="font-sora text-[12.5px] text-lttm">
        Describe lo ocurrido. No hace falta que lo clasifiques ni que sepas si es
        un incidente grave — de eso se encarga después el equipo de gobierno.
        <strong className="text-ltt"> Lo importante es que quede registrado cuanto antes</strong>,
        porque el plazo del artículo 73 cuenta desde que la organización tiene conocimiento.
      </p>

      <div>
        <label className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
          Qué ha ocurrido <span className="text-re">*</span>
        </label>
        <input
          type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. El motor de scoring denegó crédito de forma sistemática durante 6 horas"
          className={inputCls + ' mt-1.5'}
        />
      </div>

      <div>
        <label className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Detalle</label>
        <textarea
          value={description} onChange={(e) => setDesc(e.target.value)} rows={4}
          placeholder="Cronología, alcance, personas afectadas, medidas inmediatas tomadas…"
          className={inputCls + ' mt-1.5 resize-y'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
            Cuándo ocurrió (si se sabe)
          </label>
          <input
            type="datetime-local" value={occurredAt} onChange={(e) => setOcc(e.target.value)}
            className={inputCls + ' mt-1.5'}
          />
        </div>
        <div>
          <label className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
            Sistemas afectados
          </label>
          <div className="mt-1.5 flex flex-col gap-1 max-h-[120px] overflow-y-auto">
            {systems.length === 0 && (
              <span className="font-sora text-[12px] text-lttm">No hay sistemas en el inventario.</span>
            )}
            {systems.map((s) => (
              <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={systemIds.includes(s.id)} onChange={() => toggle(s.id)}
                  className="accent-[var(--brand-cyan,#00a3c4)]"
                />
                <span className="font-sora text-[13px] text-ltt">{s.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-re text-[12px] font-sora flex items-center gap-1.5">
          <AlertCircle size={13} /> {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={submit} disabled={pending || !title.trim()}
          className="px-4 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] disabled:opacity-50 flex items-center gap-2"
        >
          {pending && <Loader2 size={13} className="animate-spin" />}
          Registrar incidente
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-[8px] border border-ltb font-sora text-[13px] text-lttm">
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── Listado ───────────────────────────────────────────────────────────────────

export function IncidentesClient({ incidents, systems }: {
  incidents: IncidentRow[]
  systems: Array<{ id: string; name: string }>
}) {
  const router = useRouter()
  const [reporting, setReporting] = useState(false)

  const unclassified = incidents.filter((i) => !i.is_serious && i.notification_status === 'pending')
  const withDeadline = incidents.filter(
    (i) => i.is_serious && ['pending', 'initial_sent'].includes(i.notification_status)
  )

  return (
    <div className="max-w-[1100px] w-full mx-auto flex flex-col gap-6 animate-fadein">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
            <ShieldAlert size={12} /> Cumplimiento · Incidentes
          </p>
          <h1 className="font-fraunces text-[26px] text-ltt mt-1">Incidentes de IA</h1>
          <p className="font-sora text-[13px] text-lttm mt-2 max-w-2xl">
            Registro de incidentes y control de los plazos de notificación del
            artículo 73 del AI Act. El reloj empieza cuando la organización tiene
            conocimiento del hecho, no cuando se establece la causa.
          </p>
        </div>
        {!reporting && (
          <button
            onClick={() => setReporting(true)}
            className="shrink-0 px-3.5 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] flex items-center gap-1.5"
          >
            <Plus size={14} /> Dar parte
          </button>
        )}
      </div>

      {(unclassified.length > 0 || withDeadline.length > 0) && (
        <div className="flex gap-3 flex-wrap">
          {unclassified.length > 0 && (
            <div className="px-4 py-2.5 rounded-[10px] border border-orb bg-[var(--or-dim,#fff4e5)]">
              <span className="font-sora text-[13px] text-or">
                <strong>{unclassified.length}</strong> sin clasificar
              </span>
            </div>
          )}
          {withDeadline.length > 0 && (
            <div className="px-4 py-2.5 rounded-[10px] border border-reb bg-red-dim">
              <span className="font-sora text-[13px] text-re">
                <strong>{withDeadline.length}</strong> con plazo de notificación vivo
              </span>
            </div>
          )}
        </div>
      )}

      {reporting && (
        <ReportForm
          systems={systems}
          onCancel={() => setReporting(false)}
          onDone={() => { setReporting(false); router.refresh() }}
        />
      )}

      {incidents.length === 0 && !reporting && (
        <div className="border border-dashed border-ltb rounded-[12px] p-10 text-center">
          <p className="font-sora text-[13px] text-lttm">
            No hay incidentes registrados. Ojalá siga así.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {incidents.map((incident) => (
          <Link
            key={incident.id} href={`/incidentes/${incident.id}`}
            className="border border-ltb rounded-[12px] p-4 bg-ltcard hover:border-[var(--cyan-border)] transition-colors flex items-start justify-between gap-4"
          >
            <div className="min-w-0 flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-plex text-[11px] text-lttm">{incident.reference}</span>
                <span className="font-sora text-[14.5px] text-ltt font-semibold">{incident.title}</span>
                <span className={`font-plex text-[10px] uppercase tracking-[0.4px] ${STATUS_CLS[incident.status]}`}>
                  {STATUS_LABEL[incident.status]}
                </span>
                {incident.is_serious && (
                  <span className="font-plex text-[10px] uppercase tracking-[0.4px] px-1.5 py-0.5 rounded-[4px] border border-reb text-re">
                    incidente grave
                  </span>
                )}
              </div>

              {incident.systems.length > 0 && (
                <p className="font-sora text-[12px] text-lttm">
                  {incident.systems.map((s) => s.name).join(' · ')}
                </p>
              )}

              <DeadlineClock incident={incident} />
            </div>

            <ChevronRight size={16} className="text-lttm shrink-0 mt-1" />
          </Link>
        ))}
      </div>
    </div>
  )
}
